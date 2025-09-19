import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {GameEngineAdapter as SleepingQueensGame} from '../../../../application/adapters/GameEngineAdapter';
import {GameMove} from '../../../../domain/models/GameMove';
import {supabase} from '../../../../lib/supabase';
import {safeUnsubscribe, subscribeWithTimeout} from '../../../../lib/utils/supabase-helpers';
import {apiLogger, withLogger} from '../../../../lib/logger';

// Create endpoint-specific logger
const logger = apiLogger.child({ endpoint: 'move' });

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Move endpoint - handles all game moves including Jester queen selection
  // Force recompilation: v3
  const log = (req as any).log || logger;

  if (req.method !== 'POST') {
    log.warn({ method: req.method }, 'Invalid HTTP method');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const move: GameMove = req.body;

    if (!gameId || typeof gameId !== 'string') {
      log.warn('Missing or invalid game ID');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!move || !move.playerId || !move.type) {
      log.warn({ move }, 'Invalid move data');
      return res.status(400).json({ error: 'Invalid move data' });
    }

    log.info({
      gameId,
      playerId: move.playerId,
      moveType: move.type,
      cards: move.cards?.length || 0,
    }, 'Processing move');

    // Get current game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('is_active', true)
      .single();

    if (gameError || !gameData) {
      log.error({ gameId, error: gameError }, 'Game not found');
      return res.status(404).json({ error: 'Game not found' });
    }

    // Check if game is already finished
    if ((gameData as any).state?.winner) {
      log.warn({
        gameId,
        winner: (gameData as any).state.winner,
        attemptedMove: move.type
      }, 'Rejecting move - game already finished');
      return res.status(400).json({
        error: 'Game has already ended',
        winner: (gameData as any).state.winner
      });
    }

    // Ensure move has a unique ID (required for idempotency)
    if (!move.moveId) {
      log.error({ gameId, moveType: move.type }, 'Move missing required moveId');
      return res.status(400).json({ error: 'Move must include a unique moveId for idempotency' });
    }

    // Check for duplicate move (idempotency)
    if ((gameData as any).state.lastMoveId === move.moveId) {
      log.info({ moveId: move.moveId, gameId }, 'Duplicate move detected, returning current state');
      return res.status(200).json({
        isValid: true,
        gameState: (gameData as any).state,
        duplicate: true
      });
    }

    // Load game engine
    const game = new SleepingQueensGame((gameData as any).state);

    // Validate and execute move
    const result = game.playMove(move);

    if (!result.isValid) {
      log.warn({
        gameId,
        playerId: move.playerId,
        moveType: move.type,
        error: result.error
      }, 'Invalid move');
      return res.status(400).json({
        error: result.error,
        isValid: false
      });
    }

    const newGameState = game.getState();

    // Create a new state object with updated version and tracking info
    const updatedGameState = {
      ...newGameState,
      version: ((gameData as any).state.version || 0) + 1,
      lastMoveId: move.moveId,
      lastMoveBy: move.playerId
    };

    // Update game in database
    const { error: updateError } = await (supabase as any)
      .from('games')
      .update({
        state: updatedGameState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    if (updateError) {
      log.error({ gameId, error: updateError }, 'Database update error');
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
      // Include lastAction in the move data for history
      const moveDataWithAction = {
        ...move,
        lastAction: updatedGameState.lastAction
      };

      // Check if move was already processed (idempotency)
      const { data: existingMove } = await (supabase as any)
        .from('game_moves')
        .select('id')
        .eq('game_id', gameId)
        .eq('move_id', move.moveId)
        .single();

      if (existingMove) {
        log.debug({ gameId, moveId: move.moveId }, 'Move already processed (idempotent)');
      } else {
        const { error: moveError } = await (supabase as any).from('game_moves').insert({
          game_id: gameId,
          player_id: (playerExists as any).id,
          move_id: move.moveId,
          move_data: moveDataWithAction,
        });

        if (moveError) {
          log.error({ gameId, error: moveError }, 'Move logging error');
          // Continue anyway, as the main game state is saved
        }
      }
    } else {
      log.warn({ gameId, playerId: move.playerId }, 'Player not found in players table, skipping move logging');
    }

    // Broadcast the updated game state to all connected clients
    const broadcastChannel = supabase.channel(`direct-game-${gameId}`);
    
    try {
      // Subscribe with timeout protection
      const subscribed = await subscribeWithTimeout(broadcastChannel, 3000);
      
      if (subscribed) {
        // Broadcast the updated game state (with version and lastAction)
        const result = await broadcastChannel.send({
          type: 'broadcast',
          event: 'game_update',
          payload: {
            gameState: updatedGameState,
            movePlayerId: move.playerId,
            moveType: move.type,
            timestamp: Date.now()
          }
        });
        
        if (result === 'ok') {
          log.debug({ gameId }, 'Successfully broadcast move');
        } else {
          log.warn({ gameId, result }, 'Broadcast may have failed, but move was processed');
        }
      } else {
        log.warn({ gameId }, 'Could not establish broadcast channel, but move was processed');
      }
    } catch (broadcastError) {
      log.error({ gameId, error: broadcastError }, 'Broadcast error (non-critical)');
      // Continue - the move itself was successful
    } finally {
      // Always clean up the channel
      await safeUnsubscribe(broadcastChannel);
    }

    log.info({
      gameId,
      playerId: move.playerId,
      moveType: move.type,
      winner: updatedGameState.winner,
      version: updatedGameState.version
    }, 'Move completed successfully');

    res.status(200).json({
      isValid: true,
      gameState: updatedGameState,
    });
  } catch (error) {
    log.error({ gameId: req.query.id, move: req.body, error }, 'Move execution error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Export with logging middleware
export default withLogger(handler);