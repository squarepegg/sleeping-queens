import {GameState} from '../../domain/models/GameState';
import {Player} from '../../domain/models/Player';

/**
 * Filters game state to only show information that should be visible to a specific player.
 * Other players' hands are hidden for security.
 */
export function filterGameStateForPlayer(gameState: GameState, playerId: string): GameState {
  // Create a deep copy of the game state
  const filteredState = JSON.parse(JSON.stringify(gameState));
  
  // Hide other players' hands but preserve the count
  filteredState.players = filteredState.players.map((player: Player) => {
    if (player.id !== playerId) {
      // Hide the actual cards but preserve the hand count
      // Create placeholder cards to maintain the count
      const handCount = player.hand?.length || 0;
      const placeholderHand = Array(handCount).fill(null).map((_, index) => ({
        id: `hidden-${player.id}-${index}`,
        type: 'hidden',
        name: 'Hidden Card'
      }));

      return {
        ...player,
        hand: placeholderHand // Placeholder cards to maintain count
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