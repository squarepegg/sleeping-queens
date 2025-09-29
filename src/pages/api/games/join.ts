import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {GameEngineAdapter as SleepingQueensGame} from '../../../application/adapters/GameEngineAdapter';
import {supabase} from '@/lib/supabase';
import {safeUnsubscribe, subscribeWithTimeout} from '@/lib/utils/supabase-helpers';
import {apiLogger, withLogger} from '@/lib/logger';
import {realtimeService} from '@/services/RealtimeService';

const logger = apiLogger.child({ endpoint: 'join' });

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
    const { roomCode, username, userId } = req.body;

    if (!roomCode || !username || !userId) {
      log.warn({ roomCode, username, userId }, 'Missing required fields');
      return res.status(400).json({ error: 'Room code, username and userId are required' });
    }

    log.info({ roomCode: roomCode.toUpperCase(), username, userId }, 'Player joining game');

    // Find game by room code
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single();

    if (gameError || !gameData) {
      log.warn({ roomCode: roomCode.toUpperCase(), error: gameError }, 'Game not found');
      return res.status(404).json({ error: 'Game not found' });
    }

    // Type assertion for gameData
    const gameRecord = gameData as any;

    // Load game state
    const game = new SleepingQueensGame(gameRecord.state);

    // Check if player already in game by UUID
    const existingPlayer = game.getState().players.find(p => p.id === userId);
    if (existingPlayer) {
      log.info({ gameId: gameRecord.id, userId }, 'Player already in game');
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
      log.warn({ gameId: gameRecord.id, userId, playerCount: game.getState().players.length }, 'Cannot join game (full or already started)');
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
      log.error({ error: updateError, gameId: gameRecord.id }, 'Database error updating game');
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
        log.warn({ error: playerError, gameId: gameRecord.id, userId }, 'Player tracking insert failed');
      }
    } catch (err) {
      log.warn({ error: err, gameId: gameRecord.id }, 'Player tracking failed (non-critical)');
    }

    // Broadcast the updated game state to all connected clients
    // Use the RealtimeService for more reliable broadcasting
    try {
      // First broadcast the game state update
      const updateSuccess = await realtimeService.broadcastGameUpdate(gameRecord.id, newGameState);

      if (updateSuccess) {
        log.debug({ gameId: gameRecord.id }, 'Successfully broadcast game update');
      } else {
        log.warn({ gameId: gameRecord.id }, 'Game update broadcast may have failed, but join was successful');
      }

      // Also send player joined notification
      // Create a temporary channel for the player_joined event
      const notifyChannel = supabase.channel(`direct-game-${gameRecord.id}`);
      const subscribed = await subscribeWithTimeout(notifyChannel, 2000);

      if (subscribed) {
        const joinSent = await notifyChannel.send({
          type: 'broadcast',
          event: 'player_joined',
          payload: {
            playerId: userId,  // Use the actual userId
            playerName: username,
            gameId: gameRecord.id
          }
        });

        if (joinSent === 'ok') {
          log.debug({ gameId: gameRecord.id }, 'Successfully broadcast player_joined event');
        }

        // Give the broadcast a moment to propagate
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up the notification channel
      await safeUnsubscribe(notifyChannel);

    } catch (broadcastError) {
      log.error({ error: broadcastError, gameId: gameRecord.id }, 'Broadcast error (non-critical)');
      // Continue - the join itself was successful
    }

    log.info({
      gameId: gameRecord.id,
      userId,
      username,
      playerCount: newGameState.players.length
    }, 'Player joined successfully');

    res.status(200).json({
      gameId: gameRecord.id,
      gameState: newGameState,
    });
  } catch (error) {
    log.error({ error }, 'Join game error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);