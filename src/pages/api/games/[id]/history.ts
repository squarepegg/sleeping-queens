import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { apiLogger, withLogger } from '@/lib/logger';
import { moveFormatter } from '@/services/MoveFormatter';

const logger = apiLogger.child({ endpoint: 'history' });

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
    const limit = parseInt(req.query.limit as string) || 50;

    if (!gameId || typeof gameId !== 'string') {
      log.warn({ gameId }, 'Invalid game ID');
      return res.status(400).json({ error: 'Game ID is required' });
    }

    log.info({ gameId, limit }, 'Fetching game history')

    // Get all moves for this game
    const { data: movesData, error: movesError } = await supabase
      .from('game_moves')
      .select(`
        id,
        player_id,
        move_data,
        created_at,
        players (
          name,
          user_id
        )
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (movesError) {
      log.error({ error: movesError, gameId }, 'Moves fetch error');
      return res.status(500).json({ error: 'Failed to fetch move history' });
    }

    console.log(`Found ${movesData?.length || 0} moves for game ${gameId}`);
    // Log all moves for debugging
    movesData?.forEach(move => {
      const moveData = move.move_data as any;
      console.log('Move found:', {
        type: moveData.type,
        playerId: move.player_id,
        message: moveData.message,
        playerInfo: move.players
      });
    });

    // Format the moves with player names
    const formattedMoves = (movesData || []).map(move => {
      const moveData = move.move_data as any;
      const playerInfo = move.players as any;

      // Debug system moves
      if (moveData.type === 'system' || moveData.type === 'system_message') {
        console.log('Processing system move:', { moveData, playerInfo });
      }

      // Extract the message from lastAction if it exists
      let message = 'Unknown action';
      let playerId = move.player_id;
      let playerName = playerInfo?.name || 'Unknown';

      if (moveData.type === 'system_message' || moveData.type === 'system') {
        // Handle system messages (like first player selection)
        message = moveData.lastAction?.message || moveData.message || 'System event';
        playerId = moveData.playerId || 'system';
        playerName = moveData.lastAction?.playerName || 'Game';
      } else if (moveData.lastAction?.message) {
        message = moveData.lastAction.message;
        playerName = moveData.lastAction?.playerName || playerInfo?.name || 'Unknown';
      } else if (moveData.type) {
        // Use centralized MoveFormatter for consistent formatting
        const players = [{ id: move.player_id, name: playerInfo?.name || 'Unknown' }];
        const formattedMessage = moveFormatter.formatMove(moveData, players);

        if (formattedMessage) {
          message = formattedMessage;
        } else {
          // Fallback to basic move type description
          switch (moveData.type) {
            case 'play_king':
              message = `${playerName} played a King to wake up a Queen`;
              break;
            case 'play_knight':
              message = `${playerName} played a Knight`;
              break;
            case 'play_potion':
              message = `${playerName} played a Sleeping Potion`;
              break;
            case 'play_dragon':
              message = `${playerName} played a Dragon`;
              break;
            case 'play_wand':
              message = `${playerName} played a Magic Wand`;
              break;
            case 'play_jester':
              message = `${playerName} played a Jester`;
              break;
            case 'play_math':
            case 'play_equation':
              message = `${playerName} played a math equation`;
              break;
            case 'discard':
              message = `${playerName} discarded cards`;
              break;
            default:
              message = `${playerName} made a move`;
          }
        }
      }

      return {
        id: move.id,
        playerId,
        playerName,
        message,
        timestamp: new Date(move.created_at).getTime(),
        moveType: moveData.type,
        cards: moveData.cards
      };
    });

    log.debug({ gameId, moveCount: formattedMoves.length }, 'History retrieved');

    res.status(200).json({
      moves: formattedMoves,
      count: formattedMoves.length,
      gameId
    });
  } catch (error) {
    log.error({ error, gameId }, 'Get move history error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withLogger(handler);