import {
  generateRoomCode,
  generatePlayerId,
  generateGameId,
  calculatePlayerScore,
  checkWinCondition,
  getNextPlayerIndex,
  getCurrentPlayer,
  getPlayerById,
  canPlayerDrawCards,
  needsToDiscardCards,
  validateKingMove,
  validateKnightMove,
  validateDragonMove,
  validateWandMove,
  validatePotionMove,
  validateMathMove,
  validateDiscardMove,
  findMathEquations,
  formatMathEquation
} from '../utils';
import { GameState, Player, Queen, NumberCard } from '../types';
import { GAME_CONFIG } from '../cards';

describe('Sleeping Queens Game Utils', () => {
  describe('ID Generation', () => {
    test('should generate unique room codes', () => {
      const code1 = generateRoomCode();
      const code2 = generateRoomCode();
      
      expect(code1).toHaveLength(6);
      expect(code2).toHaveLength(6);
      expect(code1).not.toBe(code2);
      expect(code1).toMatch(/^[A-Z0-9]{6}$/);
    });

    test('should generate unique player IDs', () => {
      const id1 = generatePlayerId();
      const id2 = generatePlayerId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    test('should generate unique game IDs', () => {
      const id1 = generateGameId();
      const id2 = generateGameId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('Player Score Calculation', () => {
    const createQueen = (points: number): Queen => ({
      id: `queen-${points}`,
      type: 'queen' as const,
      name: `Queen ${points}`,
      points,
      isAwake: true
    });

    test('should calculate correct player score', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        position: 0,
        hand: [],
        queens: [
          createQueen(15),
          createQueen(10),
          createQueen(5)
        ],
        isConnected: true,
        score: 0
      };

      expect(calculatePlayerScore(player)).toBe(30);
    });

    test('should return 0 for player with no queens', () => {
      const player: Player = {
        id: 'player1',
        name: 'Test Player',
        position: 0,
        hand: [],
        queens: [],
        isConnected: true,
        score: 0
      };

      expect(calculatePlayerScore(player)).toBe(0);
    });
  });

  describe('Win Condition Checking', () => {
    const createGameState = (players: Player[]): GameState => ({
      id: 'test-game',
      players,
      currentPlayerIndex: 0,
      currentPlayerId: players[0]?.id || null,
      sleepingQueens: [],
      deck: [],
      discardPile: [],
      phase: 'playing',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCode: 'TEST01',
      maxPlayers: 5,
      version: 1
    });

    test('should detect winner by queen count (2 players)', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          position: 0,
          hand: [],
          queens: Array(5).fill(null).map((_, i) => ({
            id: `queen-${i}`,
            type: 'queen' as const,
            name: `Queen ${i}`,
            points: 10,
            isAwake: true
          })),
          isConnected: true,
          score: 50
        },
        {
          id: 'player2',
          name: 'Player 2',
          position: 1,
          hand: [],
          queens: [],
          isConnected: true,
          score: 0
        }
      ];

      const gameState = createGameState(players);
      const winner = checkWinCondition(gameState);
      
      expect(winner).toBe(players[0]);
    });

    test('should detect winner by points (3-5 players)', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          position: 0,
          hand: [],
          queens: [
            { id: 'queen1', type: 'queen' as const, name: 'Queen 1', points: 20, isAwake: true },
            { id: 'queen2', type: 'queen' as const, name: 'Queen 2', points: 30, isAwake: true }
          ],
          isConnected: true,
          score: 50  // Fixed: 3 players need 50 points to win
        },
        {
          id: 'player2',
          name: 'Player 2',
          position: 1,
          hand: [],
          queens: [],
          isConnected: true,
          score: 0
        },
        {
          id: 'player3',
          name: 'Player 3',
          position: 2,
          hand: [],
          queens: [],
          isConnected: true,
          score: 0
        }
      ];

      const gameState = createGameState(players);
      const winner = checkWinCondition(gameState);
      
      expect(winner).toBe(players[0]);
    });

    test('should return null when no winner', () => {
      const players: Player[] = [
        {
          id: 'player1',
          name: 'Player 1',
          position: 0,
          hand: [],
          queens: [
            { id: 'queen1', type: 'queen' as const, name: 'Queen 1', points: 10, isAwake: true }
          ],
          isConnected: true,
          score: 10
        },
        {
          id: 'player2',
          name: 'Player 2',
          position: 1,
          hand: [],
          queens: [],
          isConnected: true,
          score: 0
        }
      ];

      const gameState = createGameState(players);
      const winner = checkWinCondition(gameState);
      
      expect(winner).toBeNull();
    });
  });

  describe('Game State Helpers', () => {
    const players: Player[] = [
      {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: [],
        queens: [],
        isConnected: true,
        score: 0
      },
      {
        id: 'player2',
        name: 'Player 2',
        position: 1,
        hand: [],
        queens: [],
        isConnected: true,
        score: 0
      },
      {
        id: 'player3',
        name: 'Player 3',
        position: 2,
        hand: [],
        queens: [],
        isConnected: true,
        score: 0
      }
    ];

    const gameState: GameState = {
      id: 'test-game',
      players,
      currentPlayerIndex: 1,
      sleepingQueens: [],
      deck: [],
      discardPile: [],
      phase: 'playing',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCode: 'TEST01',
      maxPlayers: 5,
      currentPlayerId: null,
      version: 1
    };

    test('should get next player index correctly', () => {
      expect(getNextPlayerIndex(gameState)).toBe(2);
      
      const lastPlayerState = { ...gameState, currentPlayerIndex: 2 };
      expect(getNextPlayerIndex(lastPlayerState)).toBe(0);
    });

    test('should get current player', () => {
      const currentPlayer = getCurrentPlayer(gameState);
      expect(currentPlayer).toBe(players[1]);
    });

    test('should get player by ID', () => {
      const player = getPlayerById(gameState, 'player2');
      expect(player).toBe(players[1]);
      
      const nonExistentPlayer = getPlayerById(gameState, 'nonexistent');
      expect(nonExistentPlayer).toBeNull();
    });
  });

  describe('Hand Management', () => {
    test('should check if player can draw cards', () => {
      const playerCanDraw: Player = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: Array(3).fill({ id: 'card', type: 'king' as const, name: 'King' }),
        queens: [],
        isConnected: true,
        score: 0
      };

      const playerCannotDraw: Player = {
        id: 'player2',
        name: 'Player 2',
        position: 1,
        hand: Array(5).fill({ id: 'card', type: 'king' as const, name: 'King' }),
        queens: [],
        isConnected: true,
        score: 0
      };

      expect(canPlayerDrawCards(playerCanDraw)).toBe(true);
      expect(canPlayerDrawCards(playerCannotDraw)).toBe(false);
    });

    test('should check if player needs to discard', () => {
      const playerNormal: Player = {
        id: 'player1',
        name: 'Player 1',
        position: 0,
        hand: Array(5).fill({ id: 'card', type: 'king' as const, name: 'King' }),
        queens: [],
        isConnected: true,
        score: 0
      };

      const playerTooMany: Player = {
        id: 'player2',
        name: 'Player 2',
        position: 1,
        hand: Array(7).fill({ id: 'card', type: 'king' as const, name: 'King' }),
        queens: [],
        isConnected: true,
        score: 0
      };

      expect(needsToDiscardCards(playerNormal)).toBe(false);
      expect(needsToDiscardCards(playerTooMany)).toBe(true);
    });
  });

  describe('Move Validation', () => {
    const gameState: GameState = {
      id: 'test-game',
      players: [
        {
          id: 'player1',
          name: 'Player 1',
          position: 0,
          hand: [
            { id: 'king1', type: 'king' as const, name: 'King' },
            { id: 'knight1', type: 'knight' as const, name: 'Knight' },
            { id: 'dragon1', type: 'dragon' as const, name: 'Dragon' }
          ],
          queens: [],
          isConnected: true,
          score: 0
        },
        {
          id: 'player2',
          name: 'Player 2',
          position: 1,
          hand: [],
          queens: [
            { id: 'queen1', type: 'queen' as const, name: 'Queen 1', points: 10, isAwake: true }
          ],
          isConnected: true,
          score: 10
        }
      ],
      currentPlayerIndex: 0,
      sleepingQueens: [
        { id: 'sleepingQueen1', type: 'queen' as const, name: 'Sleeping Queen', points: 15, isAwake: false }
      ],
      deck: [],
      discardPile: [],
      phase: 'playing',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      roomCode: 'TEST01',
      maxPlayers: 5,
      currentPlayerId: null,
      version: 1
    };

    test('should validate king move', () => {
      const validKing = validateKingMove(gameState, 'player1', gameState.sleepingQueens[0]);
      expect(validKing.isValid).toBe(true);

      const invalidNoTurn = validateKingMove(gameState, 'player2', gameState.sleepingQueens[0]);
      expect(invalidNoTurn.isValid).toBe(false);
      expect(invalidNoTurn.error).toContain('Not your turn');
    });

    test('should validate knight move', () => {
      const targetPlayer = gameState.players[1];
      const targetQueen = targetPlayer.queens[0];
      
      const validKnight = validateKnightMove(gameState, 'player1', targetPlayer, targetQueen);
      expect(validKnight.isValid).toBe(true);

      const invalidSelfTarget = validateKnightMove(gameState, 'player1', gameState.players[0], targetQueen);
      expect(invalidSelfTarget.isValid).toBe(false);
      expect(invalidSelfTarget.error).toContain('Cannot steal from yourself');
    });

    test('should validate dragon move', () => {
      const validDragon = validateDragonMove(gameState, 'player1');
      expect(validDragon.isValid).toBe(true);

      const gameStateNoDragon = {
        ...gameState,
        players: [
          {
            ...gameState.players[0],
            hand: [{ id: 'king1', type: 'king' as const, name: 'King' }]
          },
          ...gameState.players.slice(1)
        ]
      };

      const invalidNoDragon = validateDragonMove(gameStateNoDragon, 'player1');
      expect(invalidNoDragon.isValid).toBe(false);
      expect(invalidNoDragon.error).toContain('No dragon in hand');
    });
  });

  describe('Math Equation Utilities', () => {
    const createNumberCard = (value: number, id?: string): NumberCard => ({
      id: id || `card-${value}`,
      type: 'number' as const,
      value,
      name: value.toString()
    });

    test('should find valid math equations', () => {
      const cards = [
        createNumberCard(2, 'card1'),
        createNumberCard(3, 'card2'),
        createNumberCard(5, 'card3'),
        createNumberCard(7, 'card4')
      ];

      const equations = findMathEquations(cards);
      expect(equations.length).toBeGreaterThan(0);
      
      // Should find 2 + 3 = 5
      const additionEquation = equations.find(eq => 
        eq.some(c => c.value === 2) && 
        eq.some(c => c.value === 3) && 
        eq.some(c => c.value === 5)
      );
      expect(additionEquation).toBeDefined();
    });

    test('should format math equations correctly', () => {
      const additionCards = [
        createNumberCard(2),
        createNumberCard(3),
        createNumberCard(5)
      ];

      const formatted = formatMathEquation(additionCards);
      expect(formatted).toBe('2 + 3 = 5');

      const subtractionCards = [
        createNumberCard(8),
        createNumberCard(3),
        createNumberCard(5)
      ];

      const formattedSub = formatMathEquation(subtractionCards);
      expect(formattedSub).toBe('8 - 3 = 5');

      const multiplicationCards = [
        createNumberCard(2),
        createNumberCard(4),
        createNumberCard(8)
      ];

      const formattedMult = formatMathEquation(multiplicationCards);
      expect(formattedMult).toBe('2 × 4 = 8');
    });

    test('should handle invalid equations gracefully', () => {
      const invalidCards = [
        createNumberCard(2),
        createNumberCard(3),
        createNumberCard(7)
      ];

      const formatted = formatMathEquation(invalidCards);
      expect(formatted).toBe('2 ? 3 ? 7');
    });
  });
});