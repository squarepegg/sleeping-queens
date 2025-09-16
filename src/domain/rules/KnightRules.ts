// Pure domain rules for Knight moves
import {GameState} from '../models/GameState';
import {GameMove, MoveValidationResult} from '../models/GameMove';

export class KnightRules {
  static validate(move: GameMove, state: GameState): MoveValidationResult {
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;
    const targetPlayerId = move.targetPlayerId || move.targetPlayer;

    if (!cardId || !targetPlayerId || !targetQueenId) {
      return { isValid: false, error: 'Knight move requires card, target player, and target queen' };
    }

    const player = state.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'knight') {
      return { isValid: false, error: 'Card is not a knight' };
    }

    if (targetPlayerId === move.playerId) {
      return { isValid: false, error: 'Cannot steal from yourself' };
    }

    const targetPlayer = state.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer) {
      return { isValid: false, error: 'Target player not found' };
    }

    const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId);
    if (!targetQueen) {
      return { isValid: false, error: 'Target player does not have that queen' };
    }

    // Check for Cat/Dog Queen conflict
    const attackerHasCatQueen = player.queens.some(q => q.name === 'Cat Queen');
    const attackerHasDogQueen = player.queens.some(q => q.name === 'Dog Queen');

    if (attackerHasCatQueen && targetQueen.name === 'Dog Queen') {
      return { isValid: false, error: 'You cannot steal the Dog Queen while you have the Cat Queen! They don\'t get along!' };
    }

    if (attackerHasDogQueen && targetQueen.name === 'Cat Queen') {
      return { isValid: false, error: 'You cannot steal the Cat Queen while you have the Dog Queen! They don\'t get along!' };
    }

    return { isValid: true };
  }

  static canAttack(state: GameState): boolean {
    return state.players.some(p => p.queens.length > 0);
  }
}