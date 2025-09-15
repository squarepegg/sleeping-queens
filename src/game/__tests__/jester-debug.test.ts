import { GameEngineAdapter } from '../../application/adapters/GameEngineAdapter';
import { GameMove } from '../../domain/models/GameMove';

describe('Jester Debug', () => {
  test('debug jester card drawing', () => {
    const player1Id = 'player1';
    const player2Id = 'player2';

    const initialState = {
      id: 'test-game-id',
      players: [
        {
          id: player1Id,
          name: 'Player 1',
          hand: [
            { id: 'jester1', type: 'jester' as const, name: 'Jester' },
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
            { id: 'jester2', type: 'jester' as const, name: 'Jester' },
            { id: 'num5', type: 'number' as const, value: 4 },
            { id: 'num6', type: 'number' as const, value: 6 },
            { id: 'num7', type: 'number' as const, value: 8 },
            { id: 'num8', type: 'number' as const, value: 1 }
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
        { id: 'replacement', type: 'number' as const, value: 9 }, // Replacement card
        { id: 'deck1', type: 'number' as const, value: 2 } // This will be revealed
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

    console.log('Initial state:');
    console.log('Player 1 hand size:', game.getState().players[0].hand.length);
    console.log('Deck size:', game.getState().deck.length);

    // Player 1 plays jester
    const jesterMove: GameMove = {
      type: 'play_jester',
      playerId: player1Id,
      cards: [{ id: 'jester1', type: 'jester', name: 'Jester' }],
      timestamp: Date.now()
    };

    const result = game.playMove(jesterMove);
    console.log('After jester play:');
    console.log('Move result:', result);
    console.log('Player 1 hand size:', game.getState().players[0].hand.length);
    console.log('Deck size:', game.getState().deck.length);
    console.log('Jester reveal:', game.getState().jesterReveal);

    expect(game.getState().players[0].hand.length).toBe(4); // Should be 4 cards
    expect(game.getState().deck.length).toBe(1); // Should have 1 card left

    // Player 2 selects a queen
    const queenMove: GameMove = {
      type: 'play_jester',
      playerId: player2Id,
      cards: [],
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false },
      timestamp: Date.now() + 1000
    };

    const queenResult = game.playMove(queenMove);
    console.log('After queen selection:');
    console.log('Queen result:', queenResult);
    console.log('Player 1 hand size:', game.getState().players[0].hand.length);
    console.log('Player 2 queens:', game.getState().players[1].queens.map(q => q.name));
    console.log('Deck size:', game.getState().deck.length);

    expect(game.getState().players[0].hand.length).toBe(5); // Should now be 5 cards
    expect(game.getState().players[1].queens.length).toBe(1); // Player 2 should have the queen
    expect(game.getState().deck.length).toBe(0); // Deck should be empty
  });
});