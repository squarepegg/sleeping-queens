// Pure domain rules for King moves
import {GameState} from '../models/GameState';
import {GameMove, MoveValidationResult} from '../models/GameMove';

export class KingRules {
  static validate(move: GameMove, state: GameState): MoveValidationResult {
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;

    if (!cardId || !targetQueenId) {
      return { isValid: false, error: 'King move requires card and target queen' };
    }

    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'king') {
      return { isValid: false, error: 'Card is not a king' };
    }

    const queen = state.sleepingQueens.find(q => q.id === targetQueenId);
    if (!queen) {
      return { isValid: false, error: 'Target queen not found or already awake' };
    }

    return { isValid: true };
  }

  static canWakeQueen(state: GameState): boolean {
    return state.sleepingQueens.length > 0;
  }
}