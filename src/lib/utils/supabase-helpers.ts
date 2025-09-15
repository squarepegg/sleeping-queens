import {RealtimeChannel} from '@supabase/supabase-js';

/**
 * Production-ready Supabase helper utilities
 */

/**
 * Subscribe to a channel with timeout protection
 */
export async function subscribeWithTimeout(
  channel: RealtimeChannel,
  timeoutMs: number = 5000
): Promise<boolean> {
  return Promise.race([
    new Promise<boolean>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          resolve(false);
        }
      });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        console.warn(`Channel subscription timeout after ${timeoutMs}ms`);
        resolve(false);
      }, timeoutMs);
    })
  ]);
}

/**
 * Safely broadcast a message with automatic cleanup
 */
export async function safeBroadcast(
  channel: RealtimeChannel,
  event: string,
  payload: any,
  timeoutMs: number = 5000
): Promise<boolean> {
  try {
    // Try to subscribe if not already subscribed
    const subscribed = await subscribeWithTimeout(channel, timeoutMs);
    if (!subscribed) {
      console.error('Failed to subscribe to channel for broadcast');
      return false;
    }

    // Send the broadcast
    const result = await channel.send({
      type: 'broadcast',
      event,
      payload
    });

    return result === 'ok';
  } catch (error) {
    console.error('Broadcast error:', error);
    return false;
  }
}

/**
 * Safely unsubscribe from a channel
 */
export async function safeUnsubscribe(channel: RealtimeChannel): Promise<void> {
  try {
    await channel.unsubscribe();
  } catch (error) {
    console.warn('Channel unsubscribe error (non-critical):', error);
  }
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Generate a UUID v4 (for proper database compatibility)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}