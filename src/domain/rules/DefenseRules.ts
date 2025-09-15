// Pure domain rules for Defense moves (Dragon/Wand)
import {GameState} from '../models/GameState';
import {GameMove, MoveValidationResult} from '../models/GameMove';

export class DefenseRules {
  static validateDragon(move: GameMove, state: GameState): MoveValidationResult {
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);

    if (!cardId) {
      return { isValid: false, error: 'Dragon move requires card' };
    }

    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'dragon') {
      return { isValid: false, error: 'Card is not a dragon' };
    }

    return { isValid: true };
  }

  static validateWand(move: GameMove, state: GameState): MoveValidationResult {
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);

    if (!cardId) {
      return { isValid: false, error: 'Wand move requires card' };
    }

    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'wand') {
      return { isValid: false, error: 'Card is not a wand' };
    }

    // Wands can only be played in response to a potion attack
    // This is checked in canPlayerAct
    return { isValid: true };
  }

  static canDefendWithDragon(state: GameState, playerId: string): boolean {
    return !!state.pendingKnightAttack && state.pendingKnightAttack.target === playerId;
  }

  static canDefendWithWand(state: GameState, playerId: string): boolean {
    return !!state.pendingPotionAttack && state.pendingPotionAttack.target === playerId;
  }
}