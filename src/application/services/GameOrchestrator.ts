// Application service for orchestrating game operations
import {GameState, LastAction} from '@/domain/models/GameState';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
import {Queen} from '@/domain/models/Card';
import {Command} from '../ports/Command';
import {EventPublisher} from '../ports/EventPublisher';
import {PlayKingCommand} from '../commands/PlayKingCommand';
import {PlayKnightCommand} from '../commands/PlayKnightCommand';
import {PlayJesterCommand} from '../commands/PlayJesterCommand';
import {PlayPotionCommand} from '../commands/PlayPotionCommand';
import {PlayDiscardCommand} from '../commands/PlayDiscardCommand';
import {TurnManager} from '@/domain/services/TurnManager';
import {WinConditions} from '@/domain/rules/WinConditions';
import {debugLogger as testDebugLogger} from '@/infrastructure/logging/DebugLogger';
import {validateMathEquation} from '@/lib/utils/mathValidator';
import {CardShuffler} from '@/infrastructure/random/CardShuffler';

export class GameOrchestrator {
  constructor(
    private readonly eventPublisher: EventPublisher
  ) {}

  processMove(move: GameMove, state: GameState): MoveValidationResult & { newState?: GameState } {
    try {
      // Handle system messages - they just update lastAction
      if ((move as any).type === 'system_message') {
        const newState = {
          ...state,
          lastAction: (move as any).lastAction || {
            playerId: 'system',
            playerName: 'Game',
            message: 'System event',
            timestamp: Date.now()
          },
          updatedAt: Date.now()
        };
        return { isValid: true, newState };
      }

      const command = this.createCommand(move, state);

      if (!command.canExecute()) {
        const validation = command.validate();
        // Log validation failure for test harness
        if (validation.error?.includes('Turn validation failed')) {
          testDebugLogger.logValidation(`Turn validation failed: ${validation.error}`);
        }
        return { isValid: false, error: validation.error };
      }

      let newState = command.execute();

      // Ensure all players have exactly 5 cards (game rule compliance)
      newState = this.ensureHandSizes(newState);

      // Publish domain event about successful move
      this.eventPublisher.publish({
        type: 'MOVE_EXECUTED',
        occurredAt: new Date(),
        aggregateId: newState.id
      });

      // Generate message for jester reveals and Rose Queen bonus
      let message: string | undefined;
      let keepTurn = false;

      // Check for Rose Queen bonus
      if (move.type === 'play_king' && newState.roseQueenBonus?.pending) {
        keepTurn = false; // Turn should advance, but player can still act due to bonus
        message = 'You woke the Rose Queen! Select another sleeping queen to wake!';
      }

      // Rose Queen bonus move should NOT keep the turn - turn advances after selection
      if (move.type === 'rose_queen_bonus') {
        keepTurn = false;
      }

      if (move.type === 'play_jester') {
        if (newState.jesterReveal?.revealedCard?.type === 'number') {
          const numberCard = newState.jesterReveal.revealedCard as { id: string; type: 'number'; value: number };
          const value = numberCard.value || 1;
          const targetPlayerId = newState.jesterReveal?.targetPlayer;
          const targetPlayer = targetPlayerId ? newState.players.find(p => p.id === targetPlayerId) : undefined;
          message = `Revealed ${value}! ${targetPlayer?.name || 'Player'} gets to wake a queen!`;
        } else if (newState.jesterReveal?.powerCardRevealed) {
          // Power card was revealed - player keeps turn
          keepTurn = true;
          const cardName = newState.jesterReveal.revealedCard.name || newState.jesterReveal.revealedCard.type;
          message = `Revealed ${cardName}! Player keeps it and plays again!`;
          // Clear jester reveal since it's only needed for the message
          newState = { ...newState, jesterReveal: undefined };
        } else if (!newState.jesterReveal && !state.jesterReveal) {
          // Fallback for other power card cases
          keepTurn = true;
          message = 'Revealed a power card! You get another turn!';
        }
      }

      // Advance turn if not a special action and not keeping turn
      // Check if this was a jester queen selection that should advance turn
      const wasJesterQueenSelection = move.type === 'play_jester' &&
                                     (move.targetCard || move.targetQueenId) &&
                                     state.jesterReveal?.waitingForQueenSelection;

      // Defense moves (dragon/wand) handle their own turn advancement
      const isDefenseMove = move.type === 'play_dragon' || move.type === 'play_wand';

      const isSpecial = this.isSpecialAction(move, newState);
      if (!isDefenseMove && !isSpecial && !keepTurn || wasJesterQueenSelection) {
        newState = TurnManager.advanceTurn(newState);
      }

      // Check win conditions - but NOT if there's a pending defense phase
      // Win conditions should only be checked after attacks are fully resolved
      const hasPendingDefense = newState.pendingKnightAttack || newState.pendingPotionAttack;
      if (!hasPendingDefense) {
        const winResult = WinConditions.checkWinCondition(newState);
        if (winResult.hasWinner && winResult.winnerId) {
          newState = {
            ...newState,
            phase: 'ended',
            winner: winResult.winnerId
          };
        }
      }

      return { isValid: true, message, newState };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createCommand(move: GameMove, state: GameState): Command<GameState> {
    switch (move.type) {
      case 'play_king':
        return new PlayKingCommand(state, move);
      case 'play_knight':
        return new PlayKnightCommand(state, move);
      case 'play_jester':
        return new PlayJesterCommand(state, move);
      case 'play_potion':
        return new PlayPotionCommand(state, move);
      case 'discard':
        return new PlayDiscardCommand(state, move);
      case 'play_dragon':
      case 'play_wand':
        // Create defense commands
        return this.createDefenseCommand(state, move);
      case 'play_math':
      case 'play_equation':
        // Create math command
        return this.createMathCommand(state, move);
      case 'stage_cards':
        // Create staging command
        return this.createStagingCommand(state, move);
      case 'clear_staged':
        // Create clear staged command
        return this.createClearStagedCommand(state, move);
      case 'allow_knight_attack':
        // Create command to complete knight attack
        return this.createAllowKnightCommand(state, move);
      case 'allow_potion_attack':
        // Create command to complete potion attack
        return this.createAllowPotionCommand(state, move);
      case 'rose_queen_bonus':
        // Create command to handle Rose Queen bonus
        return this.createRoseQueenBonusCommand(state, move);
      default:
        throw new Error(`Unsupported move type: ${move.type}`);
    }
  }

  private createDefenseCommand(state: GameState, move: GameMove): Command<GameState> {
    // For now, create a simple inline command for defense
    return {
      validate: () => {
        if (move.type === 'play_dragon') {
          if (!state.pendingKnightAttack) {
            return { isValid: false, error: 'No knight attack to defend against' };
          }
          if (state.pendingKnightAttack.target !== move.playerId) {
            return { isValid: false, error: 'You can only defend against attacks targeting you' };
          }
          const player = state.players.find(p => p.id === move.playerId);
          if (!player?.hand.some(c => c.type === 'dragon')) {
            return { isValid: false, error: 'You don\'t have a Dragon card' };
          }
        }
        if (move.type === 'play_wand') {
          if (!state.pendingPotionAttack) {
            return { isValid: false, error: 'No potion attack to defend against' };
          }
          if (state.pendingPotionAttack.target !== move.playerId) {
            return { isValid: false, error: 'You can only defend against attacks targeting you' };
          }
          const player = state.players.find(p => p.id === move.playerId);
          if (!player?.hand.some(c => c.type === 'wand')) {
            return { isValid: false, error: 'You don\'t have a Wand card' };
          }
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        let newState = { ...state };

        if (move.type === 'play_dragon') {
          // Find and discard the Dragon card
          const playerIndex = state.players.findIndex(p => p.id === move.playerId);
          const player = state.players[playerIndex];
          const dragonCard = player.hand.find(c => c.type === 'dragon');

          if (dragonCard) {
            const newHand = player.hand.filter(c => c.id !== dragonCard.id);
            const newDiscardPile = [...state.discardPile, dragonCard];

            // Draw replacement card if hand is below 5
            const newDeck = [...state.deck];
            if (newHand.length < 5 && newDeck.length > 0) {
              const card = newDeck.pop();
              if (card) newHand.push(card);
            }

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = { ...player, hand: newHand };

            // Get attacker info for the message
            const attack = state.pendingKnightAttack;
            const attacker = attack ? state.players.find(p => p.id === attack.attacker) : null;
            const targetQueen = attack?.targetQueen;

            newState = {
              ...newState,
              players: newPlayers,
              deck: newDeck,
              discardPile: newDiscardPile,
              pendingKnightAttack: undefined,
              lastAction: {
                playerId: move.playerId,
                playerName: player.name,
                actionType: 'play_dragon',
                cards: [dragonCard],
                message: `${player.name} played a Dragon to block ${attacker?.name || 'attacker'}'s Knight attack on ${targetQueen?.name || 'queen'}!`,
                timestamp: Date.now()
              }
            };
          }
        } else if (move.type === 'play_wand') {
          // Find and discard the Wand card
          const playerIndex = state.players.findIndex(p => p.id === move.playerId);
          const player = state.players[playerIndex];
          const wandCard = player.hand.find(c => c.type === 'wand');

          if (wandCard) {
            const newHand = player.hand.filter(c => c.id !== wandCard.id);
            const newDiscardPile = [...state.discardPile, wandCard];

            // Draw replacement card if hand is below 5
            const newDeck = [...state.deck];
            if (newHand.length < 5 && newDeck.length > 0) {
              const card = newDeck.pop();
              if (card) newHand.push(card);
            }

            const newPlayers = [...state.players];
            newPlayers[playerIndex] = { ...player, hand: newHand };

            // Get attacker info for the message
            const attack = state.pendingPotionAttack;
            const attacker = attack ? state.players.find(p => p.id === attack.attacker) : null;
            const targetQueen = attack?.targetQueen;

            newState = {
              ...newState,
              players: newPlayers,
              deck: newDeck,
              discardPile: newDiscardPile,
              pendingPotionAttack: undefined,
              lastAction: {
                playerId: move.playerId,
                playerName: player.name,
                actionType: 'play_wand',
                cards: [wandCard],
                message: `${player.name} played a Magic Wand to block ${attacker?.name || 'attacker'}'s Sleeping Potion on ${targetQueen?.name || 'queen'}!`,
                timestamp: Date.now()
              }
            };
          }
        }

        // Create a new state object with updated timestamp and version
        const stateWithMetadata = {
          ...newState,
          updatedAt: Date.now(),
          version: state.version + 1
        };

        // After a successful defense, advance turn normally
        // The defender gets their regular turn if they're next
        return TurnManager.advanceTurn(stateWithMetadata);
      }
    };
  }

  private createMathCommand(state: GameState, move: GameMove): Command<GameState> {
    // For now, create a simple inline command for math
    return {
      validate: () => {
        const player = state.players.find(p => p.id === move.playerId);
        if (!player) return { isValid: false, error: 'Player not found' };
        if (!TurnManager.canPlayerAct(state, move.playerId)) {
          return { isValid: false, error: 'Not your turn' };
        }

        // Validate the math equation
        const cards = move.cards || [];
        if (cards.length < 3) {
          return { isValid: false, error: 'Math equations require at least 3 cards' };
        }

        // Check all cards are number cards
        if (!cards.every(c => c.type === 'number')) {
          return { isValid: false, error: 'Math equations can only use number cards' };
        }

        // Validate the equation
        const values = cards.map((c) => (c as { value?: number }).value || 0);
        const mathResult = validateMathEquation(values);
        if (!mathResult.isValid) {
          return { isValid: false, error: 'Invalid equation - cards don\'t form a valid math equation' };
        }

        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const playerIndex = state.players.findIndex(p => p.id === move.playerId);
        const player = state.players[playerIndex];
        const cards = move.cards || [];

        // Create new hand without the played cards
        const newHand = player.hand.filter(c => !cards.some(card => card.id === c.id));
        let newDiscardPile = [...state.discardPile, ...cards];
        let newDeck = [...state.deck];

        // Draw replacement cards to maintain original hand size
        const originalHandSize = player.hand.length;
        const cardsToReplace = Math.min(cards.length, originalHandSize - newHand.length);

        for (let i = 0; i < cardsToReplace; i++) {
          if (newDeck.length === 0 && newDiscardPile.length > 0) {
            // Reshuffle discard pile into deck
            newDeck = [...CardShuffler.shuffle([...newDiscardPile])];
            newDiscardPile = [];
          }
          if (newDeck.length > 0) {
            const card = newDeck.pop();
            if (card) newHand.push(card);
          } else {
            break; // No more cards available
          }
        }

        // Wake a queen if equation is valid
        const newSleepingQueens = [...state.sleepingQueens];
        const newQueens = [...player.queens];

        if (newSleepingQueens.length > 0) {
          const targetQueenId = move.targetQueenId || move.targetCard?.id;
          const queenIndex = newSleepingQueens.findIndex(q => q.id === targetQueenId);

          if (queenIndex !== -1) {
            const [queen] = newSleepingQueens.splice(queenIndex, 1);
            newQueens.push({ ...queen, isAwake: true });
          }
        }

        // Create new players array with updated player
        const newPlayers = [...state.players];
        newPlayers[playerIndex] = {
          ...player,
          hand: newHand,
          queens: newQueens,
          score: newQueens.reduce((sum, q) => sum + q.points, 0)
        };

        // Build equation string for message using the validator
        const values = cards.map((c) => (c as { value?: number }).value || 0);
        const mathResult = validateMathEquation(values);
        const equationStr = mathResult.isValid && mathResult.equation ?
          mathResult.equation :
          values.join(' ');
        const queenAwakened = newQueens.length > player.queens.length;

        // Get the queen that was awakened if any
        let queenMessage: string;
        if (queenAwakened && newQueens.length > 0) {
          const awakenedQueen = newQueens[newQueens.length - 1];
          queenMessage = ` and woke ${awakenedQueen.name} (${awakenedQueen.points} points)!`;
        } else {
          queenMessage = ` and drew ${cards.length} cards`;
        }

        // Create new state (don't advance turn - orchestrator handles that)
        const lastAction: LastAction = {
          playerId: move.playerId,
          playerName: player.name,
          actionType: 'play_math',
          cards: cards,
          drawnCount: cards.length,
          message: `${player.name} played equation ${equationStr}${queenMessage}`,
          timestamp: Date.now()
        };

        return {
          ...state,
          players: newPlayers,
          deck: newDeck,
          discardPile: newDiscardPile,
          sleepingQueens: newSleepingQueens,
          lastAction,
          updatedAt: Date.now()
        };
      }
    };
  }

  private createStagingCommand(state: GameState, move: GameMove): Command<GameState> {
    // For now, create a simple inline command for staging
    return {
      validate: () => {
        const player = state.players.find(p => p.id === move.playerId);
        if (!player) return { isValid: false, error: 'Player not found' };
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const player = state.players.find(p => p.id === move.playerId);
        const cards = move.cards || [];
        const currentStagedCards = state.stagedCards || {};

        // Determine action message based on card type
        let message = '';
        if (cards.length > 0) {
          const cardType = cards[0].type;
          const cardName = cards[0].name || cardType;
          if (cardType === 'king') {
            message = `${player?.name} played ${cardName} - selecting a sleeping queen to wake...`;
          } else if (cardType === 'knight') {
            message = `${player?.name} played ${cardName} - selecting an opponent's queen to steal...`;
          } else if (cardType === 'potion') {
            message = `${player?.name} played ${cardName} - selecting an opponent's queen to put to sleep...`;
          }
        }

        // Don't create a lastAction for staging - this is not a completed move
        // The lastAction will be created when the actual move is executed
        const lastAction = state.lastAction;

        // Staging cards with lastAction for UI display

        // Replace staged cards instead of appending
        // Only one action card should be staged at a time
        return {
          ...state,
          stagedCards: {
            ...currentStagedCards,
            [move.playerId]: cards  // Replace, don't append
          },
          lastAction
        };
      }
    };
  }

  private createClearStagedCommand(state: GameState, move: GameMove): Command<GameState> {
    return {
      validate: () => {
        const player = state.players.find(p => p.id === move.playerId);
        if (!player) return { isValid: false, error: 'Player not found' };
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const currentStagedCards = state.stagedCards || {};
        const newStagedCards = { ...currentStagedCards };
        delete newStagedCards[move.playerId];

        return {
          ...state,
          stagedCards: newStagedCards
        };
      }
    };
  }

  private createAllowKnightCommand(state: GameState, _move: GameMove): Command<GameState> {
    return {
      validate: () => {
        if (!state.pendingKnightAttack) {
          return { isValid: false, error: 'No pending knight attack' };
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const attack = state.pendingKnightAttack;
        if (!attack) {
          throw new Error('No pending knight attack');
        }
        const attackerIndex = state.players.findIndex(p => p.id === attack.attacker);
        const targetIndex = state.players.findIndex(p => p.id === attack.target);
        const attacker = state.players[attackerIndex];
        const target = state.players[targetIndex];

        // Move the queen from target to attacker
        const newAttackerQueens = [...attacker.queens, attack.targetQueen];
        const newTargetQueens = target.queens.filter(q => q.id !== attack.targetQueen.id);

        // Note: Cat/Dog Queen conflict is now prevented by validation in KnightRules
        // So we no longer need to check for conflict here
        const newSleepingQueens = [...state.sleepingQueens];
        const finalAttackerQueens = newAttackerQueens;

        const newPlayers = state.players.map((p, idx) => {
          if (idx === attackerIndex) {
            return {
              ...p,
              queens: finalAttackerQueens,
              score: finalAttackerQueens.reduce((sum, q) => sum + q.points, 0)
            };
          } else if (idx === targetIndex) {
            return {
              ...p,
              queens: newTargetQueens,
              score: newTargetQueens.reduce((sum, q) => sum + q.points, 0)
            };
          }
          return p;
        });

        const attackMessage = `${attacker?.name} successfully stole ${attack.targetQueen.name} (${attack.targetQueen.points} points) from ${target?.name}!`;

        return {
          ...state,
          players: newPlayers,
          sleepingQueens: newSleepingQueens,
          pendingKnightAttack: undefined,
          lastAction: {
            playerId: attack.attacker,
            playerName: attacker?.name || 'Unknown',
            actionType: 'play_knight',
            cards: [],
            message: attackMessage,
            timestamp: Date.now()
          },
          updatedAt: Date.now()
        };
      }
    };
  }

  private createAllowPotionCommand(state: GameState, _move: GameMove): Command<GameState> {
    return {
      validate: () => {
        if (!state.pendingPotionAttack) {
          return { isValid: false, error: 'No pending potion attack' };
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const attack = state.pendingPotionAttack;
        if (!attack) {
          throw new Error('No pending potion attack');
        }
        const newSleepingQueens = [...state.sleepingQueens];
        const newPlayers = [...state.players];

        if (attack.target) {
          // Stealing opponent's queen - put it to sleep
          const targetIndex = state.players.findIndex(p => p.id === attack.target);
          const target = state.players[targetIndex];
          const targetQueen = attack.targetQueen as Queen;
          const newTargetQueens = target.queens.filter(q => q.id !== targetQueen.id);

          newSleepingQueens.push({ ...targetQueen, isAwake: false });

          newPlayers[targetIndex] = {
            ...target,
            queens: newTargetQueens,
            score: newTargetQueens.reduce((sum, q) => sum + q.points, 0)
          };
        } else {
          // Waking sleeping queen
          const attackerIndex = state.players.findIndex(p => p.id === attack.attacker);
          const attacker = state.players[attackerIndex];
          const targetQueen = attack.targetQueen as Queen;
          const queenIndex = newSleepingQueens.findIndex(q => q.id === targetQueen.id);

          if (queenIndex !== -1) {
            const [queen] = newSleepingQueens.splice(queenIndex, 1);
            const newQueens = [...attacker.queens, { ...queen, isAwake: true }];

            newPlayers[attackerIndex] = {
              ...attacker,
              queens: newQueens,
              score: newQueens.reduce((sum, q) => sum + q.points, 0)
            };
          }
        }

        return {
          ...state,
          players: newPlayers,
          sleepingQueens: newSleepingQueens,
          pendingPotionAttack: undefined,
          updatedAt: Date.now()
        };
      }
    };
  }

  private isSpecialAction(move: GameMove, state: GameState): boolean {
    // Check if this move requires waiting for response (defense, etc.)
    if (state.pendingKnightAttack || state.pendingPotionAttack) {
      return true;
    }

    // Check if there's a Rose Queen bonus pending
    if (state.roseQueenBonus?.pending) {
      // If this is the rose queen bonus move, it's NOT special (turn should advance after)
      if (move.type === 'rose_queen_bonus') {
        return false;
      }
      return true; // Still waiting for queen selection
    }

    // For jester moves, check if this is still waiting for queen selection
    if (state.jesterReveal) {
      // If this is a jester move with targetCard, it's completing the queen selection
      // and should NOT be treated as special action (turn should advance)
      if (move.type === 'play_jester' && (move.targetCard || move.targetQueenId)) {
        return false; // This completes the jester sequence, turn should advance
      }
      return true; // Still waiting for queen selection
    }

    // Check if Jester just revealed a power card
    if (move.type === 'play_jester' && state.jesterReveal === undefined) {
      // This means the jester revealed a power card and player keeps it
      // We can check this by seeing if the player's hand size stayed the same or increased
      return true; // For now, assume all non-number reveals keep turn
    }

    // Check if staging a card that requires follow-up action
    if (move.type === 'stage_cards') {
      // If staging a King, Knight, or Potion, don't advance turn
      // as player needs to select target
      const cards = move.cards || [];
      const hasActionCard = cards.some(c =>
        c.type === 'king' || c.type === 'knight' || c.type === 'potion'
      );
      if (hasActionCard) {
        return true; // Don't advance turn - waiting for target selection
      }
    }

    return false;
  }

  validateMove(move: GameMove, state: GameState): MoveValidationResult {
    try {
      const command = this.createCommand(move, state);
      return command.validate();
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private createRoseQueenBonusCommand(state: GameState, move: GameMove): Command<GameState> {
    return {
      validate: () => {
        if (!state.roseQueenBonus?.pending) {
          return { isValid: false, error: 'No Rose Queen bonus pending' };
        }
        if (state.roseQueenBonus.playerId !== move.playerId) {
          return { isValid: false, error: 'Not your Rose Queen bonus' };
        }
        if (!move.targetCard && !move.targetQueenId) {
          return { isValid: false, error: 'Must select a queen' };
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const targetQueenId = move.targetCard?.id || move.targetQueenId;
        const queenIndex = state.sleepingQueens.findIndex(q => q.id === targetQueenId);

        if (queenIndex === -1) {
          throw new Error('Queen not found');
        }

        const playerIndex = state.players.findIndex(p => p.id === move.playerId);
        const player = state.players[playerIndex];

        // Wake the bonus queen
        const newSleepingQueens = [...state.sleepingQueens];
        const [queen] = newSleepingQueens.splice(queenIndex, 1);
        const newQueens = [...player.queens, { ...queen, isAwake: true }];

        // Check for Cat/Dog conflict
        const hasCatQueen = newQueens.some(q => q.name === 'Cat Queen');
        const hasDogQueen = newQueens.some(q => q.name === 'Dog Queen');
        let finalQueens = newQueens;
        let conflictMessage = '';

        if (hasCatQueen && hasDogQueen) {
          // Keep the older queen, return the newer one
          if (queen.name === 'Dog Queen') {
            finalQueens = finalQueens.filter(q => q.name !== 'Dog Queen');
            newSleepingQueens.push({ ...queen, isAwake: false });
            conflictMessage = ' But Cat Queen and Dog Queen can\'t be together! Dog Queen went back to sleep!';
          } else if (queen.name === 'Cat Queen') {
            finalQueens = finalQueens.filter(q => q.name !== 'Cat Queen');
            newSleepingQueens.push({ ...queen, isAwake: false });
            conflictMessage = ' But Cat Queen and Dog Queen can\'t be together! Cat Queen went back to sleep!';
          }
        }

        const newPlayers = [...state.players];
        newPlayers[playerIndex] = {
          ...player,
          queens: finalQueens,
          score: finalQueens.reduce((sum, q) => sum + q.points, 0)
        };

        const bonusMessage = conflictMessage
          ? `${player.name} woke ${queen.name} (${queen.points} points) as Rose Queen bonus!${conflictMessage}`
          : `${player.name} woke ${queen.name} (${queen.points} points) as Rose Queen bonus!`;

        return {
          ...state,
          players: newPlayers,
          sleepingQueens: newSleepingQueens,
          roseQueenBonus: state.roseQueenBonus ? { ...state.roseQueenBonus, pending: false } : undefined,
          lastAction: {
            playerId: move.playerId,
            playerName: player.name,
            actionType: 'play_king',
            cards: [],
            message: bonusMessage,
            timestamp: Date.now()
          },
          updatedAt: Date.now(),
          version: state.version + 1
        };
      }
    };
  }

  private ensureHandSizes(state: GameState): GameState {
    const TARGET_HAND_SIZE = 5;
    let newDeck = [...state.deck];
    let newDiscardPile = [...state.discardPile];

    const newPlayers = state.players.map(player => {
      const currentHandSize = player.hand.length;

      if (currentHandSize >= TARGET_HAND_SIZE) {
        return player; // Player has enough cards
      }

      // Special case: Don't draw for jester player if waiting for queen selection
      if (state.jesterReveal?.waitingForQueenSelection &&
          state.jesterReveal.originalPlayerId === player.id) {
        return player; // Jester player waits until after queen selection to draw
      }

      const cardsNeeded = TARGET_HAND_SIZE - currentHandSize;
      const newHand = [...player.hand];

      // Draw cards to reach target hand size
      for (let i = 0; i < cardsNeeded; i++) {
        // Reshuffle if deck is empty
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = [...CardShuffler.shuffle([...newDiscardPile])];
          newDiscardPile = [];
        }

        if (newDeck.length > 0) {
          const card = newDeck.pop();
          if (card) newHand.push(card);
        }
      }

      return { ...player, hand: newHand };
    });

    return {
      ...state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile
    };
  }

}