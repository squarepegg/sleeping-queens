import { GameState, Player } from '../types';
import { GAME_CONFIG, getCardPoints } from '../cards';

/**
 * Service for calculating scores and checking win conditions.
 * Extracted from utils and SleepingQueensGame for better separation of concerns.
 */
export class ScoreCalculator {
  private static instance: ScoreCalculator;

  public static getInstance(): ScoreCalculator {
    if (!ScoreCalculator.instance) {
      ScoreCalculator.instance = new ScoreCalculator();
    }
    return ScoreCalculator.instance;
  }

  /**
   * Calculate the total point value of a player's queens
   */
  calculatePlayerScore(player: Player): number {
    return player.queens.reduce((total, queen) => total + getCardPoints(queen), 0);
  }

  /**
   * Get score information for all players
   */
  getAllPlayerScores(gameState: GameState): Array<{
    player: Player;
    score: number;
    queensCount: number;
  }> {
    return gameState.players.map(player => ({
      player,
      score: this.calculatePlayerScore(player),
      queensCount: player.queens.length
    }));
  }

  /**
   * Check if any player has won the game
   */
  checkWinCondition(gameState: GameState): Player | null {
    const playerCount = gameState.players.length;
    const queensRequired = GAME_CONFIG.queensToWin[playerCount];
    const pointsRequired = GAME_CONFIG.pointsToWin[playerCount];
    
    if (!queensRequired || !pointsRequired) {
      console.warn(`No win conditions defined for ${playerCount} players`);
      return null;
    }

    for (const player of gameState.players) {
      const score = this.calculatePlayerScore(player);
      
      // Check both win conditions: required number of queens OR required points
      if (player.queens.length >= queensRequired || score >= pointsRequired) {
        return player;
      }
    }
    
    return null;
  }

  /**
   * Get the current leader (player with highest score)
   */
  getCurrentLeader(gameState: GameState): {
    player: Player;
    score: number;
    queensCount: number;
  } | null {
    if (gameState.players.length === 0) return null;

    let leader = gameState.players[0];
    let highestScore = this.calculatePlayerScore(leader);

    for (let i = 1; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      const score = this.calculatePlayerScore(player);
      
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

  /**
   * Get win requirements for current game
   */
  getWinRequirements(gameState: GameState): {
    queensRequired: number;
    pointsRequired: number;
  } {
    const playerCount = gameState.players.length;
    return {
      queensRequired: GAME_CONFIG.queensToWin[playerCount] || 5,
      pointsRequired: GAME_CONFIG.pointsToWin[playerCount] || 50
    };
  }

  /**
   * Check how close a player is to winning
   */
  getPlayerWinProgress(player: Player, gameState: GameState): {
    queensNeeded: number;
    pointsNeeded: number;
    queensProgress: number; // 0-1 percentage
    pointsProgress: number; // 0-1 percentage
  } {
    const requirements = this.getWinRequirements(gameState);
    const currentScore = this.calculatePlayerScore(player);

    const queensNeeded = Math.max(0, requirements.queensRequired - player.queens.length);
    const pointsNeeded = Math.max(0, requirements.pointsRequired - currentScore);

    return {
      queensNeeded,
      pointsNeeded,
      queensProgress: Math.min(1, player.queens.length / requirements.queensRequired),
      pointsProgress: Math.min(1, currentScore / requirements.pointsRequired)
    };
  }

  /**
   * Check if the game should end and update game state
   */
  checkAndUpdateGameEnd(gameState: GameState): boolean {
    const winner = this.checkWinCondition(gameState);
    
    if (winner) {
      gameState.winner = winner.id;
      gameState.phase = 'ended';
      gameState.updatedAt = Date.now();
      return true;
    }
    
    return false;
  }

  /**
   * Get leaderboard sorted by score (highest first)
   */
  getLeaderboard(gameState: GameState): Array<{
    player: Player;
    score: number;
    queensCount: number;
    rank: number;
  }> {
    const playerScores = this.getAllPlayerScores(gameState);
    
    // Sort by score (descending), then by queens count (descending)
    playerScores.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return b.queensCount - a.queensCount;
    });

    // Add ranking
    return playerScores.map((playerScore, index) => ({
      ...playerScore,
      rank: index + 1
    }));
  }
}

// Export singleton instance
export const scoreCalculator = ScoreCalculator.getInstance();