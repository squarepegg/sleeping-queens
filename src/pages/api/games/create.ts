import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {GameEngineAdapter as SleepingQueensGame} from '../../../application/adapters/GameEngineAdapter';
import {supabase} from '../../../lib/supabase';
import {apiLogger, withLogger} from '../../../lib/logger';

const logger = apiLogger.child({ endpoint: 'create' });

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
    const { maxPlayers = 5, username, userId } = req.body;

    if (!username || !userId) {
      log.warn({ username, userId }, 'Missing required fields');
      return res.status(400).json({ error: 'Username and userId are required' });
    }

    log.info({ userId, username, maxPlayers }, 'Creating new game');

    // Create new game
    const game = new SleepingQueensGame({ maxPlayers });
    
    // Add the host player immediately using UUID as ID
    const hostPlayer = {
      id: userId, // Use UUID from auth system
      name: username,
      isConnected: true,
      position: 0,
      hand: [],
      queens: [],
      score: 0
    };
    
    const playerAdded = game.addPlayer(hostPlayer);
    if (!playerAdded) {
      log.error({ userId, username }, 'Failed to add host player to game');
      return res.status(500).json({ error: 'Failed to add host player to game' });
    }
    
    const gameState = game.getState();

    // Save to database
    const { data, error } = await (supabase as any)
      .from('games')
      .insert({
        id: gameState.id,
        room_code: gameState.roomCode,
        state: gameState,
        max_players: maxPlayers,
        current_players: gameState.players.length,
      })
      .select()
      .single();

    if (error) {
      log.error({ error, gameId: gameState.id }, 'Database error creating game');
      return res.status(500).json({ error: 'Failed to create game' });
    }

    // Add the host player to the players table
    try {
      const { error: playerError } = await supabase.from('players').insert({
        game_id: gameState.id,
        user_id: userId, // Use the actual userId
        name: username,
        position: 0, // Host is always position 0
      } as any);

      if (playerError) {
        log.warn({ error: playerError, gameId: gameState.id }, 'Player tracking insert failed');
      }
    } catch (err) {
      log.warn({ error: err, gameId: gameState.id }, 'Player tracking failed (non-critical)');
    }

    // No need to broadcast here since only the creator is in the game
    // They will subscribe to updates when they navigate to the game page
    
    log.info({
      gameId: gameState.id,
      roomCode: gameState.roomCode,
      hostId: userId,
      playerCount: gameState.players.length
    }, 'Game created successfully');

    res.status(201).json({
      gameId: gameState.id,
      roomCode: gameState.roomCode,
      gameState,
    });
  } catch (error) {
    log.error({ error, userId, username }, 'Create game error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);