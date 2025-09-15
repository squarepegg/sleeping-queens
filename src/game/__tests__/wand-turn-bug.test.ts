import { GameEngineAdapter } from '../../application/adapters/GameEngineAdapter';
import { GameMove } from '../../domain/models/GameMove';

describe('Wand Turn Bug', () => {
  test('turn should advance after wand blocks potion attack', () => {
    const player1Id = 'player1';
    const player2Id = 'player2';
    const player3Id = 'player3';

    const initialState = {
      id: 'test-game-id',
      players: [
        {
          id: player1Id,
          name: 'Player 1',
          hand: [
            { id: 'potion1', type: 'potion' as const, name: 'Sleeping Potion' },
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
            { id: 'wand1', type: 'wand' as const, name: 'Magic Wand' },
            { id: 'num5', type: 'number' as const, value: 4 },
            { id: 'num6', type: 'number' as const, value: 6 },
            { id: 'num7', type: 'number' as const, value: 8 },
            { id: 'num8', type: 'number' as const, value: 9 }
          ],
          queens: [
            { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: true }
          ],
          score: 15
        },
        {
          id: player3Id,
          name: 'Player 3',
          hand: [
            { id: 'king1', type: 'king' as const, name: 'King' },
            { id: 'num9', type: 'number' as const, value: 1 },
            { id: 'num10', type: 'number' as const, value: 2 },
            { id: 'num11', type: 'number' as const, value: 3 },
            { id: 'num12', type: 'number' as const, value: 4 }
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
        { id: 'replacement1', type: 'number' as const, value: 10 },
        { id: 'replacement2', type: 'number' as const, value: 11 }
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

    console.log('Initial turn: Player', game.getState().currentPlayerIndex + 1);

    // Player 1 plays potion targeting Player 2's queen
    const potionMove: GameMove = {
      type: 'play_potion',
      playerId: player1Id,
      cards: [{ id: 'potion1', type: 'potion', name: 'Sleeping Potion' }],
      targetPlayer: player2Id,
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: true },
      timestamp: Date.now()
    };

    const potionResult = game.playMove(potionMove);
    console.log('Potion result:', potionResult);

    let state = game.getState();
    console.log('After potion - current turn: Player', state.currentPlayerIndex + 1);
    console.log('Pending potion attack?', state.pendingPotionAttack !== undefined);

    // Verify potion attack is pending
    expect(state.pendingPotionAttack).toBeDefined();
    expect(state.pendingPotionAttack?.target).toBe(player2Id);

    // Player 2 defends with wand
    const wandMove: GameMove = {
      type: 'play_wand',
      playerId: player2Id,
      cards: [{ id: 'wand1', type: 'wand', name: 'Magic Wand' }],
      timestamp: Date.now() + 1000
    };

    const wandResult = game.playMove(wandMove);
    console.log('Wand defense result:', wandResult);

    state = game.getState();
    console.log('After wand defense - current turn: Player', state.currentPlayerIndex + 1);
    console.log('Current player ID:', state.currentPlayerId);

    // Check that potion attack was cleared
    expect(state.pendingPotionAttack).toBeUndefined();

    // IMPORTANT: Turn should now be Player 2's turn (the defender gets their regular turn)
    expect(state.currentPlayerIndex).toBe(1);
    expect(state.currentPlayerId).toBe(player2Id);

    // Player 2 should still have their queen
    const player2 = state.players.find(p => p.id === player2Id)!;
    expect(player2.queens).toHaveLength(1);
    expect(player2.queens[0].name).toBe('Cat Queen');
  });
});