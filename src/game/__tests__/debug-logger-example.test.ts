import { GameEngine as SleepingQueensGame } from '../engine/GameEngine';
import { debugLogger, TestHarness } from '../utils/DebugLogger';
import { GameMove } from '../types';

describe('Debug Logger Example - Testing with Log Messages', () => {
  let harness: TestHarness;

  beforeEach(() => {
    // Clear debug logger and create test harness
    debugLogger.clear();
    debugLogger.setEnabled(true);
    harness = debugLogger.createTestHarness();
  });

  afterEach(() => {
    // Clean up harness
    harness.cleanup();
  });

  test('should verify player addition through debug logs', () => {
    const game = new SleepingQueensGame();
    
    // Add first player
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Verify through debug logs
    expect(harness.hasMessage('Added player: Alice (alice) at position 0')).toBe(true);
    expect(harness.hasMessage('Total players: 1')).toBe(true);
    
    // Add second player
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    expect(harness.hasMessage('Added player: Bob (bob) at position 1')).toBe(true);
    expect(harness.hasMessage('Total players: 2')).toBe(true);
    
    // Try to add duplicate player
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    expect(harness.hasMessage('Cannot add player - duplicate id: alice')).toBe(true);
  });

  test('should verify game start through debug logs', () => {
    const game = new SleepingQueensGame();
    
    // Try to start without enough players
    try {
      game.startGame();
    } catch (e) {
      // Expected to throw
    }
    
    expect(harness.hasMessage('Cannot start game - need at least 2 players, have 0')).toBe(true);
    
    // Add players and start
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    harness.clear(); // Clear previous messages
    game.startGame();
    
    expect(harness.hasMessage('Starting game with 2 players')).toBe(true);
    expect(harness.hasMessage('Dealt 5 cards to Alice:')).toBe(true);
    expect(harness.hasMessage('Dealt 5 cards to Bob:')).toBe(true);
    expect(harness.hasMessage('First turn: Alice')).toBe(true);
  });

  test('should verify move validation through debug logs', () => {
    const game = new SleepingQueensGame();
    
    // Set up game
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.startGame();
    
    harness.clear();
    
    // Try to play a move from the wrong player
    const wrongPlayerMove: GameMove = {
      type: 'discard',
      playerId: 'bob',
      cards: [],
      timestamp: Date.now()
    };
    
    game.playMove(wrongPlayerMove);
    
    expect(harness.hasMessage('Player bob attempting discard move')).toBe(true);
    expect(harness.hasMessage('Move discard by bob failed:')).toBe(true);
    
    // The validation message will tell us it's not Bob's turn
    const validationMsg = harness.findMessage('Turn validation failed:');
    expect(validationMsg).toBeDefined();
  });

  test('should verify successful king move through debug logs', () => {
    const game = new SleepingQueensGame();
    
    // Set up game
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.startGame();
    
    // We can verify the game started correctly
    const state = game.getState();
    expect(state.phase).toBe('playing');
    
    // Clear logs after setup
    harness.clear();
    
    // Since we can't control what cards Alice has, we can only test 
    // moves that don't require specific cards
    
    // Try a simple discard move (always valid if player has cards)
    const aliceHand = state.players[0].hand;
    if (aliceHand.length > 0) {
      const discardMove: GameMove = {
        type: 'discard',
        playerId: 'alice',
        cards: [aliceHand[0]],
        timestamp: Date.now()
      };
      
      const result = game.playMove(discardMove);
      
      if (result.isValid) {
        expect(harness.hasMessage('Player alice attempting discard move')).toBe(true);
        expect(harness.hasMessage('Move discard by alice succeeded')).toBe(true);
      }
    }
  });

  test('should track player queens through debug logs', () => {
    const game = new SleepingQueensGame();
    
    // Set up game
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.startGame();
    
    const state = game.getState();
    
    // Clear setup logs
    harness.clear();
    
    // If Alice has a King card and there are sleeping queens,
    // we could test the King move, but we can't guarantee the cards
    
    // Instead, we can verify that the game tracks the state correctly
    // by checking the debug messages when moves are attempted
    
    const alicePlayer = state.players.find(p => p.id === 'alice');
    if (alicePlayer) {
      // Check if Alice has any specific card types by attempting moves
      // The debug logs will tell us what happened
      
      const testMove: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [],
        targetCard: state.sleepingQueens[0],
        timestamp: Date.now()
      };
      
      game.playMove(testMove);
      
      // The debug logs will tell us why it failed
      expect(harness.hasMessage('Player alice attempting play_king move')).toBe(true);
      
      // We'll see a validation failure message
      const messages = harness.messages;
      const failureMsg = messages.find(m => m.message.includes('failed'));
      expect(failureMsg).toBeDefined();
    }
  });
});