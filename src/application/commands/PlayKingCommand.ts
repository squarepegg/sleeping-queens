// Application command for playing King cards
import {Command, CommandValidationException} from '../ports/Command';
import {GameState} from '../../domain/models/GameState';
import {GameMove, MoveValidationResult} from '../../domain/models/GameMove';
import {KingRules} from '../../domain/rules/KingRules';
import {TurnManager} from '../../domain/services/TurnManager';

export class PlayKingCommand implements Command<GameState> {
  constructor(
    private readonly state: GameState,
    private readonly move: GameMove
  ) {}

  validate(): MoveValidationResult {
    // Check turn
    if (!TurnManager.canPlayerAct(this.state, this.move.playerId)) {
      return { isValid: false, error: 'Not your turn' };
    }

    // Check king-specific rules
    return KingRules.validate(this.move, this.state);
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

    if (!cardId || !targetQueenId) {
      throw new Error('Invalid move parameters');
    }

    const player = this.state.players.find(p => p.id === this.move.playerId)!;
    const targetQueen = this.state.sleepingQueens.find(q => q.id === targetQueenId)!;

    // Create new state with immutable updates
    const kingCard = player.hand.find(c => c.id === cardId)!;
    const newHand = player.hand.filter(c => c.id !== cardId);
    const newQueens = [...player.queens, { ...targetQueen, isAwake: true }];
    const newSleepingQueens = this.state.sleepingQueens.filter(q => q.id !== targetQueenId);
    let newDiscardPile = [...this.state.discardPile, kingCard];
    let newDeck = [...this.state.deck];

    // Draw replacement card only if hand is below 5 cards
    if (newHand.length < 5) {
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        // Reshuffle
        newDeck = this.shuffleCards([...newDiscardPile]);
        newDiscardPile = [];
      }
      if (newDeck.length > 0) {
        newHand.push(newDeck.pop()!);
      }
    }

    // Check for Cat/Dog Queen conflict
    let finalQueens = newQueens;
    const hasCatQueen = finalQueens.some(q => q.name === 'Cat Queen');
    const hasDogQueen = finalQueens.some(q => q.name === 'Dog Queen');

    if (hasCatQueen && hasDogQueen) {
      // Keep the older queen (first acquired), return the newer one
      if (targetQueen.name === 'Dog Queen') {
        // Just got Dog Queen, but keep Cat Queen (first acquired)
        finalQueens = finalQueens.filter(q => q.name !== 'Dog Queen');
        // Return Dog Queen to sleeping queens
        newSleepingQueens.push({ ...targetQueen, isAwake: false });
      } else if (targetQueen.name === 'Cat Queen') {
        // Just got Cat Queen, but keep Dog Queen (first acquired)
        finalQueens = finalQueens.filter(q => q.name !== 'Cat Queen');
        // Return Cat Queen to sleeping queens
        newSleepingQueens.push({ ...targetQueen, isAwake: false });
      }
    }

    const updatedPlayers = this.state.players.map(p =>
      p.id === this.move.playerId
        ? { ...p, hand: newHand, queens: finalQueens, score: finalQueens.reduce((sum, q) => sum + q.points, 0) }
        : p
    );

    // Check for Rose Queen bonus (only when waking from center)
    let roseQueenBonus = undefined;
    if (targetQueen.name === 'Rose Queen') {
      roseQueenBonus = {
        playerId: this.move.playerId,
        pending: true,
        timestamp: Date.now()
      };
    }

    // Clear staged cards for this player
    const newStagedCards = { ...this.state.stagedCards };
    if (newStagedCards && newStagedCards[this.move.playerId]) {
      delete newStagedCards[this.move.playerId];
    }

    return {
      ...this.state,
      players: updatedPlayers,
      sleepingQueens: newSleepingQueens,
      deck: newDeck,
      discardPile: newDiscardPile,
      stagedCards: newStagedCards,
      roseQueenBonus,
      updatedAt: Date.now(),
      version: this.state.version + 1
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