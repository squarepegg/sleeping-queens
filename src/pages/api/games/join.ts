import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {GameEngineAdapter as SleepingQueensGame} from '../../../application/adapters/GameEngineAdapter';
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
    const { roomCode, username, userId } = req.body;

    if (!roomCode || !username || !userId) {
      return res.status(400).json({ error: 'Room code, username and userId are required' });
    }

    // Find game by room code
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (gameError || !gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Type assertion for gameData
    const gameRecord = gameData as any;

    // Load game state
    const game = new SleepingQueensGame(gameRecord.state);

    // Check if player already in game by UUID
    const existingPlayer = game.getState().players.find(p => p.id === userId);
    if (existingPlayer) {
      return res.status(200).json({
        gameId: gameRecord.id,
        gameState: game.getState(),
        message: 'Player already in game',
      });
    }

    // Try to add player using UUID as ID
    const success = game.addPlayer({
      id: userId,  // Use UUID from auth system
      name: username,
      isConnected: true,
      position: game.getState().players.length, // Auto-assign position
      hand: [],
      queens: [],
      score: 0
    });

    if (!success) {
      return res.status(400).json({ error: 'Cannot join game (full or already started)' });
    }

    const newGameState = game.getState();

    // Update game in database
    const { error: updateError } = await ((supabase
      .from('games') as any)
      .update({ 
        state: newGameState,
        current_players: newGameState.players.length,
      })
      .eq('id', gameRecord.id));

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to join game' });
    }

    // Add player to players table with the actual userId
    try {
      const { error: playerError } = await supabase.from('players').insert({
        game_id: gameRecord.id,
        user_id: userId, // Use the actual userId passed in
        name: username,
        position: newGameState.players.length - 1,
      } as any);

      if (playerError) {
        // Log but don't fail - game state is source of truth
        console.warn('Player tracking insert failed:', playerError.message);
      }
    } catch (err) {
      console.warn('Player tracking failed (non-critical):', err);
    }

    // Broadcast the updated game state to all connected clients
    const broadcastChannel = supabase.channel(`direct-game-${gameRecord.id}`);
    
    try {
      // Subscribe with timeout protection
      const subscribed = await subscribeWithTimeout(broadcastChannel, 5000);
      
      if (subscribed) {
        // Broadcast the game state update
        const updateSent = await broadcastChannel.send({
          type: 'broadcast',
          event: 'game_update',
          payload: { gameState: newGameState }
        });
        
        // Also broadcast player joined event
        const joinSent = await broadcastChannel.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: { 
            playerId: username,
            playerName: username,
            gameId: gameRecord.id 
          }
        });
        
        if (updateSent === 'ok' && joinSent === 'ok') {
          console.log(`[Join API] Successfully broadcast updates for game ${gameRecord.id}`);
        } else {
          console.warn('[Join API] Broadcast may have failed, but join was successful');
        }
      } else {
        console.warn('[Join API] Could not establish broadcast channel, but join was successful');
      }
    } catch (broadcastError) {
      console.error('[Join API] Broadcast error (non-critical):', broadcastError);
      // Continue - the join itself was successful
    } finally {
      // Always clean up the channel
      await safeUnsubscribe(broadcastChannel);
    }

    res.status(200).json({
      gameId: gameRecord.id,
      gameState: newGameState,
    });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}