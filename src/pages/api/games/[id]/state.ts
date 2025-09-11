import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    // Get game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Get players info
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('position');

    if (playersError) {
      console.error('Players fetch error:', playersError);
    }

    // Get recent moves for context
    const { data: movesData, error: movesError } = await supabase
      .from('game_moves')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (movesError) {
      console.error('Moves fetch error:', movesError);
    }

    res.status(200).json({
      gameState: gameData.state,
      players: playersData || [],
      recentMoves: movesData || [],
      metadata: {
        createdAt: gameData.created_at,
        updatedAt: gameData.updated_at,
        isActive: gameData.is_active,
        roomCode: gameData.room_code,
      },
    });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}