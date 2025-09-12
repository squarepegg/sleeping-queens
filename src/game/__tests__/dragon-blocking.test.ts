import { SleepingQueensGame } from '../game';
import { GameMove } from '../types';

describe('Dragon Blocking Mechanism', () => {
  test('should allow Dragon to block Knight attack', () => {
    const game = new SleepingQueensGame();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1 });
    
    // Start game
    game.startGame();
    
    const state = (game as any).getInternalState();
    console.log('=== DRAGON BLOCKING TEST ===');
    
    // Clear hands to ensure deterministic setup
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const bobPlayer = state.players.find((p: any) => p.id === 'bob');
    alicePlayer.hand = [];
    bobPlayer.hand = [];
    bobPlayer.queens = [];
    bobPlayer.score = 0;
    
    // Give Alice (attacker) a Knight
    const knightCard = { id: 'test-knight', type: 'knight', name: 'Knight' };
    alicePlayer.hand.push(knightCard);
    
    // Give Bob (target) exactly one Dragon and a Queen to steal
    const dragonCard = { id: 'test-dragon', type: 'dragon', name: 'Dragon' };
    const testQueen = { 
      id: 'test-queen', 
      type: 'queen', 
      name: 'Test Queen', 
      points: 15, 
      isAwake: true 
    };
    bobPlayer.hand.push(dragonCard);
    bobPlayer.queens.push(testQueen);
    bobPlayer.score = 15;
    
    console.log('Alice hand:', alicePlayer.hand.map((c: any) => `${c.type}-${c.name || c.value}`));
    console.log('Bob hand:', bobPlayer.hand.map((c: any) => `${c.type}-${c.name || c.value}`));
    console.log('Bob queens:', bobPlayer.queens.map((q: any) => q.name));
    console.log('Bob score:', bobPlayer.score);
    
    // Alice attacks with Knight
    const knightMove: GameMove = {
      type: 'play_knight',
      playerId: 'alice',
      cards: [knightCard],
      targetCard: testQueen,
      targetPlayer: 'bob',
      timestamp: Date.now()
    };
    
    console.log('=== KNIGHT ATTACK ===');
    const knightResult = game.playMove(knightMove);
    console.log('Knight attack result:', knightResult);
    
    // Should create pending attack because Bob has Dragon
    expect(knightResult.isValid).toBe(true);
    expect(knightResult.requiresResponse).toBe(true);
    
    // Check pending attack exists
    const pendingAttack = game.getPendingKnightAttack();
    expect(pendingAttack).toBeTruthy();
    expect(pendingAttack.attacker).toBe('alice');
    expect(pendingAttack.target).toBe('bob');
    expect(pendingAttack.targetQueen.id).toBe('test-queen');
    
    // Bob can play Dragon
    expect(game.canPlayerPlayDragon('bob')).toBe(true);
    expect(game.canPlayerPlayDragon('alice')).toBe(false);
    
    console.log('=== BOB BLOCKS WITH DRAGON ===');
    const blockResult = game.blockKnightAttack('bob');
    console.log('Dragon block result:', blockResult);
    
    expect(blockResult.isValid).toBe(true);
    
    // Check attack was blocked
    expect(game.getPendingKnightAttack()).toBeUndefined();
    expect(game.canPlayerPlayDragon('bob')).toBe(false);
    
    // Verify Bob still has his queen
    const finalState = (game as any).getInternalState();
    const finalBob = finalState.players.find((p: any) => p.id === 'bob');
    const finalAlice = finalState.players.find((p: any) => p.id === 'alice');
    
    console.log('Final Bob queens:', finalBob.queens.map((q: any) => q.name));
    console.log('Final Alice queens:', finalAlice.queens.map((q: any) => q.name));
    console.log('Final Bob score:', finalBob.score);
    console.log('Final Alice score:', finalAlice.score);
    console.log('Final Bob hand after dragon block:', finalBob.hand.map((c: any) => `${c.type}-${c.name || c.value}`));
    console.log('Discard pile:', finalState.discardPile.map((c: any) => `${c.type}-${c.name || c.value}`));
    
    expect(finalBob.queens).toHaveLength(1);
    expect(finalBob.queens[0].name).toBe('Test Queen');
    expect(finalBob.score).toBe(15);
    expect(finalAlice.queens).toHaveLength(0);
    expect(finalAlice.score).toBe(0);
    
    // Dragon should be discarded
    expect(finalBob.hand.some((c: any) => c.type === 'dragon')).toBe(false);
  });

  test('should complete attack immediately when target has no Dragon', () => {
    const game = new SleepingQueensGame();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1 });
    
    // Start game
    game.startGame();
    
    const state = (game as any).getInternalState();
    
    // Clear hands to ensure deterministic setup
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const bobPlayer = state.players.find((p: any) => p.id === 'bob');
    alicePlayer.hand = [];
    bobPlayer.hand = []; // Ensure Bob has NO Dragons
    bobPlayer.queens = [];
    bobPlayer.score = 0;
    
    // Give Alice (attacker) a Knight
    const knightCard = { id: 'test-knight', type: 'knight', name: 'Knight' };
    alicePlayer.hand.push(knightCard);
    
    // Give Bob (target) a Queen but NO Dragon
    const testQueen = { 
      id: 'test-queen', 
      type: 'queen', 
      name: 'Test Queen', 
      points: 15, 
      isAwake: true 
    };
    bobPlayer.queens.push(testQueen);
    bobPlayer.score = 15;
    
    console.log('=== NO DRAGON TEST ===');
    console.log('Bob has Dragon?', bobPlayer.hand.some((c: any) => c.type === 'dragon'));
    
    // Alice attacks with Knight
    const knightMove: GameMove = {
      type: 'play_knight',
      playerId: 'alice',
      cards: [knightCard],
      targetCard: testQueen,
      targetPlayer: 'bob',
      timestamp: Date.now()
    };
    
    const knightResult = game.playMove(knightMove);
    console.log('Knight attack result (no dragon):', knightResult);
    
    // Should complete immediately since Bob has no Dragon
    expect(knightResult.isValid).toBe(true);
    expect(knightResult.requiresResponse).toBeUndefined(); // No pending response needed
    
    // Check no pending attack
    expect(game.getPendingKnightAttack()).toBeUndefined();
    
    // Verify Alice got the queen
    const finalState = (game as any).getInternalState();
    const finalBob = finalState.players.find((p: any) => p.id === 'bob');
    const finalAlice = finalState.players.find((p: any) => p.id === 'alice');
    
    expect(finalBob.queens).toHaveLength(0);
    expect(finalBob.score).toBe(0);
    expect(finalAlice.queens).toHaveLength(1);
    expect(finalAlice.queens[0].name).toBe('Test Queen');
    expect(finalAlice.score).toBe(15);
  });
  
  test('should allow attack when target chooses not to block', () => {
    const game = new SleepingQueensGame();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1 });
    
    // Start game
    game.startGame();
    
    const state = (game as any).getInternalState();
    
    // Clear hands to ensure deterministic setup
    const alicePlayer = state.players.find((p: any) => p.id === 'alice');
    const bobPlayer = state.players.find((p: any) => p.id === 'bob');
    alicePlayer.hand = [];
    bobPlayer.hand = [];
    bobPlayer.queens = [];
    bobPlayer.score = 0;
    
    // Give Alice (attacker) a Knight
    const knightCard = { id: 'test-knight', type: 'knight', name: 'Knight' };
    alicePlayer.hand.push(knightCard);
    
    // Give Bob (target) exactly one Dragon and a Queen
    const dragonCard = { id: 'test-dragon', type: 'dragon', name: 'Dragon' };
    const testQueen = { 
      id: 'test-queen', 
      type: 'queen', 
      name: 'Test Queen', 
      points: 15, 
      isAwake: true 
    };
    bobPlayer.hand.push(dragonCard);
    bobPlayer.queens.push(testQueen);
    bobPlayer.score = 15;
    
    // Alice attacks with Knight
    const knightMove: GameMove = {
      type: 'play_knight',
      playerId: 'alice',
      cards: [knightCard],
      targetCard: testQueen,
      targetPlayer: 'bob',
      timestamp: Date.now()
    };
    
    const knightResult = game.playMove(knightMove);
    expect(knightResult.isValid).toBe(true);
    expect(knightResult.requiresResponse).toBe(true);
    
    console.log('=== BOB ALLOWS ATTACK ===');
    // Bob chooses to allow the attack
    const allowResult = game.allowKnightAttack();
    console.log('Allow attack result:', allowResult);
    
    expect(allowResult.isValid).toBe(true);
    
    // Check attack completed
    expect(game.getPendingKnightAttack()).toBeUndefined();
    
    // Verify Alice got the queen and Bob lost it
    const finalState = (game as any).getInternalState();
    const finalBob = finalState.players.find((p: any) => p.id === 'bob');
    const finalAlice = finalState.players.find((p: any) => p.id === 'alice');
    
    expect(finalBob.queens).toHaveLength(0);
    expect(finalBob.score).toBe(0);
    expect(finalAlice.queens).toHaveLength(1);
    expect(finalAlice.queens[0].name).toBe('Test Queen');
    expect(finalAlice.score).toBe(15);
    
    // Bob should still have his Dragon (didn't use it)
    expect(finalBob.hand.some((c: any) => c.type === 'dragon')).toBe(true);
  });
});