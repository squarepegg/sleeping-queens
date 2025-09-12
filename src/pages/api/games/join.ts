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
    const { roomCode, username, userId } = req.body;

    if (!roomCode || !username || !userId) {
      return res.status(400).json({ error: 'Room code, username, and user ID are required' });
    }

    // Find game by room code
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (gameError || !gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Load game state
    const game = new SleepingQueensGame((gameData as any).state);

    // Check if player already in game
    const existingPlayer = game.getState().players.find(p => p.name === username);
    if (existingPlayer) {
      return res.status(200).json({
        gameId: gameData.id,
        gameState: game.getState(),
        message: 'Player already in game',
      });
    }

    // Try to add player
    const success = game.addPlayer({
      id: userId,
      name: username,
      isConnected: true,
    });

    if (!success) {
      return res.status(400).json({ error: 'Cannot join game (full or already started)' });
    }

    const newGameState = game.getState();

    // Update game in database
    const { error: updateError } = await supabase
      .from('games')
      .update({ 
        state: newGameState,
        current_players: newGameState.players.length,
      })
      .eq('id', gameData.id);

    if (updateError) {
      console.error('Database error:', updateError);
      return res.status(500).json({ error: 'Failed to join game' });
    }

    // Add player to players table
    const { error: playerError } = await supabase.from('players').insert({
      game_id: gameData.id,
      user_id: userId,
      name: username,
      position: newGameState.players.length - 1,
    });

    if (playerError) {
      console.error('Player insert error:', playerError);
      // Continue anyway, as the game state is already updated
    }

    res.status(200).json({
      gameId: gameData.id,
      gameState: newGameState,
    });
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}