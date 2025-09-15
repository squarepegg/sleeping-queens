import {supabase} from '../supabase';
import {GameState} from '@/domain/models/GameState';
import {RealtimeChannel} from '@supabase/supabase-js';

export interface GameRecord {
  id: string;
  room_code: string;
  state: GameState;
  created_at: string;
  updated_at: string;
  host_id: string;
  max_players: number;
  current_players: number;
  status: 'waiting' | 'playing' | 'finished';
}

/**
 * GameRepository - Handles all database operations for games
 * Implements Repository pattern for data access
 */
export class GameRepository {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Create a new game in the database
   */
  async createGame(
    roomCode: string,
    hostId: string,
    maxPlayers: number,
    initialState: GameState
  ): Promise<GameRecord | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          room_code: roomCode,
          host_id: hostId,
          max_players: maxPlayers,
          current_players: 1,
          state: initialState,
          status: 'waiting' as const
        } as any)
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
        return null;
      }

      return data as GameRecord;
    } catch (error) {
      console.error('Exception creating game:', error);
      return null;
    }
  }

  /**
   * Get a game by ID
   */
  async getGameById(gameId: string): Promise<GameRecord | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) {
        console.error('Error fetching game:', error);
        return null;
      }

      return data as GameRecord;
    } catch (error) {
      console.error('Exception fetching game:', error);
      return null;
    }
  }

  /**
   * Get a game by room code
   */
  async getGameByRoomCode(roomCode: string): Promise<GameRecord | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (error) {
        console.error('Error fetching game by room code:', error);
        return null;
      }

      return data as GameRecord;
    } catch (error) {
      console.error('Exception fetching game by room code:', error);
      return null;
    }
  }

  /**
   * Update game state
   */
  async updateGameState(gameId: string, newState: GameState): Promise<boolean> {
    try {
      const { error } = await ((supabase
        .from('games') as any)
        .update({
          state: newState,
          updated_at: new Date().toISOString(),
          status: newState.phase === 'ended' ? 'finished' : 
                  newState.phase === 'waiting' ? 'waiting' : 'playing',
          current_players: newState.players.length
        })
        .eq('id', gameId));

      if (error) {
        console.error('Error updating game state:', error);
        return false;
      }

      // Broadcast the update to all subscribed clients
      await this.broadcastGameUpdate(gameId, newState);

      return true;
    } catch (error) {
      console.error('Exception updating game state:', error);
      return false;
    }
  }

  /**
   * Delete a game
   */
  async deleteGame(gameId: string): Promise<boolean> {
    try {
      // Unsubscribe from realtime updates first
      await this.unsubscribeFromGame(gameId);

      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId);

      if (error) {
        console.error('Error deleting game:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting game:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time game updates
   */
  async subscribeToGame(
    gameId: string,
    onUpdate: (gameState: GameState) => void
  ): Promise<RealtimeChannel> {
    // Unsubscribe from existing channel if any
    await this.unsubscribeFromGame(gameId);

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          if (payload.new && payload.new.state) {
            onUpdate(payload.new.state as GameState);
          }
        }
      )
      .subscribe();

    this.channels.set(gameId, channel);
    return channel;
  }

  /**
   * Unsubscribe from game updates
   */
  async unsubscribeFromGame(gameId: string): Promise<void> {
    const channel = this.channels.get(gameId);
    if (channel) {
      await supabase.removeChannel(channel);
      this.channels.delete(gameId);
    }
  }

  /**
   * Broadcast game update to all connected clients
   */
  private async broadcastGameUpdate(gameId: string, gameState: GameState): Promise<void> {
    try {
      const channel = supabase.channel(`game-broadcast-${gameId}`);
      
      await channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameState }
      });

      // Clean up the broadcast channel
      await supabase.removeChannel(channel);
    } catch (error) {
      console.error('Error broadcasting game update:', error);
    }
  }

  /**
   * Get all active games (for lobby)
   */
  async getActiveGames(): Promise<GameRecord[]> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .in('status', ['waiting', 'playing'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching active games:', error);
        return [];
      }

      return (data as GameRecord[]) || [];
    } catch (error) {
      console.error('Exception fetching active games:', error);
      return [];
    }
  }

  /**
   * Get games by player ID
   */
  async getGamesByPlayerId(playerId: string): Promise<GameRecord[]> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .contains('state->>players', [{ id: playerId }])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching games by player:', error);
        return [];
      }

      return (data as GameRecord[]) || [];
    } catch (error) {
      console.error('Exception fetching games by player:', error);
      return [];
    }
  }

  /**
   * Check if room code is available
   */
  async isRoomCodeAvailable(roomCode: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('room_code', roomCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      // If error or no data, room code is available
      return !data;
    } catch (error) {
      // Room code is available if query fails
      return true;
    }
  }

  /**
   * Generate a unique room code
   */
  async generateUniqueRoomCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      if (await this.isRoomCodeAvailable(code)) {
        return code;
      }

      attempts++;
    }

    // Fallback: use timestamp-based code
    return 'G' + Date.now().toString(36).toUpperCase().slice(-5);
  }

  /**
   * Clean up old/abandoned games
   */
  async cleanupOldGames(hoursOld: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('games')
        .delete()
        .lt('updated_at', cutoffTime)
        .in('status', ['waiting', 'playing'])
        .select('id');

      if (error) {
        console.error('Error cleaning up old games:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Exception cleaning up old games:', error);
      return 0;
    }
  }

  /**
   * Dispose of all subscriptions
   */
  async dispose(): Promise<void> {
    for (const [gameId, channel] of this.channels) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();
  }
}