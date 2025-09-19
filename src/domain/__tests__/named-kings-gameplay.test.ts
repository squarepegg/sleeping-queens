import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';
import {GameMove} from '../../domain/models/GameMove';

describe('Named Kings in Gameplay', () => {
  test('should show named King when discarded', () => {
    const game = new GameEngineAdapter({ testMode: true });
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
    
    const state = game.getState();
    console.log('=== NAMED KING DISCARD TEST ===');
    
    // Give Alice a specific named King
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const cookieKing = { 
      id: 'king-3', 
      type: 'king' as const, 
      name: 'Cookie King',
      description: 'Wake up a sleeping queen'
    };
    alicePlayer.hand[0] = cookieKing;
    
    console.log('Alice hand before discard:', alicePlayer.hand.slice(0, 2).map((c: any) => c.name || c.value));
    console.log('King to discard:', cookieKing.name);
    
    // Alice discards the Cookie King
    const discardMove: GameMove = {
      type: 'discard',
      playerId: 'alice',
      cards: [cookieKing],
      timestamp: Date.now()
    };
    
    const result = game.playMove(discardMove);
    console.log('Discard move result:', result);
    expect(result.isValid).toBe(true);
    
    const newState = game.getState();
    
    // Check discard pile shows the named King
    console.log('Discard pile size:', newState.discardPile.length);
    const topCard = newState.discardPile[newState.discardPile.length - 1];
    console.log('Top card in discard pile:', topCard);
    console.log('Top card name:', topCard.name);
    console.log('Top card type:', topCard.type);
    
    expect(newState.discardPile).toHaveLength(1);
    expect(topCard.id).toBe('king-3');
    expect(topCard.type).toBe('king');
    expect(topCard.name).toBe('Cookie King');
    
    // UI should show "Cookie King" not just "King"
    const displayName = topCard.name || topCard.type;
    expect(displayName).toBe('Cookie King');
  });

  test('should show different King names when multiple Kings discarded', () => {
    const game = new GameEngineAdapter({ testMode: true });
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
    
    const state = game.getState();
    
    // Give Alice the Fire King
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const fireKing = { 
      id: 'king-4', 
      type: 'king' as const, 
      name: 'Fire King',
      description: 'Wake up a sleeping queen'
    };
    alicePlayer.hand[0] = fireKing;
    
    // Alice discards Fire King
    const firstDiscardMove: GameMove = {
      type: 'discard',
      playerId: 'alice',
      cards: [fireKing],
      timestamp: Date.now()
    };
    
    game.playMove(firstDiscardMove);
    
    // Now it's Bob's turn - give him Turtle King
    const newState = game.getState();
    const bobPlayer = newState.players.find((p: any) => p.id === 'bob');
    const turtleKing = { 
      id: 'king-8', 
      type: 'king' as const, 
      name: 'Turtle King',
      description: 'Wake up a sleeping queen'
    };
    bobPlayer.hand[0] = turtleKing;
    
    // Bob discards Turtle King
    const secondDiscardMove: GameMove = {
      type: 'discard',
      playerId: 'bob',
      cards: [turtleKing],
      timestamp: Date.now()
    };
    
    game.playMove(secondDiscardMove);
    
    const finalState = game.getState();
    
    console.log('=== MULTIPLE NAMED KINGS TEST ===');
    console.log('Final discard pile size:', finalState.discardPile.length);
    console.log('All discarded cards:', finalState.discardPile.map((c: any) => `${c.name} (${c.id})`));
    
    // Should have both Kings in discard pile
    expect(finalState.discardPile).toHaveLength(2);
    
    // First King (Fire King) should be at bottom
    expect(finalState.discardPile[0].name).toBe('Fire King');
    expect(finalState.discardPile[0].id).toBe('king-4');
    
    // Last King (Turtle King) should be on top
    const topCard = finalState.discardPile[finalState.discardPile.length - 1];
    expect(topCard.name).toBe('Turtle King');
    expect(topCard.id).toBe('king-8');
    
    console.log('Top card (should show in UI):', topCard.name);
    
    // UI should show "Turtle King" as the last played card
    const displayName = topCard.name || topCard.type;
    expect(displayName).toBe('Turtle King');
  });
});