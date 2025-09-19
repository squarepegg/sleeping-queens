import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '@/lib/supabase';
import {safeUnsubscribe, subscribeWithTimeout} from '@/lib/utils/supabase-helpers';
import {apiLogger, withLogger} from '@/lib/logger';

const logger = apiLogger.child({ endpoint: 'update-state' });

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const log = (req as any).log || logger;
  if (req.method !== 'POST') {
    log.warn({ method: req.method }, 'Invalid HTTP method');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const { gameState } = req.body;

    if (!gameId || typeof gameId !== 'string') {
      log.warn({ gameId }, 'Invalid game ID');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!gameState) {
      log.warn({ gameId }, 'Missing game state');
      return res.status(400).json({ error: 'Game state is required' });
    }

    log.info({ gameId, version: gameState.version }, 'Updating game state')

    // Check if this is a game start (phase changing from 'waiting' to 'playing')
    const { data: oldGameData } = await supabase
      .from('games')
      .select('state')
      .eq('id', gameId)
      .single();

    const oldPhase = (oldGameData as any)?.state?.phase;
    const isGameStarting = oldPhase === 'waiting' && gameState.phase === 'playing';

    // Update game in database
    const { error: updateError } = await ((supabase
      .from('games') as any)
      .update({
        state: gameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId));

    if (updateError) {
      log.error({ error: updateError, gameId }, 'Database update error');
      return res.status(500).json({ error: 'Failed to update game state' });
    }

    // First player selection is now handled by log-first-player endpoint
    // This avoids duplicate entries in the move history

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
          log.debug({ gameId }, 'Successfully broadcast state update');
        } else {
          log.warn({ gameId, result }, 'Broadcast may have failed, but state was updated');
        }
      } else {
        log.warn({ gameId }, 'Could not establish broadcast channel, but state was updated');
      }
    } catch (broadcastError) {
      log.error({ error: broadcastError, gameId }, 'Broadcast error (non-critical)');
      // Continue - the state update itself was successful
    } finally {
      // Always clean up the channel
      await safeUnsubscribe(broadcastChannel);
    }

    log.info({ gameId, version: gameState.version }, 'State update successful');

    res.status(200).json({
      success: true,
      gameState,
    });
  } catch (error) {
    log.error({ error, gameId }, 'Update state error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);