// Pure domain service for score calculation
import {Player} from '../models/Player';
import {Queen} from '../models/Card';

export class ScoreCalculator {
  static calculatePlayerScore(queens: ReadonlyArray<Queen>): number {
    return queens.reduce((total, queen) => total + queen.points, 0);
  }

  static getAllPlayerScores(players: ReadonlyArray<Player>): ReadonlyArray<{
    readonly player: Player;
    readonly score: number;
    readonly queensCount: number;
  }> {
    return players.map(player => ({
      player,
      score: this.calculatePlayerScore(player.queens),
      queensCount: player.queens.length
    }));
  }

  static getCurrentLeader(players: ReadonlyArray<Player>): {
    readonly player: Player;
    readonly score: number;
    readonly queensCount: number;
  } | null {
    if (players.length === 0) return null;

    let leader = players[0];
    let highestScore = this.calculatePlayerScore(leader.queens);

    for (let i = 1; i < players.length; i++) {
      const player = players[i];
      const score = this.calculatePlayerScore(player.queens);

      if (score > highestScore) {
        leader = player;
        highestScore = score;
      }
    }

    return {
      player: leader,
      score: highestScore,
      queensCount: leader.queens.length
    };
  }

  static getWinRequirements(playerCount: number): {
    readonly queensRequired: number;
    readonly pointsRequired: number;
  } {
    return {
      queensRequired: playerCount <= 3 ? 5 : 4,
      pointsRequired: playerCount <= 3 ? 50 : 40
    };
  }

  static getPlayerWinProgress(player: Player, playerCount: number): {
    readonly queensNeeded: number;
    readonly pointsNeeded: number;
    readonly queensProgress: number;
    readonly pointsProgress: number;
  } {
    const requirements = this.getWinRequirements(playerCount);
    const currentScore = this.calculatePlayerScore(player.queens);

    const queensNeeded = Math.max(0, requirements.queensRequired - player.queens.length);
    const pointsNeeded = Math.max(0, requirements.pointsRequired - currentScore);

    return {
      queensNeeded,
      pointsNeeded,
      queensProgress: Math.min(1, player.queens.length / requirements.queensRequired),
      pointsProgress: Math.min(1, currentScore / requirements.pointsRequired)
    };
  }

  static getLeaderboard(players: ReadonlyArray<Player>): ReadonlyArray<{
    readonly player: Player;
    readonly score: number;
    readonly queensCount: number;
    readonly rank: number;
  }> {
    const playerScores = this.getAllPlayerScores(players);

    // Sort by score (descending), then by queens count (descending)
    const sorted = [...playerScores].sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.queensCount - a.queensCount;
    });

    // Add ranking
    return sorted.map((playerScore, index) => ({
      ...playerScore,
      rank: index + 1
    }));
  }
}