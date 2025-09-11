import type { NextApiRequest, NextApiResponse } from 'next';
import { SleepingQueensGame } from '../../../game/game';
import { supabase } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { maxPlayers = 5, username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Create new game
    const game = new SleepingQueensGame({ maxPlayers });
    const gameState = game.getState();

    // Save to database
    const { data, error } = await supabase
      .from('games')
      .insert({
        id: gameState.id,
        room_code: gameState.roomCode,
        state: gameState,
        max_players: maxPlayers,
        current_players: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to create game' });
    }

    res.status(201).json({
      gameId: gameState.id,
      roomCode: gameState.roomCode,
      gameState,
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}