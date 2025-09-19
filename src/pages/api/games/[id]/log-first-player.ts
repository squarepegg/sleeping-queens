import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { GameMove } from '@/domain/models/GameMove';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { firstPlayerId, playerName } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Game ID is required' });
  }

  if (!firstPlayerId || !playerName) {
    return res.status(400).json({ error: 'First player ID and name are required' });
  }

  try {
    console.log('Attempting to log first player selection:', { gameId: id, firstPlayerId, playerName });

    // Use a fixed UUID for system user (all zeros)
    const SYSTEM_USER_UUID = '00000000-0000-0000-0000-000000000000';

    // Create or get system player for this game
    const { data: systemPlayer, error: systemPlayerError } = await supabase
      .from('players')
      .select('id')
      .eq('game_id', id)
      .eq('user_id', SYSTEM_USER_UUID)
      .single();

    if (systemPlayerError && systemPlayerError.code !== 'PGRST116') {
      console.error('Error fetching system player:', systemPlayerError);
      return res.status(500).json({ error: 'Failed to fetch system player', details: systemPlayerError });
    }

    let systemPlayerId;
    if (!systemPlayer) {
      console.log('Creating new system player for game:', id);
      const { data: newSystemPlayer, error: createError } = await (supabase as any)
        .from('players')
        .insert({
          game_id: id,
          user_id: SYSTEM_USER_UUID,
          name: 'Game',
          position: -1
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating system player:', createError);
        return res.status(500).json({ error: 'Failed to create system player', details: createError });
      }

      systemPlayerId = newSystemPlayer?.id;
    } else {
      systemPlayerId = (systemPlayer as any).id;
    }

    if (!systemPlayerId) {
      return res.status(500).json({ error: 'Failed to create system player' });
    }

    // Create a system move for first player selection
    const systemMove: GameMove = {
      moveId: `system-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      playerId: 'system',
      timestamp: Date.now(),
      message: `${playerName} was randomly chosen to go first`,
      cards: []
    };

    console.log('Created system move:', systemMove);
    console.log('Using system player ID:', systemPlayerId);

    // Insert the move into game_moves table
    const { error: moveError } = await (supabase as any)
      .from('game_moves')
      .insert({
        game_id: id,
        move_id: systemMove.moveId,
        player_id: systemPlayerId,
        move_data: systemMove,
        created_at: new Date(systemMove.timestamp).toISOString()
      });

    if (moveError) {
      console.error('Error logging first player selection:', moveError);
      console.error('Move data:', { game_id: id, player_id: systemPlayerId, move_id: systemMove.moveId });
      return res.status(500).json({ error: 'Failed to log first player selection', details: moveError });
    }

    console.log('Successfully logged first player selection move');
    console.log('Move details:', {
      game_id: id,
      player_id: systemPlayerId,
      move_id: systemMove.moveId,
      message: systemMove.message
    });

    // Update the game state to set the first player
    const { data: gameData, error: fetchError } = await supabase
      .from('games')
      .select('state')
      .eq('id', id)
      .single();

    if (fetchError || !gameData) {
      console.error('Error fetching game state:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch game state' });
    }

    const updatedState = {
      ...gameData.state,
      currentPlayerId: firstPlayerId,
      firstPlayerSelected: true
    };

    const { error: updateError } = await supabase
      .from('games')
      .update({ state: updatedState })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating game state:', updateError);
      return res.status(500).json({ error: 'Failed to update game state' });
    }

    return res.status(200).json({ 
      success: true, 
      move: systemMove,
      message: 'First player selection logged successfully' 
    });
  } catch (error) {
    console.error('Unexpected error in log-first-player:', error);
    return res.status(500).json({ error: 'Internal server error', details: error });
  }
}