import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';
import {GameMove} from '../../domain/models/GameMove';

describe('Discard Pile UI Features', () => {
  test('should show last discarded card on top of discard pile', () => {
    const game = new GameEngineAdapter();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
    
    const state = game.getState();
    console.log('=== DISCARD PILE TEST ===');
    
    // Initially discard pile should be empty
    expect(state.discardPile).toHaveLength(0);
    
    // Give Alice specific cards to discard
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const discardCard = { id: 'test-number-7', type: 'number' as const, value: 7, name: '7' };
    alicePlayer.hand = [discardCard, ...alicePlayer.hand.slice(1)]; // Replace first card
    
    console.log('Alice original hand size:', alicePlayer.hand.length);
    console.log('Card to discard:', discardCard);
    
    // Alice discards the card
    const discardMove: GameMove = {
      type: 'discard',
      playerId: 'alice',
      cards: [discardCard],
      timestamp: Date.now()
    };
    
    const result = game.playMove(discardMove);
    console.log('Discard move result:', result);
    expect(result.isValid).toBe(true);
    
    const newState = game.getState();
    
    // Check discard pile
    console.log('Discard pile size:', newState.discardPile.length);
    console.log('Top card in discard pile:', newState.discardPile[newState.discardPile.length - 1]);
    
    expect(newState.discardPile).toHaveLength(1);
    expect(newState.discardPile[0].id).toBe('test-number-7');
    expect(newState.discardPile[0].value).toBe(7);
    
    // Alice should have drawn a replacement card
    const updatedAlice = newState.players.find((p: any) => p.id === 'alice');
    console.log('Alice new hand size:', updatedAlice.hand.length);
    expect(updatedAlice.hand).toHaveLength(5); // Should still have 5 cards
    expect(updatedAlice.hand.some((c: any) => c.id === 'test-number-7')).toBe(false); // Discarded card should be gone
  });

  test('should show multiple cards in discard pile with last card on top', () => {
    const game = new GameEngineAdapter();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
    
    const state = game.getState();
    
    // Discard first card (Alice)
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const firstDiscard = { id: 'first-card', type: 'number' as const, value: 3, name: '3' };
    alicePlayer.hand[0] = firstDiscard;
    
    const firstDiscardMove: GameMove = {
      type: 'discard',
      playerId: 'alice',
      cards: [firstDiscard],
      timestamp: Date.now()
    };
    
    game.playMove(firstDiscardMove);
    
    // Discard second card (Bob's turn now)
    const newState = game.getState();
    const bobPlayer = newState.players.find((p: any) => p.id === 'bob');
    const secondDiscard = { id: 'second-card', type: 'king' as const, name: 'King' };
    bobPlayer.hand[0] = secondDiscard;
    
    const secondDiscardMove: GameMove = {
      type: 'discard',
      playerId: 'bob',
      cards: [secondDiscard],
      timestamp: Date.now()
    };
    
    game.playMove(secondDiscardMove);
    
    const finalState = game.getState();
    
    console.log('=== MULTIPLE DISCARDS TEST ===');
    console.log('Discard pile size:', finalState.discardPile.length);
    console.log('All discarded cards:', finalState.discardPile.map((c: any) => `${c.id}: ${c.name || c.value}`));
    console.log('Top card:', finalState.discardPile[finalState.discardPile.length - 1]);
    
    // Check discard pile has both cards
    expect(finalState.discardPile).toHaveLength(2);
    
    // First discarded card should be at index 0
    expect(finalState.discardPile[0].id).toBe('first-card');
    expect(finalState.discardPile[0].value).toBe(3);
    
    // Last discarded card should be at the top (last index)
    expect(finalState.discardPile[1].id).toBe('second-card');
    expect(finalState.discardPile[1].name).toBe('King');
    
    // UI should show the King (last discarded card) on top
    const topCard = finalState.discardPile[finalState.discardPile.length - 1];
    expect(topCard.type).toBe('king');
    expect(topCard.name).toBe('King');
  });

  test('should handle empty discard pile gracefully', () => {
    const game = new GameEngineAdapter();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
    
    const state = game.getState();
    
    console.log('=== EMPTY DISCARD PILE TEST ===');
    console.log('Initial discard pile size:', state.discardPile.length);
    
    // Discard pile should be empty at start
    expect(state.discardPile).toHaveLength(0);
    
    // UI should handle empty discard pile without crashing
    // (This would be tested in a UI component test, but here we verify the data structure)
    expect(Array.isArray(state.discardPile)).toBe(true);
  });
});