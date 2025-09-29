import type {NextApiRequest, NextApiResponse} from 'next';
import {supabase} from '../../../../lib/supabase';
import {apiLogger, withLogger} from '../../../../lib/logger';

const logger = apiLogger.child({ endpoint: 'debug' });

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

    log.info({ gameId }, 'Fetching debug info')

    // Get the raw game state from database
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

    // Debug information
    const debugInfo = {
      gameId: gameId,
      roomCode: gameState.roomCode,
      sleepingQueensCount: gameState.sleepingQueens?.length || 0,
      sleepingQueens: gameState.sleepingQueens?.map((q: any) => ({
        id: q.id,
        name: q.name,
        points: q.points
      })) || [],
      playersCount: gameState.players?.length || 0,
      players: gameState.players?.map((p: any) => ({
        id: p.id,
        name: p.name,
        queensCount: p.queens?.length || 0
      })) || [],
      deckCount: gameState.deck?.length || 0,
      discardPileCount: gameState.discardPile?.length || 0,
      phase: gameState.phase,
      rawStateSize: JSON.stringify(gameState).length,
      rawQueensSize: JSON.stringify(gameState.sleepingQueens || []).length
    };

    log.debug({
      gameId,
      sleepingQueensCount: debugInfo.sleepingQueensCount,
      playersCount: debugInfo.playersCount,
      deckCount: debugInfo.deckCount,
      phase: debugInfo.phase
    }, 'Debug info retrieved');

    res.status(200).json(debugInfo);
  } catch (error) {
    log.error({ error }, 'Debug endpoint error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);