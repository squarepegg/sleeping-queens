import type { NextApiRequest, NextApiResponse } from 'next';
import { GameEngine as SleepingQueensGame } from '../../../../game/engine/GameEngine';
import { GameMove } from '../../../../game/types';
import { supabase } from '../../../../lib/supabase';
import { subscribeWithTimeout, safeUnsubscribe } from '../../../../lib/utils/supabase-helpers';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Move endpoint - handles all game moves including Jester queen selection
  // Force recompilation: v3
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const move: GameMove = req.body;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!move || !move.playerId || !move.type) {
      return res.status(400).json({ error: 'Invalid move data' });
    }

    // Get current game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('is_active', true)
      .single();

    if (gameError || !gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Load game engine
    const game = new SleepingQueensGame((gameData as any).state);

    // Check for duplicate move (idempotency)
    const moveId = `${move.playerId}-${move.timestamp}`;
    if ((gameData as any).state.lastMoveId === moveId) {
      console.log('[Move API] Duplicate move detected, returning current state');
      return res.status(200).json({
        isValid: true,
        gameState: (gameData as any).state,
        duplicate: true
      });
    }

    // Validate and execute move
    const result = game.playMove(move);

    if (!result.isValid) {
      return res.status(400).json({ 
        error: result.error,
        isValid: false 
      });
    }

    const newGameState = game.getState();
    
    // Update version and tracking info
    newGameState.version = ((gameData as any).state.version || 0) + 1;
    newGameState.lastMoveId = moveId;
    newGameState.lastMoveBy = move.playerId;

    // Update game in database
    const { error: updateError } = await (supabase as any)
      .from('games')
      .update({ 
        state: newGameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      console.error('Database update error:', updateError);
      return res.status(500).json({ error: 'Failed to save game state' });
    }

    // Log the move - first check if player exists in players table
    const { data: playerExists } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', gameId)
      .eq('user_id', move.playerId)
      .single();

    if (playerExists) {
      const { error: moveError } = await (supabase as any).from('game_moves').insert({
        game_id: gameId,
        player_id: (playerExists as any).id, // Use the actual player.id, not the user_id
        move_data: move,
      });

      if (moveError) {
        console.error('Move logging error:', moveError);
        // Continue anyway, as the main game state is saved
      }
    } else {
      console.warn('Player not found in players table, skipping move logging');
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
            gameState: newGameState,
            movePlayerId: move.playerId,
            moveType: move.type,
            timestamp: Date.now()
          }
        });
        
        if (result === 'ok') {
          console.log(`[Move API] Successfully broadcast move for game ${gameId}`);
        } else {
          console.warn('[Move API] Broadcast may have failed, but move was processed');
        }
      } else {
        console.warn('[Move API] Could not establish broadcast channel, but move was processed');
      }
    } catch (broadcastError) {
      console.error('[Move API] Broadcast error (non-critical):', broadcastError);
      // Continue - the move itself was successful
    } finally {
      // Always clean up the channel
      await safeUnsubscribe(broadcastChannel);
    }

    res.status(200).json({
      isValid: true,
      gameState: newGameState,
    });
  } catch (error) {
    console.error('Move execution error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}