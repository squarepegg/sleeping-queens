import { GameEngineAdapter } from '../../application/adapters/GameEngineAdapter';
import { GameMove } from '../../domain/models/GameMove';
import { Card } from '../../domain/models/Card';

describe('Rose Queen Bonus', () => {
  let game: GameEngineAdapter;
  const player1Id = 'player1';
  const player2Id = 'player2';

  beforeEach(() => {
    const initialState = {
      id: 'test-game-id',
      players: [
        {
          id: player1Id,
          name: 'Player 1',
          hand: [
            { id: 'king1', type: 'king' as const, name: 'King' },
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
            { id: 'king2', type: 'king' as const, name: 'King' },
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
        { id: 'dog-queen', name: 'Dog Queen', points: 15, isAwake: false },
        { id: 'cake-queen', name: 'Cake Queen', points: 15, isAwake: false }
      ],
      currentPlayerIndex: 0,
      currentPlayerId: player1Id,
      deck: Array(20).fill(null).map((_, i) => ({
        id: `deck${i}`,
        type: 'number' as const,
        value: (i % 10) + 1
      })),
      discardPile: [],
      drawPile: [],
      stagedCards: {},
      gameStarted: true,
      gameId: 'test-game',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1
    };

    game = new GameEngineAdapter(initialState);
  });

  test('should trigger Rose Queen bonus when waking Rose Queen from center', () => {
    // Play King to wake Rose Queen
    const kingMove: GameMove = {
      type: 'play_king',
      playerId: player1Id,
      timestamp: Date.now(),
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false }
    };

    const result = game.playMove(kingMove);
    expect(result.isValid).toBe(true);

    const state = game.getState();

    // Check Rose Queen was awakened
    const player1 = state.players.find(p => p.id === player1Id)!;
    expect(player1.queens).toHaveLength(1);
    expect(player1.queens[0].name).toBe('Rose Queen');

    // Check Rose Queen bonus is pending
    expect(state.roseQueenBonus).toBeDefined();
    expect(state.roseQueenBonus?.pending).toBe(true);
    expect(state.roseQueenBonus?.playerId).toBe(player1Id);

    // Player should still have their turn
    expect(state.currentPlayerIndex).toBe(0);
  });

  test('should allow selecting second queen with Rose Queen bonus', () => {
    // First, wake the Rose Queen
    const kingMove: GameMove = {
      type: 'play_king',
      playerId: player1Id,
      timestamp: Date.now(),
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false }
    };

    game.playMove(kingMove);

    // Now use the Rose Queen bonus to wake another queen
    const bonusMove: GameMove = {
      type: 'rose_queen_bonus',
      playerId: player1Id,
      timestamp: Date.now() + 1000,
      cards: [],
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false }
    };

    const result = game.playMove(bonusMove);
    expect(result.isValid).toBe(true);

    const state = game.getState();

    // Check both queens were awakened
    const player1 = state.players.find(p => p.id === player1Id)!;
    expect(player1.queens).toHaveLength(2);
    expect(player1.queens.map(q => q.name).sort()).toEqual(['Cat Queen', 'Rose Queen']);

    // Rose Queen bonus should be completed
    expect(state.roseQueenBonus?.pending).toBe(false);

    // Turn should now advance to next player
    expect(state.currentPlayerIndex).toBe(1);
  });

  test('should not trigger Rose Queen bonus when stealing Rose Queen from another player', () => {
    // First, let player 1 wake the Rose Queen
    game.playMove({
      type: 'play_king',
      playerId: player1Id,
      timestamp: Date.now(),
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false }
    });

    // Use the Rose Queen bonus
    game.playMove({
      type: 'rose_queen_bonus',
      playerId: player1Id,
      timestamp: Date.now() + 1000,
      cards: [],
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false }
    });

    // Now player 2's turn - give them a Knight
    let state = game.getState();
    const updatedState = {
      ...state,
      players: state.players.map((p, i) =>
        i === 1
          ? {
              ...p,
              hand: [
                { id: 'knight1', type: 'knight' as const, name: 'Knight' },
                ...p.hand.slice(1)
              ]
            }
          : p
      )
    };
    game = new GameEngineAdapter(updatedState);

    // Player 2 steals Rose Queen with Knight
    const knightMove: GameMove = {
      type: 'play_knight',
      playerId: player2Id,
      timestamp: Date.now() + 2000,
      cards: [{ id: 'knight1', type: 'knight', name: 'Knight' }],
      targetPlayer: player1Id,
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: true }
    };

    const result = game.playMove(knightMove);
    expect(result.isValid).toBe(true);

    state = game.getState();

    // Rose Queen should be stolen
    const player2 = state.players.find(p => p.id === player2Id)!;
    expect(player2.queens.some(q => q.name === 'Rose Queen')).toBe(true);

    // No Rose Queen bonus should be triggered (stealing, not waking from center)
    expect(state.roseQueenBonus?.pending).toBeFalsy();

    // Turn should advance normally
    expect(state.currentPlayerIndex).toBe(0);
  });

  test('should only allow Rose Queen bonus for the player who woke her', () => {
    // Player 1 wakes Rose Queen
    game.playMove({
      type: 'play_king',
      playerId: player1Id,
      timestamp: Date.now(),
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false }
    });

    // Player 2 tries to use the Rose Queen bonus (should fail)
    const invalidBonusMove: GameMove = {
      type: 'rose_queen_bonus',
      playerId: player2Id,
      timestamp: Date.now() + 1000,
      cards: [],
      targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false }
    };

    const result = game.playMove(invalidBonusMove);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Not your Rose Queen bonus');
  });

  test('should cancel Rose Queen bonus if player discards instead', () => {
    // Player 1 wakes Rose Queen
    game.playMove({
      type: 'play_king',
      playerId: player1Id,
      timestamp: Date.now(),
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: { id: 'rose-queen', name: 'Rose Queen', points: 5, isAwake: false }
    });

    let state = game.getState();
    expect(state.roseQueenBonus?.pending).toBe(true);

    // Player 1 discards instead of using bonus
    const discardMove: GameMove = {
      type: 'discard',
      playerId: player1Id,
      timestamp: Date.now() + 1000,
      cards: [{ id: 'num1', type: 'number', value: 5 }]
    };

    const result = game.playMove(discardMove);
    expect(result.isValid).toBe(true);

    state = game.getState();

    // Rose Queen bonus should be cancelled
    expect(state.roseQueenBonus?.pending).toBe(false);

    // Turn should advance to next player
    expect(state.currentPlayerIndex).toBe(1);
  });
});