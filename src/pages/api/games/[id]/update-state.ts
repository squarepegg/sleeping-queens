import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '@/lib/supabase';
import {safeUnsubscribe, subscribeWithTimeout} from '@/lib/utils/supabase-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const { gameState } = req.body;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!gameState) {
      return res.status(400).json({ error: 'Game state is required' });
    }

    // Update game in database
    const { error: updateError } = await ((supabase
      .from('games') as any)
      .update({ 
        state: gameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId));

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to update game state' });
    }

    // Broadcast the updated game state to all connected clients
    const broadcastChannel = supabase.channel(`direct-game-${gameId}`);
    
    try {
      // Subscribe with timeout protection
      const subscribed = await subscribeWithTimeout(broadcastChannel, 3000);
      
      if (subscribed) {
        // Broadcast the game state update
        const result = await broadcastChannel.send({
          type: 'broadcast',
          event: 'game_update',
          payload: { 
            gameState,
            updateType: 'state_sync',
            timestamp: Date.now()
          }
        });
        
        if (result === 'ok') {
          console.log(`[Update State API] Successfully broadcast state update for game ${gameId}`);
        } else {
          console.warn('[Update State API] Broadcast may have failed, but state was updated');
        }
      } else {
        console.warn('[Update State API] Could not establish broadcast channel, but state was updated');
      }
    } catch (broadcastError) {
      console.error('[Update State API] Broadcast error (non-critical):', broadcastError);
      // Continue - the state update itself was successful
    } finally {
      // Always clean up the channel
      await safeUnsubscribe(broadcastChannel);
    }

    res.status(200).json({
      success: true,
      gameState,
    });
  } catch (error) {
    console.error('Update state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}