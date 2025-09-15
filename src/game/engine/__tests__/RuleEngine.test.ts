import { RuleEngine } from '../RuleEngine';
import { GameState, Move, Player, Card, Queen } from '../../types';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let mockGameState: GameState;
  let mockPlayer: Player;

  beforeEach(() => {
    ruleEngine = new RuleEngine();
    
    mockPlayer = {
      id: 'player1',
      name: 'Test Player',
      hand: [
        { id: 'card-1', type: 'king', name: 'Test King' },
        { id: 'card-2', type: 'knight' },
        { id: 'card-3', type: 'dragon' },
        { id: 'card-4', type: 'wand' },
        { id: 'card-5', type: 'potion' },
        { id: 'card-6', type: 'jester' },
        { id: 'card-7', type: 'number', value: 5 },
        { id: 'card-8', type: 'number', value: 3 },
        { id: 'card-9', type: 'number', value: 8 }
      ],
      queens: [],
      score: 0,
      isConnected: true,
      position: 0
    };

    mockGameState = {
      id: 'game-1',
      players: [
        mockPlayer,
        {
          id: 'player2',
          name: 'Opponent',
          hand: [],
          queens: [
            { id: 'queen-1', type: 'queen', name: 'Rose Queen', points: 5, isAwake: true }
          ],
          score: 5,
          isConnected: true,
          position: 1
        }
      ],
      currentPlayerIndex: 0,
      currentPlayerId: 'player1',
      sleepingQueens: [
        { id: 'queen-2', type: 'queen', name: 'Cat Queen', points: 15, isAwake: false },
        { id: 'queen-3', type: 'queen', name: 'Dog Queen', points: 15, isAwake: false }
      ],
      deck: [],
      discardPile: [],
      phase: 'playing',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCode: 'TEST01',
      maxPlayers: 4,
      version: 1
    };
  });

  describe('Basic Move Validation', () => {
    it('should reject invalid move structure', () => {
      const invalidMove = {} as Move;
      const result = ruleEngine.validateMove(invalidMove, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid move structure');
    });

    it('should reject move when not player turn', () => {
      const move: Move = {
        playerId: 'player2',
        type: 'play_king',
        cardId: 'card-1',
        targetQueenId: 'queen-2',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should accept move on player turn', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_king',
        cardId: 'card-1',
        targetQueenId: 'queen-2',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('King Move Validation', () => {
    it('should validate valid king move', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_king',
        cardId: 'card-1',
        targetQueenId: 'queen-2',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject king move without target queen', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_king',
        cardId: 'card-1',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('target queen');
    });

    it('should reject king move with non-king card', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_king',
        cardId: 'card-7', // number card
        targetQueenId: 'queen-2',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a king');
    });

    it('should reject king move targeting awake queen', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_king',
        cardId: 'card-1',
        targetQueenId: 'queen-1', // Already awake with player2
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Knight Move Validation', () => {
    it('should validate valid knight move', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_knight',
        cardId: 'card-2',
        targetPlayerId: 'player2',
        targetQueenId: 'queen-1',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject knight stealing from self', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_knight',
        cardId: 'card-2',
        targetPlayerId: 'player1',
        targetQueenId: 'queen-1',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Cannot steal from yourself');
    });

    it('should reject knight targeting non-existent queen', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_knight',
        cardId: 'card-2',
        targetPlayerId: 'player2',
        targetQueenId: 'queen-999',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('does not have that queen');
    });
  });

  describe('Wand Move Validation', () => {
    it('should validate valid wand move', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_wand',
        cardId: 'card-4',
        targetPlayerId: 'player2',
        targetQueenId: 'queen-1',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should allow wand as defensive card only', () => {
      // Wand can only be played in response to a potion attack
      // Without a pending potion attack, it should fail due to turn validation
      const move: Move = {
        playerId: 'player2', // Not current player's turn
        type: 'play_wand',
        cardId: 'card-4',
        cards: [],
        timestamp: Date.now()
      };

      // Add card to player2's hand
      mockGameState.players[1].hand.push({ id: 'card-4', type: 'wand', name: 'Magic Wand' });

      const result = ruleEngine.validateMove(move, mockGameState);

      // Should fail because it's not player2's turn and there's no pending potion attack
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not your turn');

      // Now test with a pending potion attack
      mockGameState.pendingPotionAttack = {
        attacker: 'player1',
        target: 'player2',
        targetQueen: { id: 'queen-1', type: 'queen', name: 'Test Queen', points: 5, isAwake: true },
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 5000
      };

      // Now player2 should be able to play wand even though it's not their turn
      const result2 = ruleEngine.validateMove(move, mockGameState);
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Equation Validation', () => {
    it('should validate valid 3-card addition equation', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_math',
        cardIds: ['card-7', 'card-8', 'card-9'], // 5 + 3 = 8
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid equation', () => {
      mockPlayer.hand.push({ id: 'card-10', type: 'number', value: 7 });
      
      const move: Move = {
        playerId: 'player1',
        type: 'play_math',
        cardIds: ['card-7', 'card-8', 'card-10'], // 5, 3, 7 - no valid equation
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('do not form a valid equation');
    });

    it('should reject equation with non-number cards', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_math',
        cardIds: ['card-1', 'card-7', 'card-8'], // King + numbers
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be numbers');
    });

    it('should validate 4-card equation', () => {
      mockPlayer.hand.push(
        { id: 'card-10', type: 'number', value: 2 },
        { id: 'card-11', type: 'number', value: 10 }
      );
      
      const move: Move = {
        playerId: 'player1',
        type: 'play_math',
        cardIds: ['card-7', 'card-8', 'card-10', 'card-11'], // 5 + 3 + 2 = 10
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Discard Move Validation', () => {
    it('should validate single card discard', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'discard',
        cardIds: ['card-7'],
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should allow discard of single action card', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'discard',
        cardIds: ['card-1'], // King
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      // In Sleeping Queens, you CAN discard action cards as a single discard
      expect(result.isValid).toBe(true);
    });

    it('should validate multiple card discard with valid equation', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'discard',
        cardIds: ['card-7', 'card-8', 'card-9'], // 5 + 3 = 8
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Win Condition Checking', () => {
    it('should detect win by 50+ points', () => {
      mockPlayer.queens = [
        { id: 'q1', type: 'queen', name: 'Q1', points: 20, isAwake: true },
        { id: 'q2', type: 'queen', name: 'Q2', points: 20, isAwake: true },
        { id: 'q3', type: 'queen', name: 'Q3', points: 15, isAwake: true }
      ];
      
      const result = ruleEngine.checkWinCondition(mockGameState);
      
      expect(result.hasWinner).toBe(true);
      expect(result.winnerId).toBe('player1');
    });

    it('should detect win by 5+ queens', () => {
      mockPlayer.queens = [
        { id: 'q1', type: 'queen', name: 'Q1', points: 5, isAwake: true },
        { id: 'q2', type: 'queen', name: 'Q2', points: 5, isAwake: true },
        { id: 'q3', type: 'queen', name: 'Q3', points: 5, isAwake: true },
        { id: 'q4', type: 'queen', name: 'Q4', points: 5, isAwake: true },
        { id: 'q5', type: 'queen', name: 'Q5', points: 5, isAwake: true }
      ];
      
      const result = ruleEngine.checkWinCondition(mockGameState);
      
      expect(result.hasWinner).toBe(true);
      expect(result.winnerId).toBe('player1');
    });

    it('should detect win when all queens awake', () => {
      mockGameState.sleepingQueens = [];
      mockGameState.players[0].queens = [
        { id: 'q1', type: 'queen', name: 'Q1', points: 25, isAwake: true }
      ];
      mockGameState.players[1].queens = [
        { id: 'q2', type: 'queen', name: 'Q2', points: 15, isAwake: true }
      ];
      
      const result = ruleEngine.checkWinCondition(mockGameState);
      
      expect(result.hasWinner).toBe(true);
      expect(result.winnerId).toBe('player1'); // Most points
    });

    it('should not detect win when conditions not met', () => {
      const result = ruleEngine.checkWinCondition(mockGameState);
      
      expect(result.hasWinner).toBe(false);
      expect(result.winnerId).toBeUndefined();
    });
  });

  describe('Special Combinations', () => {
    it('should validate matching jesters', () => {
      const cards: Card[] = [
        { id: 'j1', type: 'jester' },
        { id: 'j2', type: 'jester' }
      ];
      
      const result = ruleEngine.validateSpecialCombination(cards);
      
      expect(result).toBe(true);
    });

    it('should reject non-matching special cards', () => {
      const cards: Card[] = [
        { id: 'j1', type: 'jester' },
        { id: 'k1', type: 'king', name: 'Test King' }
      ];
      
      const result = ruleEngine.validateSpecialCombination(cards);
      
      expect(result).toBe(false);
    });
  });

  describe('Potion Move Validation', () => {
    it('should validate offensive potion use', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_potion',
        cardId: 'card-5',
        targetPlayerId: 'player2',
        targetQueenId: 'queen-1',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should validate defensive potion use', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_potion',
        cardId: 'card-5',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Jester Move Validation', () => {
    it('should validate jester play', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_jester',
        cardId: 'card-6',
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject jester with wrong card', () => {
      const move: Move = {
        playerId: 'player1',
        type: 'play_jester',
        cardId: 'card-1', // King
        cards: [],
        timestamp: Date.now()
      };
      
      const result = ruleEngine.validateMove(move, mockGameState);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not a jester');
    });
  });
});