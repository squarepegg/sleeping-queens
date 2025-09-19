// Domain rules for Potion cards
import {GameMove, MoveValidationResult} from '../models/GameMove';
import {GameState} from '../models/GameState';

export class PotionRules {
  static validate(move: GameMove, state: GameState): MoveValidationResult {
    // Check if this is a potion queen selection
    if (state.potionQueenSelection) {
      return this.validateQueenSelection(move, state);
    }

    // Validate playing a potion card
    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const cardId = move.cardId || move.cards?.[0]?.id;
    const card = player.hand.find(c => c.id === cardId);

    if (!card || card.type !== 'potion') {
      return { isValid: false, error: 'Potion card not found in hand' };
    }

    // Check if targeting opponent's queen
    const targetPlayerId = move.targetPlayer;
    if (targetPlayerId) {
      const targetPlayer = state.players.find(p => p.id === targetPlayerId);
      if (!targetPlayer) {
        return { isValid: false, error: 'Target player not found' };
      }
      if (targetPlayer.queens.length === 0) {
        return { isValid: false, error: 'Target player has no queens' };
      }
      const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;
      if (!targetQueenId) {
        return { isValid: false, error: 'No target queen specified' };
      }
      const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId);
      if (!targetQueen) {
        return { isValid: false, error: 'Target queen not found' };
      }
      return { isValid: true };
    }

    // Otherwise, potions can only wake queens from the center
    if (state.sleepingQueens.length === 0) {
      return { isValid: false, error: 'No sleeping queens to wake' };
    }

    return { isValid: true };
  }

  private static validateQueenSelection(move: GameMove, state: GameState): MoveValidationResult {
    // Must be the player who played the potion
    if (move.playerId !== state.potionQueenSelection!.playerId) {
      return { isValid: false, error: 'Not the potion player' };
    }

    // Must select a sleeping queen
    const targetQueenId = move.targetCard?.id || move.targetQueenId;
    if (!targetQueenId) {
      return { isValid: false, error: 'No queen selected' };
    }

    const queen = state.sleepingQueens.find(q => q.id === targetQueenId);
    if (!queen) {
      return { isValid: false, error: 'Invalid queen selection' };
    }

    return { isValid: true };
  }
}