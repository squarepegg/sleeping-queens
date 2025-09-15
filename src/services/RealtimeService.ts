import {RealtimeChannel, RealtimeChannelSendResponse} from '@supabase/supabase-js';
import {supabase} from '../lib/supabase';
import {GameState} from '../domain/models/GameState';

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

    console.log(`[RealtimeService] Subscribing to game ${gameId}`);

    const channel = supabase
      .channel(`direct-game-${gameId}`)
      .on('broadcast', { event: 'game_update' }, ({ payload }) => {
        console.log('[RealtimeService] Received game_update:', payload);
        if (payload.gameState) {
          onGameUpdate(payload.gameState);
        }
      })
      .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
        console.log('[RealtimeService] Received player_joined:', payload);
        if (onPlayerJoined) {
          onPlayerJoined(payload);
        }
      })
      .subscribe((status) => {
        console.log(`[RealtimeService] Game ${gameId} subscription status:`, status);
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
      console.log(`[RealtimeService] Unsubscribing from game ${gameId}`);
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

    // If no existing channel, create a temporary one for broadcasting
    if (!channel) {
      console.log(`[RealtimeService] Creating temporary channel for broadcast to game ${gameId}`);
      channel = supabase.channel(`direct-game-${gameId}`);
    }

    try {
      console.log(`[RealtimeService] Broadcasting game update for ${gameId}`);
      const result: RealtimeChannelSendResponse = await channel.send({
        type: 'broadcast',
        event: 'game_update',
        payload: { gameState }
      });

      const success = result === 'ok';
      if (!success) {
        console.error('[RealtimeService] Failed to broadcast game update:', result);
      }

      // If we created a temporary channel, clean it up
      if (!this.channels.has(gameId)) {
        await channel.unsubscribe();
      }

      return success;
    } catch (error) {
      console.error('[RealtimeService] Error broadcasting game update:', error);

      // Clean up temporary channel on error
      if (!this.channels.has(gameId)) {
        try {
          await channel.unsubscribe();
        } catch (cleanupError) {
          console.error('[RealtimeService] Error cleaning up temporary channel:', cleanupError);
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
        console.error('[RealtimeService] Failed to broadcast player joined:', result);
      }
      return success;
    } catch (error) {
      console.error('[RealtimeService] Error broadcasting player joined:', error);
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
    console.log('[RealtimeService] Cleaning up all subscriptions');
    const unsubscribePromises = Array.from(this.channels.entries()).map(
      async ([gameId, channel]) => {
        try {
          await channel.unsubscribe();
        } catch (error) {
          console.error(`[RealtimeService] Error unsubscribing from ${gameId}:`, error);
        }
      }
    );

    await Promise.all(unsubscribePromises);
    this.channels.clear();
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