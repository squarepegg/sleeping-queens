import { GameEngineAdapter } from '../../application/adapters/GameEngineAdapter';
import { GameMove } from '../../domain/models/GameMove';

describe('Jester Frontend Bug', () => {
  test('should accept jester card from cards array', () => {
    const player1Id = 'ac71dc0f-e91a-4353-afe1-93f7d319179b';
    const player2Id = 'player2';

    const initialState = {
      id: 'test-game-id',
      players: [
        {
          id: player1Id,
          name: 'Player 1',
          hand: [
            { id: 'jester-1', type: 'jester' as const, name: 'Jester' },
            { id: 'num1', type: 'number' as const, value: 5 },
            { id: 'num2', type: 'number' as const, value: 3 },
            { id: 'num3', type: 'number' as const, value: 7 },
            { id: 'num4', type: 'number' as const, value: 2 }
          ],
          queens: [],
          score: 0
        },
        {
          id: player2Id,
          name: 'Player 2',
          hand: [
            { id: 'king1', type: 'king' as const, name: 'King' },
            { id: 'num5', type: 'number' as const, value: 4 },
            { id: 'num6', type: 'number' as const, value: 6 },
            { id: 'num7', type: 'number' as const, value: 8 },
            { id: 'num8', type: 'number' as const, value: 9 }
          ],
          queens: [],
          score: 0
        }
      ],
      sleepingQueens: [
        { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false },
        { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false },
      ],
      currentPlayerIndex: 0,
      currentPlayerId: player1Id,
      deck: [
        { id: 'replacement', type: 'number' as const, value: 10 },
        { id: 'deck1', type: 'number' as const, value: 1 } // Value 1 = same player
      ],
      discardPile: [],
      drawPile: [],
      stagedCards: {},
      gameStarted: true,
      gameId: 'test-game',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    const game = new GameEngineAdapter(initialState);

    // Try playing jester the way the frontend sends it
    const jesterMove: GameMove = {
      type: 'play_jester',
      playerId: player1Id,
      cards: [{ id: 'jester-1', type: 'jester' as const, name: 'Jester' }],
      timestamp: Date.now()
    };

    console.log('Attempting jester move with cards array:', jesterMove);
    const result = game.playMove(jesterMove);
    console.log('Result:', result);

    // The move should be valid
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();

    // Check that jester reveal was created
    const state = game.getState();
    expect(state.jesterReveal).toBeDefined();
    expect(state.jesterReveal?.waitingForQueenSelection).toBe(true);
  });

  test('should handle jester with different card object structure', () => {
    const player1Id = 'ac71dc0f-e91a-4353-afe1-93f7d319179b';

    const initialState = {
      id: 'test-game-id',
      players: [
        {
          id: player1Id,
          name: 'Player 1',
          hand: [
            { id: 'jester-1', type: 'jester' as const }, // No name property
            { id: 'num1', type: 'number' as const, value: 5 },
            { id: 'num2', type: 'number' as const, value: 3 },
            { id: 'num3', type: 'number' as const, value: 7 },
            { id: 'num4', type: 'number' as const, value: 2 }
          ],
          queens: [],
          score: 0
        }
      ],
      sleepingQueens: [
        { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false },
      ],
      currentPlayerIndex: 0,
      currentPlayerId: player1Id,
      deck: [
        { id: 'deck1', type: 'number' as const, value: 1 }
      ],
      discardPile: [],
      drawPile: [],
      stagedCards: {},
      gameStarted: true,
      gameId: 'test-game',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    const game = new GameEngineAdapter(initialState);

    // Try with minimal jester card structure
    const jesterMove: GameMove = {
      type: 'play_jester',
      playerId: player1Id,
      cards: [{ id: 'jester-1', type: 'jester' as const }],
      timestamp: Date.now()
    };

    const result = game.playMove(jesterMove);
    console.log('Minimal jester result:', result);

    expect(result.isValid).toBe(true);
  });
});