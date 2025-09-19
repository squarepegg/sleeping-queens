import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';
import {GameMove} from '../../domain/models/GameMove';

describe('Debug Game Flow', () => {
  test('should demonstrate complete king move flow', () => {
    const game = new GameEngineAdapter({ testMode: true });
    
    // Add players
    game.addPlayer({ id: 'player1', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'player2', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    const startResult = game.startGame();
    expect(startResult).toBe(true);
    
    const state = game.getState();
    console.log('=== GAME STARTED ===');
    console.log('Phase:', state.phase);
    console.log('Players:', state.players.map((p: any) => ({
      name: p.name,
      handSize: p.hand.length,
      hasKing: p.hand.some((c: any) => c.type === 'king'),
      cardTypes: p.hand.map((c: any) => c.type)
    })));
    
    const currentPlayer = state.players[state.currentPlayerIndex];
    console.log('Current player:', currentPlayer.name);
    
    // Give them a king to test with
    const kingCard = { id: 'test-king', type: 'king' as const, name: 'King' };
    currentPlayer.hand.push(kingCard);
    
    const targetQueen = state.sleepingQueens[0];
    console.log('Target queen:', targetQueen.name, 'Points:', targetQueen.points);
    
    // Create move
    const move: GameMove = {
      type: 'play_king',
      playerId: currentPlayer.id,
      cards: [kingCard],
      targetCard: targetQueen,
      timestamp: Date.now()
    };
    
    console.log('=== ATTEMPTING MOVE ===');
    console.log('Move:', move);
    
    // Play the move
    const result = game.playMove(move);
    console.log('Move result:', result);
    
    if (result.isValid) {
      const newState = game.getState();
      const updatedPlayer = newState.players.find((p: any) => p.id === currentPlayer.id);
      
      console.log('=== MOVE SUCCESS ===');
      console.log('Player queens:', updatedPlayer.queens.map((q: any) => q.name));
      console.log('Player score:', updatedPlayer.score);
      console.log('Player hand size:', updatedPlayer.hand.length);
      console.log('Turn advanced to:', newState.players[newState.currentPlayerIndex].name);
      console.log('Sleeping queens remaining:', newState.sleepingQueens.length);
      
      // Verify the move worked correctly
      expect(updatedPlayer.queens).toHaveLength(1);
      expect(updatedPlayer.queens[0].name).toBe(targetQueen.name);
      expect(updatedPlayer.score).toBe(targetQueen.points);
      expect(newState.currentPlayerIndex).toBe(1); // Should advance to next player
    } else {
      console.log('=== MOVE FAILED ===');
      console.log('Error:', result.error);
    }
    
    expect(result.isValid).toBe(true);
  });
});