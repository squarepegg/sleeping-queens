// Domain service for core game logic
import {Player} from '../models/Player';
import {GameState} from '../models/GameState';
import {Queen} from '../models/Card';
import {MoveValidationResult} from '../models/GameMove';

export class GameLogicService {
  static calculatePlayerScore(player: Player): number {
    return player.queens.reduce((total, queen) => total + queen.points, 0);
  }

  static checkWinCondition(gameState: GameState): Player | null {
    const playerCount = gameState.players.length;
    // Win conditions: 5 queens (2-3 players) or 4 queens (4+ players)
    // Or 50 points (2-3 players) or 40 points (4+ players)
    const queensRequired = playerCount <= 3 ? 5 : 4;
    const pointsRequired = playerCount <= 3 ? 50 : 40;

    for (const player of gameState.players) {
      const score = this.calculatePlayerScore(player);

      if (player.queens.length >= queensRequired || score >= pointsRequired) {
        return player;
      }
    }

    return null;
  }

  static getNextPlayerIndex(gameState: GameState): number {
    return (gameState.currentPlayerIndex + 1) % gameState.players.length;
  }

  static getCurrentPlayer(gameState: GameState): Player | null {
    if (gameState.players.length === 0) return null;
    return gameState.players[gameState.currentPlayerIndex] || null;
  }

  static getPlayerById(gameState: GameState, playerId: string): Player | null {
    return gameState.players.find(p => p.id === playerId) || null;
  }

  static canPlayerDrawCards(player: Player): boolean {
    const maxHandSize = 5; // Standard hand size
    return player.hand.length < maxHandSize;
  }

  static needsToDiscardCards(player: Player): boolean {
    const maxHandSize = 5; // Standard hand size
    return player.hand.length > maxHandSize;
  }

  static validateKingMove(gameState: GameState, playerId: string, targetQueen: Queen): MoveValidationResult {
    const player = this.getPlayerById(gameState, playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    if (this.getCurrentPlayer(gameState)?.id !== playerId) {
      return { isValid: false, error: 'Not your turn' };
    }

    // Check if player has a king
    const hasKing = player.hand.some(card => card.type === 'king');
    if (!hasKing) {
      return { isValid: false, error: 'No king card in hand' };
    }

    // Check if target queen is available
    const queenAvailable = gameState.sleepingQueens.some(q => q.id === targetQueen.id);
    if (!queenAvailable) {
      return { isValid: false, error: 'Queen not available' };
    }

    return { isValid: true };
  }
}