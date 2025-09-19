// Pure domain service for turn management
import {GameState} from '../models/GameState';

export class TurnManager {
  static isPlayerTurn(state: GameState, playerId: string): boolean {
    return state.currentPlayerId === playerId;
  }

  static canPlayerAct(state: GameState, playerId: string): boolean {
    // Case 1: It's the player's normal turn
    if (state.currentPlayerId === playerId) {
      return true;
    }

    // Case 2: Jester revealed a number and it landed on this player
    if (state.jesterReveal?.waitingForQueenSelection &&
        state.jesterReveal?.targetPlayer === playerId) {
      return true;
    }

    // Case 3: Player is defending against Knight attack with Dragon
    if (state.pendingKnightAttack?.target === playerId) {
      return true;
    }

    // Case 4: Player is defending against Potion attack with Wand
    if (state.pendingPotionAttack?.target === playerId) {
      return true;
    }

    // Case 5: Player has Rose Queen bonus pending
    if (state.roseQueenBonus?.pending && state.roseQueenBonus?.playerId === playerId) {
      return true;
    }

    return false;
  }

  static getNextPlayerIndex(currentIndex: number, playerCount: number): number {
    return (currentIndex + 1) % playerCount;
  }

  static advanceTurn(state: GameState): GameState {
    const nextIndex = this.getNextPlayerIndex(state.currentPlayerIndex, state.players.length);
    const nextPlayer = state.players[nextIndex];

    return {
      ...state,
      currentPlayerIndex: nextIndex,
      currentPlayerId: nextPlayer.id,
      updatedAt: Date.now()
    };
  }
}