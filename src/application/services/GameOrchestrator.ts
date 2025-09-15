// Application service for orchestrating game operations
import {GameState} from '@/domain/models/GameState';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
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

export class GameOrchestrator {
  constructor(
    private readonly eventPublisher: EventPublisher
  ) {}

  processMove(move: GameMove, state: GameState): MoveValidationResult & { newState?: GameState } {
    try {
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
        keepTurn = true;
        message = 'You woke the Rose Queen! Select another sleeping queen to wake!';
      }

      if (move.type === 'play_jester') {
        if (newState.jesterReveal?.revealedCard?.type === 'number') {
          const value = (newState.jesterReveal.revealedCard as any).value || 1;
          const targetPlayerId = newState.jesterReveal?.targetPlayerId;
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

      // Check win conditions
      const winResult = WinConditions.checkWinCondition(newState);
      if (winResult.hasWinner) {
        newState = {
          ...newState,
          phase: 'ended',
          winner: winResult.winnerId!
        };
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

            newState = {
              ...newState,
              players: newPlayers,
              deck: newDeck,
              discardPile: newDiscardPile,
              pendingKnightAttack: undefined
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

            newState = {
              ...newState,
              players: newPlayers,
              deck: newDeck,
              discardPile: newDiscardPile,
              pendingPotionAttack: undefined
            };
          }
        }

        newState.updatedAt = Date.now();
        newState.version = state.version + 1;

        // After a successful defense, advance turn normally
        // The defender gets their regular turn if they're next
        const nextState = TurnManager.advanceTurn(newState);
        return nextState;
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
            const shuffled = [...newDiscardPile];
            for (let j = shuffled.length - 1; j > 0; j--) {
              const k = Math.floor(Math.random() * (j + 1));
              [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
            }
            newDeck = shuffled;
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
        const values = cards.map((c: any) => c.value || 0);
        const mathResult = validateMathEquation(values);
        const equationStr = mathResult.isValid && mathResult.equation ?
          mathResult.equation :
          values.join(' ');
        const queenAwakened = newQueens.length > player.queens.length;

        // Create new state (don't advance turn - orchestrator handles that)
        return {
          ...state,
          players: newPlayers,
          deck: newDeck,
          discardPile: newDiscardPile,
          sleepingQueens: newSleepingQueens,
          lastAction: {
            playerId: move.playerId,
            playerName: player.name,
            actionType: 'play_math',
            cards: cards,
            drawnCount: cards.length,
            message: `${player.name} played equation ${equationStr}${queenAwakened ? ' and woke a queen!' : ''}`,
            timestamp: Date.now()
          },
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
          if (cardType === 'king') {
            message = `${player?.name} played a King - selecting a queen to wake...`;
          } else if (cardType === 'knight') {
            message = `${player?.name} played a Knight - selecting a queen to steal...`;
          } else if (cardType === 'potion') {
            message = `${player?.name} played a Sleeping Potion - selecting a queen to put to sleep...`;
          }
        }

        // Create the last action for visibility
        const lastAction = message ? {
          playerId: move.playerId,
          playerName: player?.name || 'Unknown',
          actionType: cards[0]?.type === 'king' ? 'play_king' :
                     cards[0]?.type === 'knight' ? 'play_knight' :
                     'play_potion',
          cards: cards,
          message: message,
          timestamp: Date.now()
        } : state.lastAction;

        console.log('[GameOrchestrator] Staging cards with lastAction:', lastAction);

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

  private createAllowKnightCommand(state: GameState, move: GameMove): Command<GameState> {
    return {
      validate: () => {
        if (!state.pendingKnightAttack) {
          return { isValid: false, error: 'No pending knight attack' };
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const attack = state.pendingKnightAttack!;
        const attackerIndex = state.players.findIndex(p => p.id === attack.attacker);
        const targetIndex = state.players.findIndex(p => p.id === attack.target);
        const attacker = state.players[attackerIndex];
        const target = state.players[targetIndex];

        // Move the queen from target to attacker
        const newAttackerQueens = [...attacker.queens, attack.targetQueen];
        const newTargetQueens = target.queens.filter(q => q.id !== attack.targetQueen.id);

        // Check for Cat/Dog conflict
        const newSleepingQueens = [...state.sleepingQueens];
        const hasCatQueen = newAttackerQueens.some(q => q.name === 'Cat Queen');
        const hasDogQueen = newAttackerQueens.some(q => q.name === 'Dog Queen');
        let finalAttackerQueens = newAttackerQueens;

        if (hasCatQueen && hasDogQueen) {
          // Keep the older queen (first acquired), return the newer one
          if (attack.targetQueen.name === 'Dog Queen') {
            // Just got Dog Queen, but keep Cat Queen (first acquired)
            finalAttackerQueens = finalAttackerQueens.filter(q => q.name !== 'Dog Queen');
            newSleepingQueens.push({ ...attack.targetQueen, isAwake: false });
          } else if (attack.targetQueen.name === 'Cat Queen') {
            // Just got Cat Queen, but keep Dog Queen (first acquired)
            finalAttackerQueens = finalAttackerQueens.filter(q => q.name !== 'Cat Queen');
            newSleepingQueens.push({ ...attack.targetQueen, isAwake: false });
          }
        }

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

        return {
          ...state,
          players: newPlayers,
          sleepingQueens: newSleepingQueens,
          pendingKnightAttack: undefined,
          updatedAt: Date.now()
        };
      }
    };
  }

  private createAllowPotionCommand(state: GameState, move: GameMove): Command<GameState> {
    return {
      validate: () => {
        if (!state.pendingPotionAttack) {
          return { isValid: false, error: 'No pending potion attack' };
        }
        return { isValid: true };
      },
      canExecute: function() { return this.validate().isValid; },
      execute: () => {
        const attack = state.pendingPotionAttack!;
        const newSleepingQueens = [...state.sleepingQueens];
        const newPlayers = [...state.players];

        if (attack.target) {
          // Stealing opponent's queen - put it to sleep
          const targetIndex = state.players.findIndex(p => p.id === attack.target);
          const target = state.players[targetIndex];
          const newTargetQueens = target.queens.filter(q => q.id !== (attack.targetQueen as any).id);

          newSleepingQueens.push({ ...(attack.targetQueen as any), isAwake: false });

          newPlayers[targetIndex] = {
            ...target,
            queens: newTargetQueens,
            score: newTargetQueens.reduce((sum, q) => sum + q.points, 0)
          };
        } else {
          // Waking sleeping queen
          const attackerIndex = state.players.findIndex(p => p.id === attack.attacker);
          const attacker = state.players[attackerIndex];
          const queenIndex = newSleepingQueens.findIndex(q => q.id === (attack.targetQueen as any).id);

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

        if (hasCatQueen && hasDogQueen) {
          // Keep the older queen, return the newer one
          if (queen.name === 'Dog Queen') {
            finalQueens = finalQueens.filter(q => q.name !== 'Dog Queen');
            newSleepingQueens.push({ ...queen, isAwake: false });
          } else if (queen.name === 'Cat Queen') {
            finalQueens = finalQueens.filter(q => q.name !== 'Cat Queen');
            newSleepingQueens.push({ ...queen, isAwake: false });
          }
        }

        const newPlayers = [...state.players];
        newPlayers[playerIndex] = {
          ...player,
          queens: finalQueens,
          score: finalQueens.reduce((sum, q) => sum + q.points, 0)
        };

        return {
          ...state,
          players: newPlayers,
          sleepingQueens: newSleepingQueens,
          roseQueenBonus: state.roseQueenBonus ? { ...state.roseQueenBonus, pending: false } : undefined,
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
          newDeck = this.shuffleCards([...newDiscardPile]);
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

  private shuffleCards(cards: any[]): any[] {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}