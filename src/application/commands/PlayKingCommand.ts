// Application command for playing King cards
import {Command, CommandValidationException} from '../ports/Command';
import {GameState} from '../../domain/models/GameState';
import {GameMove, MoveValidationResult} from '../../domain/models/GameMove';
import {KingRules} from '../../domain/rules/KingRules';
import {TurnManager} from '../../domain/services/TurnManager';
import {CardShuffler} from '@/infrastructure/random/CardShuffler';
import {ActionMessageBuilder} from '../utils/ActionMessageBuilder';
import {Card} from '../../domain/models/Card';

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

    const player = this.state.players.find(p => p.id === this.move.playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    const targetQueen = this.state.sleepingQueens.find(q => q.id === targetQueenId);
    if (!targetQueen) {
      throw new Error('Target queen not found');
    }

    // Create new state with immutable updates
    const kingCard = player.hand.find(c => c.id === cardId);
    if (!kingCard) {
      throw new Error('King card not found in hand');
    }
    const newHand = player.hand.filter(c => c.id !== cardId);
    const newQueens = [...player.queens, { ...targetQueen, isAwake: true }];
    const newSleepingQueens = this.state.sleepingQueens.filter(q => q.id !== targetQueenId);
    let newDiscardPile = [...this.state.discardPile, kingCard];
    let newDeck = [...this.state.deck];

    // Draw replacement card only if hand is below 5 cards
    let drawnCount = 0;
    const replacementCards: Card[] = [];
    if (newHand.length < 5) {
      if (newDeck.length === 0 && newDiscardPile.length > 0) {
        // Reshuffle
        newDeck = [...CardShuffler.shuffle([...newDiscardPile])];
        newDiscardPile = [];
      }
      if (newDeck.length > 0) {
        const drawnCard = newDeck.pop();
        if (drawnCard) {
          newHand.push(drawnCard);
          replacementCards.push(drawnCard);
          drawnCount = 1;
        }
      }
    }

    // Check for Cat/Dog Queen conflict
    let finalQueens = newQueens;
    const hasCatQueen = finalQueens.some(q => q.name === 'Cat Queen');
    const hasDogQueen = finalQueens.some(q => q.name === 'Dog Queen');
    let conflictMessage = '';

    if (hasCatQueen && hasDogQueen) {
      // Keep the older queen (first acquired), return the newer one
      if (targetQueen.name === 'Dog Queen') {
        // Just got Dog Queen, but keep Cat Queen (first acquired)
        finalQueens = finalQueens.filter(q => q.name !== 'Dog Queen');
        // Return Dog Queen to sleeping queens
        newSleepingQueens.push({ ...targetQueen, isAwake: false });
        conflictMessage = ' But Cat Queen and Dog Queen can\'t be together! Dog Queen went back to sleep!';
      } else if (targetQueen.name === 'Cat Queen') {
        // Just got Cat Queen, but keep Dog Queen (first acquired)
        finalQueens = finalQueens.filter(q => q.name !== 'Cat Queen');
        // Return Cat Queen to sleeping queens
        newSleepingQueens.push({ ...targetQueen, isAwake: false });
        conflictMessage = ' But Cat Queen and Dog Queen can\'t be together! Cat Queen went back to sleep!';
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
      lastAction: {
        playerId: this.move.playerId,
        playerName: this.state.players.find(p => p.id === this.move.playerId)?.name || 'Unknown',
        actionType: 'play_king',
        cards: replacementCards, // Private: replacement cards picked up
        playedCards: [kingCard], // Public: king card that was played
        drawnCount,
        message: ActionMessageBuilder.buildCompoundMessage({
          playerName: this.state.players.find(p => p.id === this.move.playerId)?.name || 'Player',
          primaryAction: ActionMessageBuilder.formatQueenAction(targetQueen, 'woke') + ' with a King',
          cardsDrawn: drawnCount,
          specialEffects: [
            ...(roseQueenBonus ? ['Rose Queen bonus activated!'] : []),
            ...(conflictMessage ? [conflictMessage.trim()] : [])
          ].filter(Boolean)
        }),
        timestamp: Date.now(),
        actionDetails: [
          {
            action: 'Played King',
            detail: kingCard.name || 'King',
            cards: [kingCard]
          },
          {
            action: 'Woke Queen',
            detail: `${targetQueen.name} (${targetQueen.points} points)`,
            cards: [targetQueen]
          },
          ...(drawnCount > 0 ? [{
            action: 'Drew card',
            detail: 'Replacement card drawn'
          }] : []),
          ...(roseQueenBonus ? [{
            action: 'Rose Queen Bonus',
            detail: 'Choose another queen to wake!'
          }] : []),
          ...(conflictMessage ? [{
            action: 'Queen Conflict',
            detail: conflictMessage.replace(' But ', '').replace('!', '')
          }] : [])
        ]
      },
      updatedAt: Date.now(),
      version: this.state.version + 1
    };
  }

}