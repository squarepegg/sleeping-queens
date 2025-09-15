// Pure domain rules for Jester moves
import {GameState} from '../models/GameState';
import {GameMove, MoveValidationResult} from '../models/GameMove';

export class JesterRules {
  static validate(move: GameMove, state: GameState): MoveValidationResult {
    // Special case: if there's a jester reveal waiting for queen selection
    if (state.jesterReveal?.waitingForQueenSelection) {
      // Check if this player is the one who should select
      if (move.playerId !== state.jesterReveal.targetPlayerId) {
        return { isValid: false, error: 'Only the target player can select a queen' };
      }
      // For queen selection, we need a targetCard
      if (!move.targetCard) {
        return { isValid: false, error: 'No queen selected' };
      }
      // Allow the queen selection without turn check and without requiring cards
      return { isValid: true };
    }

    // For playing a new jester, we need a card
    // Support both new format (cards array) and legacy format (cardId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);

    if (!cardId) {
      return { isValid: false, error: 'Jester move requires card' };
    }

    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'jester') {
      return { isValid: false, error: 'Card is not a jester' };
    }

    return { isValid: true };
  }

  static canPlay(state: GameState): boolean {
    return state.deck.length > 0;
  }
}