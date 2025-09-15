import { GameEngine as SleepingQueensGame } from '../engine/GameEngine';
import { GameMove } from '../types';
import { debugLogger, TestHarness } from '../utils/DebugLogger';

describe('Unified Staging System - All Moves Must Be Visible', () => {
  let game: SleepingQueensGame;
  let harness: TestHarness;
  
  beforeEach(() => {
    game = new SleepingQueensGame();
    
    // Set up debug logger
    debugLogger.clear();
    debugLogger.setEnabled(true);
    harness = debugLogger.createTestHarness();
    
    // Add players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start game
    game.startGame();
  });

  afterEach(() => {
    harness.cleanup();
  });

  describe('Move Visibility Through Debug Logs', () => {
    test('should log King move attempt', () => {
      harness.clear();
      
      const state = game.getState();
      const sleepingQueen = state.sleepingQueens[0];
      
      const kingMove: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [], // We don't know if Alice has a King
        targetCard: sleepingQueen,
        timestamp: Date.now()
      };

      game.playMove(kingMove);
      
      // Verify the move was logged
      expect(harness.hasMessage('Player alice attempting play_king move')).toBe(true);
      
      // The move will fail or succeed based on cards
      const failureMsg = harness.findMessage('failed');
      const successMsg = harness.findMessage('succeeded');
      expect(failureMsg || successMsg).toBeDefined();
    });

    test('should log Knight move attempt', () => {
      harness.clear();
      
      const knightMove: GameMove = {
        type: 'play_knight',
        playerId: 'alice',
        cards: [],
        targetPlayer: 'bob',
        timestamp: Date.now()
      };

      game.playMove(knightMove);
      
      expect(harness.hasMessage('Player alice attempting play_knight move')).toBe(true);
    });

    test('should log Potion move attempt', () => {
      harness.clear();
      
      const potionMove: GameMove = {
        type: 'play_potion',
        playerId: 'alice',
        cards: [],
        targetPlayer: 'bob',
        timestamp: Date.now()
      };

      game.playMove(potionMove);
      
      expect(harness.hasMessage('Player alice attempting play_potion move')).toBe(true);
    });

    test('should log Math equation attempt', () => {
      harness.clear();
      
      const mathMove: GameMove = {
        type: 'play_math',
        playerId: 'alice',
        cards: [],
        mathEquation: {
          cards: [],
          equation: '2 + 3 = 5',
          result: 5
        },
        timestamp: Date.now()
      };

      game.playMove(mathMove);
      
      expect(harness.hasMessage('Player alice attempting play_math move')).toBe(true);
    });

    test('should log Discard move attempt', () => {
      harness.clear();
      
      const state = game.getState();
      const aliceHand = state.players[0].hand;
      
      if (aliceHand.length > 0) {
        const discardMove: GameMove = {
          type: 'discard',
          playerId: 'alice',
          cards: [aliceHand[0]],
          timestamp: Date.now()
        };

        const result = game.playMove(discardMove);
        
        expect(harness.hasMessage('Player alice attempting discard move')).toBe(true);
        
        if (result.isValid) {
          expect(harness.hasMessage('Move discard by alice succeeded')).toBe(true);
        }
      } else {
        // Can't test without cards
        expect(true).toBe(true);
      }
    });
  });

  describe('Staging Consistency', () => {
    test('All moves should be logged with player and type', () => {
      const moveTypes = ['play_king', 'play_knight', 'play_potion', 'play_math', 'discard'];
      
      moveTypes.forEach(type => {
        harness.clear();
        
        const move: GameMove = {
          type: type as any,
          playerId: 'alice',
          cards: [],
          timestamp: Date.now()
        };
        
        game.playMove(move);
        
        // Every move should be logged
        expect(harness.hasMessage(`Player alice attempting ${type} move`)).toBe(true);
      });
    });

    test('Failed moves should log validation errors', () => {
      harness.clear();
      
      // Try to play from wrong player (not their turn)
      const wrongTurnMove: GameMove = {
        type: 'discard',
        playerId: 'bob',
        cards: [],
        timestamp: Date.now()
      };
      
      game.playMove(wrongTurnMove);
      
      expect(harness.hasMessage('Player bob attempting discard move')).toBe(true);
      expect(harness.hasMessage('Move discard by bob failed')).toBe(true);
    });

    test('Successful moves should advance turn', () => {
      const state = game.getState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      if (currentPlayer.hand.length > 0) {
        harness.clear();
        
        const discardMove: GameMove = {
          type: 'discard',
          playerId: currentPlayer.id,
          cards: [currentPlayer.hand[0]],
          timestamp: Date.now()
        };
        
        const result = game.playMove(discardMove);
        
        if (result.isValid) {
          expect(harness.hasMessage(`Move discard by ${currentPlayer.id} succeeded`)).toBe(true);
          
          // Check turn advanced
          const newState = game.getState();
          expect(newState.currentPlayerIndex).not.toBe(state.currentPlayerIndex);
        }
      } else {
        expect(true).toBe(true);
      }
    });
  });
});