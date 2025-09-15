import { GameMove, GameState, MoveValidationResult } from '../game/types';

/**
 * Centralized service for all game-related API calls.
 * Removes API logic from UI components and provides consistent error handling.
 */
export class GameApiService {
  private static instance: GameApiService;

  public static getInstance(): GameApiService {
    if (!GameApiService.instance) {
      GameApiService.instance = new GameApiService();
    }
    return GameApiService.instance;
  }

  /**
   * Create a new game
   */
  async createGame(username: string, userId: string, maxPlayers: number = 4): Promise<{ id: string; roomCode: string; gameState: GameState } | null> {
    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, userId, maxPlayers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        id: result.gameId,
        roomCode: result.roomCode,
        gameState: result.gameState
      };
    } catch (error) {
      console.error('Failed to create game:', error);
      return null;
    }
  }

  /**
   * Submit a move to the game server
   */
  async submitMove(gameId: string, move: GameMove): Promise<MoveValidationResult> {
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(move),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to submit move:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to submit move'
      };
    }
  }

  /**
   * Join a game by room code
   */
  async joinGameByRoomCode(roomCode: string, username: string, userId: string): Promise<{ gameId: string; gameState: GameState } | null> {
    try {
      const response = await fetch('/api/games/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode, username, userId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to join game:', error);
      return null;
    }
  }

  /**
   * Get current game state from server
   */
  async getGameState(gameId: string): Promise<GameState | null> {
    try {
      const response = await fetch(`/api/games/${gameId}/state`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch game state: ${response.status}`);
      }

      const data = await response.json();
      return data.gameState || null;
    } catch (error) {
      console.error('Failed to fetch game state:', error);
      return null;
    }
  }

  /**
   * Get player-specific view of the game state
   * This ensures each player only sees their own hand
   */
  async getPlayerGameView(gameId: string, playerId: string): Promise<GameState | null> {
    try {
      const response = await fetch(`/api/games/${gameId}/player-view?playerId=${playerId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player game view: ${response.status}`);
      }

      const data = await response.json();
      return data.gameState || null;
    } catch (error) {
      console.error('Failed to fetch player game view:', error);
      return null;
    }
  }

  /**
   * Submit a blocking move (dragon or wand)
   */
  async submitBlockingMove(gameId: string, move: GameMove): Promise<MoveValidationResult> {
    // Reuse the same submitMove logic since blocking moves are just special moves
    return this.submitMove(gameId, move);
  }

  /**
   * Allow an attack (when user chooses not to block)
   */
  async allowAttack(gameId: string, attackType: 'knight' | 'potion'): Promise<MoveValidationResult> {
    try {
      const response = await fetch(`/api/games/${gameId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'allow_attack',
          attackType,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to allow attack:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to allow attack'
      };
    }
  }

  /**
   * Generic API call helper for consistent error handling
   */
  private async makeApiCall<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        return {
          data: null,
          error: errorData.error || `HTTP error! status: ${response.status}`
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

// Export singleton instance for easy use
export const gameApiService = GameApiService.getInstance();