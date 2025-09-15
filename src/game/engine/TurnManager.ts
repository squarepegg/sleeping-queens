import { GameState, Player } from '../types';

/**
 * Service for managing turn advancement and timing in the game.
 * Extracted from SleepingQueensGame for better separation of concerns.
 */
export class TurnManager {
  private static instance: TurnManager;

  public static getInstance(): TurnManager {
    if (!TurnManager.instance) {
      TurnManager.instance = new TurnManager();
    }
    return TurnManager.instance;
  }

  /**
   * Initialize the first turn of the game
   */
  initializeTurns(gameState: GameState): void {
    if (gameState.players.length > 0) {
      gameState.currentPlayerId = gameState.players[0].id;
      gameState.currentPlayerIndex = 0; // Keep for backward compatibility
      gameState.updatedAt = Date.now();
    }
  }

  /**
   * Advance to the next player's turn
   */
  advanceTurn(gameState: GameState): void {
    const currentPlayerIndex = gameState.players.findIndex(
      p => p.id === gameState.currentPlayerId
    );
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    
    gameState.currentPlayerIndex = nextPlayerIndex; // Keep for backward compatibility
    gameState.currentPlayerId = gameState.players[nextPlayerIndex]?.id || null;
    gameState.updatedAt = Date.now();
  }

  /**
   * Get the current turn player
   */
  getCurrentTurnPlayer(gameState: GameState): Player | null {
    if (!gameState.currentPlayerId) return null;
    return gameState.players.find(p => p.id === gameState.currentPlayerId) || null;
  }

  /**
   * Check if it's a specific player's turn
   */
  isPlayerTurn(gameState: GameState, playerId: string): boolean {
    return gameState.currentPlayerId === playerId;
  }

  /**
   * Get the next player in turn order
   */
  getNextPlayer(gameState: GameState): Player | null {
    const currentPlayerIndex = gameState.players.findIndex(
      p => p.id === gameState.currentPlayerId
    );
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    return gameState.players[nextPlayerIndex] || null;
  }

  /**
   * Get a player at a specific offset from the current player
   * Used for jester number card resolution
   */
  getPlayerAtOffset(gameState: GameState, offset: number): Player | null {
    const currentPlayerIndex = gameState.players.findIndex(
      p => p.id === gameState.currentPlayerId
    );
    
    if (currentPlayerIndex === -1) return null;
    
    const targetPlayerIndex = (currentPlayerIndex + offset - 1) % gameState.players.length;
    return gameState.players[targetPlayerIndex] || null;
  }

  /**
   * Set a specific player as the current turn player
   */
  setCurrentPlayer(gameState: GameState, playerId: string): boolean {
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) return false;
    
    gameState.currentPlayerId = playerId;
    gameState.currentPlayerIndex = playerIndex;
    gameState.updatedAt = Date.now();
    
    return true;
  }

  /**
   * Check if all players are present and ready for turns
   */
  isValidTurnState(gameState: GameState): boolean {
    return gameState.players.length > 0 && 
           gameState.currentPlayerId !== null &&
           gameState.phase === 'playing';
  }

  /**
   * Get turn order starting from current player
   */
  getTurnOrder(gameState: GameState): Player[] {
    const currentPlayerIndex = gameState.players.findIndex(
      p => p.id === gameState.currentPlayerId
    );
    
    if (currentPlayerIndex === -1) return gameState.players;
    
    const turnOrder = [];
    for (let i = 0; i < gameState.players.length; i++) {
      const index = (currentPlayerIndex + i) % gameState.players.length;
      turnOrder.push(gameState.players[index]);
    }
    
    return turnOrder;
  }
}

// Export singleton instance
export const turnManager = TurnManager.getInstance();