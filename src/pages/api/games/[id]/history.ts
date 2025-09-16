import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Get all moves for this game
    const { data: movesData, error: movesError } = await supabase
      .from('game_moves')
      .select(`
        id,
        player_id,
        move_data,
        created_at,
        players!inner (
          name,
          user_id
        )
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (movesError) {
      console.error('Moves fetch error:', movesError);
      return res.status(500).json({ error: 'Failed to fetch move history' });
    }

    // Format the moves with player names
    const formattedMoves = (movesData || []).map(move => {
      const moveData = move.move_data as any;

      // Extract the message from lastAction if it exists
      let message = 'Unknown action';
      if (moveData.lastAction?.message) {
        message = moveData.lastAction.message;
      } else if (moveData.type) {
        // Fallback to basic move type description
        const playerName = (move.players as any)?.name || 'Unknown';
        switch (moveData.type) {
          case 'play_king':
            message = `${playerName} played a King`;
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

      return {
        id: move.id,
        playerId: move.player_id,
        playerName: (move.players as any)?.name || 'Unknown',
        message,
        timestamp: new Date(move.created_at).getTime(),
        moveType: moveData.type,
        cards: moveData.cards
      };
    });

    res.status(200).json({
      moves: formattedMoves,
      count: formattedMoves.length,
      gameId
    });
  } catch (error) {
    console.error('Get move history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}