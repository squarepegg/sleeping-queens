import { GameEngineAdapter } from '../../application/adapters/GameEngineAdapter';
import { GameMove } from '../../domain/models/GameMove';

describe('Jester Queen Bug', () => {
  test('queen should appear in player hand after jester selection', () => {
    const player1Id = '97bc985d-446d-45ef-85d1-baeb76bb793c';
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

    // Player 1 plays jester
    const jesterMove: GameMove = {
      type: 'play_jester',
      playerId: player1Id,
      cards: [{ id: 'jester1', type: 'jester', name: 'Jester' }],
      timestamp: Date.now()
    };

    console.log('Before jester play:');
    console.log('Player 1 queens:', game.getState().players[0].queens.length);
    console.log('Sleeping queens:', game.getState().sleepingQueens.map(q => q.name));

    const result = game.playMove(jesterMove);
    console.log('Jester play result:', result);

    const stateAfterJester = game.getState();
    console.log('After jester play:');
    console.log('Jester reveal:', stateAfterJester.jesterReveal);
    console.log('Target player ID:', stateAfterJester.jesterReveal?.targetPlayer);

    // Verify jester reveal is correct (value 1 = same player)
    expect(stateAfterJester.jesterReveal?.targetPlayer).toBe(player1Id);
    expect(stateAfterJester.jesterReveal?.waitingForQueenSelection).toBe(true);

    // Player 1 selects a queen (they are the target)
    const queenMove: GameMove = {
      type: 'play_jester',
      playerId: player1Id,
      cards: [],
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false },
      timestamp: Date.now() + 1000
    };

    console.log('Selecting queen:', queenMove.targetCard);
    const queenResult = game.playMove(queenMove);
    console.log('Queen selection result:', queenResult);

    const finalState = game.getState();
    console.log('After queen selection:');
    console.log('Player 1 queens:', finalState.players[0].queens.map(q => q.name));
    console.log('Player 1 queens count:', finalState.players[0].queens.length);
    console.log('Sleeping queens remaining:', finalState.sleepingQueens.map(q => q.name));
    console.log('Jester reveal cleared?', finalState.jesterReveal === undefined);

    // Verify the queen was added to player 1's collection
    expect(finalState.players[0].queens.length).toBe(1);
    expect(finalState.players[0].queens[0].name).toBe('Cat Queen');

    // Verify the queen was removed from sleeping queens
    expect(finalState.sleepingQueens.length).toBe(1);
    expect(finalState.sleepingQueens.some(q => q.name === 'Cat Queen')).toBe(false);

    // Verify jester reveal was cleared
    expect(finalState.jesterReveal).toBeUndefined();
  });
});