// Application command for playing Knight cards
import {Command, CommandValidationException} from '../ports/Command';
import {GameState} from '../../domain/models/GameState';
import {GameMove, MoveValidationResult} from '../../domain/models/GameMove';
import {KnightRules} from '../../domain/rules/KnightRules';
import {TurnManager} from '../../domain/services/TurnManager';

export class PlayKnightCommand implements Command<GameState> {
  constructor(
    private readonly state: GameState,
    private readonly move: GameMove
  ) {}

  validate(): MoveValidationResult {
    // Check turn
    if (!TurnManager.canPlayerAct(this.state, this.move.playerId)) {
      return { isValid: false, error: 'Not your turn' };
    }

    // Check knight-specific rules
    return KnightRules.validate(this.move, this.state);
  }

  canExecute(): boolean {
    return this.validate().isValid;
  }

  execute(): GameState {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new CommandValidationException(validation);
    }

    const cardId = this.move.cardId || this.move.cards?.[0]?.id;
    const targetQueenId = this.move.targetQueenId || this.move.targetQueen || this.move.targetCard?.id;
    const targetPlayerId = this.move.targetPlayerId || this.move.targetPlayer;

    if (!cardId || !targetQueenId || !targetPlayerId) {
      throw new Error('Invalid move parameters');
    }

    const player = this.state.players.find(p => p.id === this.move.playerId)!;
    const targetPlayer = this.state.players.find(p => p.id === targetPlayerId)!;
    const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId)!;

    // Check if target has dragon defense
    const targetHasDragon = targetPlayer.hand.some(card => card.type === 'dragon');

    console.log('[PlayKnightCommand] Knight attack check:', {
      attacker: this.move.playerId,
      target: targetPlayerId,
      targetQueen: targetQueen.name,
      targetHand: targetPlayer.hand.map(c => ({ type: c.type, id: c.id, name: c.name })),
      targetHasDragon,
      willCreatePendingAttack: targetHasDragon,
      dragonCards: targetPlayer.hand.filter(c => c.type === 'dragon').map(c => ({ type: c.type, name: c.name }))
    });

    if (targetHasDragon) {
      // Create pending attack state
      const pendingAttack = {
        attacker: this.move.playerId,
        target: targetPlayerId,
        targetQueen: targetQueen,
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 5000 // 5 seconds
      };

      // Remove knight card from attacker's hand and add to discard pile
      const knightCard = player.hand.find(c => c.id === cardId)!;
      const newAttackerHand = player.hand.filter(c => c.id !== cardId);
      let newDiscardPile = [...this.state.discardPile, knightCard];
      let newDeck = [...this.state.deck];

      // Draw replacement card for attacker only if hand is below 5 cards
      if (newAttackerHand.length < 5) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          // Reshuffle
          newDeck = this.shuffleCards([...newDiscardPile]);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newAttackerHand.push(newDeck.pop()!);
        }
      }

      // Update player with new hand
      const updatedPlayers = this.state.players.map(p =>
        p.id === this.move.playerId
          ? { ...p, hand: newAttackerHand }
          : p
      );

      // Clear staged cards for this player when creating pending attack
      const newStagedCards = { ...this.state.stagedCards };
      if (newStagedCards && newStagedCards[this.move.playerId]) {
        delete newStagedCards[this.move.playerId];
      }

      return {
        ...this.state,
        players: updatedPlayers,
        deck: newDeck,
        discardPile: newDiscardPile,
        pendingKnightAttack: pendingAttack,
        stagedCards: newStagedCards,
        updatedAt: Date.now(),
        version: this.state.version + 1
      };
    } else {
      // Execute attack immediately
      const knightCard = player.hand.find(c => c.id === cardId)!;
      const newAttackerHand = player.hand.filter(c => c.id !== cardId);
      let newAttackerQueens = [...player.queens, targetQueen];
      const newTargetQueens = targetPlayer.queens.filter(q => q.id !== targetQueenId);
      let newDiscardPile = [...this.state.discardPile, knightCard];
      let newDeck = [...this.state.deck];
      const newSleepingQueens = [...this.state.sleepingQueens];

      // Check for Cat/Dog Queen conflict for attacker
      const hasCatQueen = newAttackerQueens.some(q => q.name === 'Cat Queen');
      const hasDogQueen = newAttackerQueens.some(q => q.name === 'Dog Queen');

      if (hasCatQueen && hasDogQueen) {
        // Keep the older queen (first acquired), return the newer one
        if (targetQueen.name === 'Dog Queen') {
          // Just got Dog Queen, but keep Cat Queen (first acquired)
          newAttackerQueens = newAttackerQueens.filter(q => q.name !== 'Dog Queen');
          // Return Dog Queen to sleeping queens
          newSleepingQueens.push({ ...targetQueen, isAwake: false });
        } else if (targetQueen.name === 'Cat Queen') {
          // Just got Cat Queen, but keep Dog Queen (first acquired)
          newAttackerQueens = newAttackerQueens.filter(q => q.name !== 'Cat Queen');
          // Return Cat Queen to sleeping queens
          newSleepingQueens.push({ ...targetQueen, isAwake: false });
        }
      }

      // Draw replacement card for attacker only if hand is below 5 cards
      if (newAttackerHand.length < 5) {
        if (newDeck.length === 0 && newDiscardPile.length > 0) {
          // Reshuffle
          newDeck = this.shuffleCards([...newDiscardPile]);
          newDiscardPile = [];
        }
        if (newDeck.length > 0) {
          newAttackerHand.push(newDeck.pop()!);
        }
      }

      const updatedPlayers = this.state.players.map(p => {
        if (p.id === this.move.playerId) {
          return { ...p, hand: newAttackerHand, queens: newAttackerQueens, score: newAttackerQueens.reduce((sum, q) => sum + q.points, 0) };
        } else if (p.id === targetPlayerId) {
          return { ...p, queens: newTargetQueens, score: newTargetQueens.reduce((sum, q) => sum + q.points, 0) };
        }
        return p;
      });

      // Clear staged cards for this player when executing immediately
      const clearedStagedCards = { ...this.state.stagedCards };
      if (clearedStagedCards && clearedStagedCards[this.move.playerId]) {
        delete clearedStagedCards[this.move.playerId];
      }

      return {
        ...this.state,
        players: updatedPlayers,
        sleepingQueens: newSleepingQueens,
        deck: newDeck,
        discardPile: newDiscardPile,
        stagedCards: clearedStagedCards,
        updatedAt: Date.now(),
        version: this.state.version + 1
      };
    }
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