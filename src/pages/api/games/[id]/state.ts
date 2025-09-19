import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '../../../../lib/supabase';
import {apiLogger, withLogger} from '../../../../lib/logger';

const logger = apiLogger.child({ endpoint: 'state' });

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

    if (!gameId || typeof gameId !== 'string') {
      log.warn({ gameId }, 'Invalid game ID');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    log.info({ gameId }, 'Fetching game state')

    // Get game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      log.warn({ gameId, error: gameError }, 'Game not found');
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get players info
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('position');

    if (playersError) {
      log.error({ error: playersError, gameId }, 'Players fetch error');
    }

    // Get recent moves for context
    const { data: movesData, error: movesError } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (movesError) {
      log.error({ error: movesError, gameId }, 'Moves fetch error');
    }

    log.debug({
      gameId,
      playerCount: playersData?.length || 0,
      recentMoveCount: movesData?.length || 0
    }, 'Game state retrieved');

    res.status(200).json({
      gameState: (gameData as any).state,
      players: playersData || [],
      recentMoves: movesData || [],
      metadata: {
        createdAt: (gameData as any).created_at,
        updatedAt: (gameData as any).updated_at,
        isActive: (gameData as any).is_active,
        roomCode: (gameData as any).room_code,
      },
    });
  } catch (error) {
    log.error({ error, gameId }, 'Get game state error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);