// Pure domain rules for Win Conditions
import {GameState} from '../models/GameState';

export interface WinResult {
  readonly hasWinner: boolean;
  readonly winnerId?: string;
  readonly reason?: 'queens' | 'points' | 'all_awakened';
}

export class WinConditions {
  static checkWinCondition(state: GameState): WinResult {
    const playerCount = state.players.length;

    for (const player of state.players) {
      // Check for queen count win
      const requiredQueens = playerCount <= 3 ? 5 : 4;
      if (player.queens.length >= requiredQueens) {
        return { hasWinner: true, winnerId: player.id, reason: 'queens' };
      }

      // Check for points win
      const requiredPoints = playerCount <= 3 ? 50 : 40;
      const points = player.queens.reduce((sum, q) => sum + q.points, 0);
      if (points >= requiredPoints) {
        return { hasWinner: true, winnerId: player.id, reason: 'points' };
      }
    }

    // Check if all queens are awake (game ends)
    if (state.sleepingQueens.length === 0) {
      // Find player with most points
      let maxPoints = 0;
      let winnerId = '';

      for (const player of state.players) {
        const points = player.queens.reduce((sum, q) => sum + q.points, 0);
        if (points > maxPoints) {
          maxPoints = points;
          winnerId = player.id;
        }
      }

      if (winnerId) {
        return { hasWinner: true, winnerId, reason: 'all_awakened' };
      }
    }

    return { hasWinner: false };
  }

  static isGameOver(state: GameState): boolean {
    return this.checkWinCondition(state).hasWinner;
  }
}