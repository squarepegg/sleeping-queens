import {RealtimeChannel, RealtimeChannelSendResponse} from '@supabase/supabase-js';
import {supabase} from '@/lib/supabase';
import {GameState} from '@/domain/models/GameState';
import {wsLogger} from '@/lib/logger';

const logger = wsLogger.child({ service: 'RealtimeService' });

/**
 * Centralized service for managing Supabase realtime subscriptions.
 * Handles channel management, broadcasting, and subscription cleanup.
 */
export class RealtimeService {
  private static instance: RealtimeService;
  private channels: Map<string, RealtimeChannel> = new Map();

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  /**
   * Subscribe to game updates for a specific game
   */
  subscribeToGame(
    gameId: string,
    onGameUpdate: (gameState: GameState) => void,
    onPlayerJoined?: (payload: any) => void,
    onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  ): RealtimeChannel {
    // Clean up existing channel if it exists
    this.unsubscribeFromGame(gameId);

    logger.info({ gameId }, 'Subscribing to game');

    const channel = supabase
      .channel(`direct-game-${gameId}`)
      .on('broadcast', { event: 'game_update' }, ({ payload }) => {
        logger.debug({ gameId, payloadSize: JSON.stringify(payload).length }, 'Received game_update');
        if (payload.gameState) {
          onGameUpdate(payload.gameState);
        }
      })
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        logger.debug({ gameId, payload }, 'Received player_joined');
        if (onPlayerJoined) {
          onPlayerJoined(payload);
        }
      })
      .subscribe((status) => {
        logger.info({ gameId, status }, 'Subscription status changed');
        if (onConnectionChange) {
          switch (status) {
            case 'SUBSCRIBED':
              onConnectionChange('connected');
              break;
            case 'CHANNEL_ERROR':
              onConnectionChange('error');
              break;
            case 'TIMED_OUT':
              onConnectionChange('disconnected');
              break;
            case 'CLOSED':
              onConnectionChange('disconnected');
              break;
            default:
              onConnectionChange('connecting');
          }
        }
      });

    this.channels.set(gameId, channel);
    return channel;
  }

  /**
   * Unsubscribe from game updates
   */
  async unsubscribeFromGame(gameId: string): Promise<void> {
    const existingChannel = this.channels.get(gameId);
    if (existingChannel) {
      logger.info({ gameId }, 'Unsubscribing from game');
      await existingChannel.unsubscribe();
      this.channels.delete(gameId);
    }
  }

  /**
   * Broadcast game state update to all subscribers
   */
  async broadcastGameUpdate(gameId: string, gameState: GameState): Promise<boolean> {
    // Try to use existing channel first
    let channel = this.channels.get(gameId);
    let isTemporary = false;

    // If no existing channel, create a temporary one for broadcasting
    if (!channel) {
      logger.debug({ gameId }, 'Creating temporary channel for broadcast');
      channel = supabase.channel(`direct-game-${gameId}`);
      isTemporary = true;

      // Subscribe the temporary channel before sending
      await new Promise<void>((resolve) => {
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            resolve();
          }
        });

        // Timeout after 3 seconds
        setTimeout(() => resolve(), 3000);
      });
    }

    try {
      logger.debug({ gameId }, 'Broadcasting game update');
      const result: RealtimeChannelSendResponse = await channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameState }
      });

      const success = result === 'ok';
      if (!success) {
        logger.error({ gameId, result }, 'Failed to broadcast game update');
      }

      // If we created a temporary channel, clean it up after a delay
      if (isTemporary) {
        // Wait a bit to ensure the message is delivered
        setTimeout(async () => {
          try {
            await channel.unsubscribe();
          } catch (cleanupError) {
            logger.error({ error: cleanupError, gameId }, 'Error cleaning up temporary channel');
          }
        }, 500);
      }

      return success;
    } catch (error) {
      logger.error({ error, gameId }, 'Error broadcasting game update');

      // Clean up temporary channel on error
      if (isTemporary) {
        try {
          await channel.unsubscribe();
        } catch (cleanupError) {
          logger.error({ error: cleanupError, gameId }, 'Error cleaning up temporary channel');
        }
      }

      return false;
    }
  }

  /**
   * Broadcast player joined notification
   */
  async broadcastPlayerJoined(gameId: string, playerId: string): Promise<boolean> {
    // Create a temporary notification channel for this specific event
    const notifyChannel = supabase.channel(`game-notify-${gameId}`);
    
    try {
      const result = await notifyChannel.send({
        type: 'broadcast',
        event: 'player_joined',
        payload: { playerId, gameId }
      });

      // Clean up the temporary channel
      await notifyChannel.unsubscribe();

      const success = result === 'ok';
      if (!success) {
        logger.error({ gameId, playerId, result }, 'Failed to broadcast player joined');
      }
      return success;
    } catch (error) {
      logger.error({ error, gameId, playerId }, 'Error broadcasting player joined');
      // Ensure cleanup even on error
      await notifyChannel.unsubscribe().catch(() => {});
      return false;
    }
  }

  /**
   * Get active channel for a game (if exists)
   */
  getChannel(gameId: string): RealtimeChannel | undefined {
    return this.channels.get(gameId);
  }

  /**
   * Check if currently subscribed to a game
   */
  isSubscribed(gameId: string): boolean {
    return this.channels.has(gameId);
  }

  /**
   * Clean up all active subscriptions
   */
  async cleanup(): Promise<void> {
    logger.info({ channelCount: this.channels.size }, 'Cleaning up all subscriptions');
    const unsubscribePromises = Array.from(this.channels.entries()).map(
      async ([gameId, channel]) => {
        try {
          await channel.unsubscribe();
        } catch (error) {
          logger.error({ error, gameId }, 'Error unsubscribing from channel');
        }
      }
    );

    await Promise.all(unsubscribePromises);
    this.channels.clear();
  }

  /**
   * Subscribe to database changes for game moves
   */
  subscribeToGameMoves(
    gameId: string,
    onNewMove: (moveData: any, playerData: any) => void,
    onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void
  ): RealtimeChannel {
    const channelKey = `moves-${gameId}`;

    // Clean up existing channel if it exists
    const existingChannel = this.channels.get(channelKey);
    if (existingChannel) {
      existingChannel.unsubscribe();
      this.channels.delete(channelKey);
    }

    logger.info({ gameId }, 'Subscribing to game moves');

    const channel = supabase
      .channel(`game-moves-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`
        },
        async (payload) => {
          logger.debug({ gameId, payload }, 'New move received via realtime');

          // Fetch player info for this move
          const { data: playerData } = await supabase
            .from('players')
            .select('name, user_id')
            .eq('id', payload.new.player_id)
            .single();

          onNewMove(payload.new, playerData);
        }
      )
      .subscribe((status) => {
        logger.info({ gameId, status }, 'Move subscription status changed');
        if (onConnectionChange) {
          switch (status) {
            case 'SUBSCRIBED':
              onConnectionChange('connected');
              break;
            case 'CHANNEL_ERROR':
              onConnectionChange('error');
              break;
            case 'TIMED_OUT':
              onConnectionChange('disconnected');
              break;
            case 'CLOSED':
              onConnectionChange('disconnected');
              break;
            default:
              onConnectionChange('connecting');
          }
        }
      });

    this.channels.set(channelKey, channel);
    return channel;
  }

  /**
   * Unsubscribe from game move updates
   */
  async unsubscribeFromGameMoves(gameId: string): Promise<void> {
    const channelKey = `moves-${gameId}`;
    const existingChannel = this.channels.get(channelKey);
    if (existingChannel) {
      logger.info({ gameId }, 'Unsubscribing from game moves');
      await existingChannel.unsubscribe();
      this.channels.delete(channelKey);
    }
  }

  /**
   * Get status of all active subscriptions for debugging
   */
  getSubscriptionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.channels.forEach((channel, gameId) => {
      status[gameId] = true; // Channel exists and is active
    });
    return status;
  }
}

// Export singleton instance for easy use
export const realtimeService = RealtimeService.getInstance();