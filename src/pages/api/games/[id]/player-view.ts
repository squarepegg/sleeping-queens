import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {supabase} from '../../../../lib/supabase';
import {filterGameStateForPlayer} from '../../../../lib/utils/gameStateFilter';
import {apiLogger, withLogger} from '../../../../lib/logger';

const logger = apiLogger.child({ endpoint: 'player-view' });

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const log = (req as any).log || logger;
  if (req.method !== 'GET') {
    log.warn({ method: req.method }, 'Invalid HTTP method');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const { playerId } = req.query; // Pass playerId as query param

    if (!gameId || typeof gameId !== 'string') {
      log.warn({ gameId }, 'Invalid game ID');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!playerId || typeof playerId !== 'string') {
      log.warn({ playerId }, 'Invalid player ID');
      return res.status(400).json({ error: 'Player ID is required' });
    }

    log.info({ gameId, playerId }, 'Fetching player view')

    // Get current game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      log.warn({ gameId, error: gameError }, 'Game not found');
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = (gameData as any).state;
    
    // Check if player is in the game
    const playerInGame = gameState.players.find((p: any) => p.id === playerId);
    if (!playerInGame) {
      log.warn({ gameId, playerId }, 'Player not in game');
      return res.status(403).json({ error: 'Player not in this game' });
    }

    // Filter the game state for this specific player
    const filteredGameState = filterGameStateForPlayer(gameState, playerId);

    log.debug({ gameId, playerId, playerName: playerInGame.name }, 'Player view retrieved');

    res.status(200).json({
      gameState: filteredGameState,
      playerId: playerId,
      playerName: playerInGame.name
    });
  } catch (error) {
    log.error({ error, gameId, playerId }, 'Player view error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);