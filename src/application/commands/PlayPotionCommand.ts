// Application command for Potion moves
import {GameState} from '../../domain/models/GameState';
import {GameMove, MoveValidationResult} from '../../domain/models/GameMove';
import {Command} from '../ports/Command';
import {PotionRules} from '../../domain/rules/PotionRules';
import {ScoreCalculator} from '../../domain/services/ScoreCalculator';

export class PlayPotionCommand implements Command<GameState> {
  constructor(
    private readonly state: GameState,
    private readonly move: GameMove
  ) {}

  validate(): MoveValidationResult {
    return PotionRules.validate(this.move, this.state);
  }

  canExecute(): boolean {
    return this.validate().isValid;
  }

  execute(): GameState {
    // Check if this is for stealing an opponent's queen
    const targetPlayerId = this.move.targetPlayerId || this.move.targetPlayer;
    const targetQueenId = this.move.targetQueenId || this.move.targetQueen || this.move.targetCard?.id;

    if (targetPlayerId && targetQueenId) {
      // Stealing opponent's queen
      return this.stealOpponentQueen(targetPlayerId, targetQueenId);
    }

    // Handle queen selection after potion use (for sleeping queens)
    if (this.state.potionQueenSelection && this.move.targetCard) {
      return this.completePotionQueenSelection();
    }

    // Play potion card for sleeping queen
    return this.playPotionCard();
  }

  private stealOpponentQueen(targetPlayerId: string, targetQueenId: string): GameState {
    const playerIndex = this.state.players.findIndex(p => p.id === this.move.playerId);
    const player = this.state.players[playerIndex];
    const targetPlayerIndex = this.state.players.findIndex(p => p.id === targetPlayerId);
    const targetPlayer = this.state.players[targetPlayerIndex];

    if (!player || !targetPlayer) {
      throw new Error('Player not found');
    }

    const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId);
    if (!targetQueen) {
      throw new Error('Target queen not found');
    }

    const cardId = this.move.cardId || this.move.cards?.[0]?.id;
    const potionCard = player.hand.find(c => c.id === cardId);
    if (!potionCard) {
      throw new Error('Potion card not found');
    }

    // Check if target has wand for defense
    const targetHasWand = targetPlayer.hand.some(card => card.type === 'wand');

    if (targetHasWand) {
      // Create pending attack state - target can defend
      const pendingAttack = {
        attacker: this.move.playerId,
        target: targetPlayerId,
        targetQueen: targetQueen,
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 5000 // 5 seconds
      };

      // Remove potion from hand and draw replacement
      const newHand = player.hand.filter(c => c.id !== cardId);
      let newDiscardPile = [...this.state.discardPile, potionCard];
      let newDeck = [...this.state.deck];

      // Draw replacement card only if hand is below 5 cards
      if (newHand.length < 5) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = this.shuffleCards([...newDiscardPile]);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          const drawnCard = newDeck.pop();
        if (drawnCard) {
          newHand.push(drawnCard);
        }
        }
      }

      const newPlayers = [...this.state.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      return {
        ...this.state,
        players: newPlayers,
        deck: newDeck,
        discardPile: newDiscardPile,
        pendingPotionAttack: pendingAttack,
        updatedAt: Date.now()
      };
    } else {
      // No defense - execute the steal immediately
      const newAttackerHand = player.hand.filter(c => c.id !== cardId);
      const newTargetQueens = targetPlayer.queens.filter(q => q.id !== targetQueenId);
      let newDiscardPile = [...this.state.discardPile, potionCard];
      let newDeck = [...this.state.deck];
      const newSleepingQueens = [...this.state.sleepingQueens];

      // Put the queen to sleep
      newSleepingQueens.push({ ...targetQueen, isAwake: false });

      // Draw replacement card for attacker only if hand is below 5 cards
      if (newAttackerHand.length < 5) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          newDeck = this.shuffleCards([...newDiscardPile]);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          const drawnCard = newDeck.pop();
        if (drawnCard) {
          newAttackerHand.push(drawnCard);
        }
        }
      }

      const updatedPlayers = this.state.players.map((p, idx) => {
        if (idx === playerIndex) {
          return { ...p, hand: newAttackerHand };
        } else if (idx === targetPlayerIndex) {
          return {
            ...p,
            queens: newTargetQueens,
            score: newTargetQueens.reduce((sum, q) => sum + q.points, 0)
          };
        }
        return p;
      });

      return {
        ...this.state,
        players: updatedPlayers,
        sleepingQueens: newSleepingQueens,
        deck: newDeck,
        discardPile: newDiscardPile,
        updatedAt: Date.now(),
        version: this.state.version + 1
      };
    }
  }

  private playPotionCard(): GameState {
    const playerIndex = this.state.players.findIndex(p => p.id === this.move.playerId);
    const player = this.state.players[playerIndex];

    if (!player) {
      throw new Error('Player not found');
    }

    const cardId = this.move.cardId || this.move.cards?.[0]?.id;
    const cardIndex = player.hand.findIndex(c => c.id === cardId);

    if (cardIndex === -1) {
      throw new Error('Potion card not found in hand');
    }

    // Create new hand without potion and draw replacement
    const potionCard = player.hand[cardIndex];
    const newHand = player.hand.filter(c => c.id !== cardId);
    let newDiscardPile = [...this.state.discardPile, potionCard];
    let newDeck = [...this.state.deck];

    // Draw replacement card only if hand is below 5 cards
    if (newHand.length < 5) {
      if (newDeck.length === 0) {
        // Reshuffle
        newDeck = this.shuffleCards([...newDiscardPile]);
        newDiscardPile = [];
      }
      if (newDeck.length > 0) {
        const drawnCard = newDeck.pop();
        if (drawnCard) {
          newHand.push(drawnCard);
        }
      }
    }

    // Set up potion queen selection state
    const potionQueenSelection = {
      playerId: this.move.playerId,
      timestamp: Date.now()
    };

    // Create new players array with updated player
    const newPlayers = [...this.state.players];
    newPlayers[playerIndex] = {
      ...player,
      hand: newHand
    };

    return {
      ...this.state,
      players: newPlayers,
      deck: newDeck,
      discardPile: newDiscardPile,
      potionQueenSelection,
      updatedAt: Date.now()
    };
  }

  private completePotionQueenSelection(): GameState {
    const targetQueenId = this.move.targetCard?.id;
    const queenIndex = this.state.sleepingQueens.findIndex(q => q.id === targetQueenId);

    if (queenIndex === -1) {
      throw new Error('Queen not found');
    }

    const playerIndex = this.state.players.findIndex(p => p.id === this.move.playerId);
    const player = this.state.players[playerIndex];

    if (!player) {
      throw new Error('Player not found');
    }

    // Check if any opponent has a wand for defense
    const opponents = this.state.players.filter(p => p.id !== this.move.playerId);
    const defenderWithWand = opponents.find(p => p.hand.some(c => c.type === 'wand'));

    if (defenderWithWand) {
      // Create pending attack state
      const pendingAttack = {
        attacker: this.move.playerId,
        targetQueen: this.state.sleepingQueens[queenIndex],
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 5000 // 5 seconds
      };

      return {
        ...this.state,
        pendingPotionAttack: pendingAttack,
        potionQueenSelection: undefined,
        updatedAt: Date.now()
      };
    }

    // No defense possible, wake the queen immediately
    const newSleepingQueens = [...this.state.sleepingQueens];
    const [queen] = newSleepingQueens.splice(queenIndex, 1);

    // Create new queens array for player
    const newQueens = [...player.queens, { ...queen, isAwake: true }];
    const newScore = ScoreCalculator.calculatePlayerScore(newQueens);

    // Create new players array with updated player
    const newPlayers = [...this.state.players];
    newPlayers[playerIndex] = {
      ...player,
      queens: newQueens,
      score: newScore
    };

    // Clear potion selection and return (orchestrator handles turn advancement)
    return {
      ...this.state,
      players: newPlayers,
      sleepingQueens: newSleepingQueens,
      potionQueenSelection: undefined,
      updatedAt: Date.now()
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