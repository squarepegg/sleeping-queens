import type {NextApiRequest, NextApiResponse} from 'next';
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {supabase} from '../../../../lib/supabase';
import {filterGameStateForPlayer} from '../../../../lib/utils/gameStateFilter';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id: gameId } = req.query;
    const { playerId } = req.query; // Pass playerId as query param

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ error: 'Game ID is required' });
    }

    if (!playerId || typeof playerId !== 'string') {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    // Get current game state
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const gameState = (gameData as any).state;
    
    // Check if player is in the game
    const playerInGame = gameState.players.find((p: any) => p.id === playerId);
    if (!playerInGame) {
      return res.status(403).json({ error: 'Player not in this game' });
    }

    // Filter the game state for this specific player
    const filteredGameState = filterGameStateForPlayer(gameState, playerId);

    res.status(200).json({
      gameState: filteredGameState,
      playerId: playerId,
      playerName: playerInGame.name
    });
  } catch (error) {
    console.error('Player view error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}