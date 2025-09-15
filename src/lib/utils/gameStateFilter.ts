import {GameState} from '../../domain/models/GameState';
import {Player} from '../../domain/models/Player';

/**
 * Filters game state to only show information that should be visible to a specific player.
 * Other players' hands are hidden for security.
 */
export function filterGameStateForPlayer(gameState: GameState, playerId: string): GameState {
  // Create a deep copy of the game state
  const filteredState = JSON.parse(JSON.stringify(gameState));
  
  // Hide other players' hands
  filteredState.players = filteredState.players.map((player: Player) => {
    if (player.id !== playerId) {
      // Hide the hand of other players
      return {
        ...player,
        hand: [] // Empty array to hide cards but maintain structure
      };
    }
    return player;
  });
  
  return filteredState;
}

/**
 * Get a player's view of the game - includes their hand but hides others'
 */
export function getPlayerGameView(gameState: GameState, playerId: string): {
  gameState: GameState;
  currentPlayer: Player | undefined;
  isCurrentTurn: boolean;
} {
  const filteredState = filterGameStateForPlayer(gameState, playerId);
  const currentPlayer = filteredState.players.find(p => p.id === playerId);
  const isCurrentTurn = filteredState.currentPlayerId === playerId;
  
  return {
    gameState: filteredState,
    currentPlayer,
    isCurrentTurn
  };
}