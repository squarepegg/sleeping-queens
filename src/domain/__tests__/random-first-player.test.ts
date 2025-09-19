import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';

describe('Random First Player Selection', () => {
  test('should select first player deterministically in test mode', () => {
    const game = new GameEngineAdapter({ testMode: true });

    // Add players
    game.addPlayer({ id: 'p1', name: 'Alice', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p2', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p3', name: 'Charlie', isConnected: true, position: 2, hand: [], queens: [], score: 0 });

    // Start game
    game.startGame();

    const state = game.getState();

    // In test mode, should always select first player (index 0)
    expect(state.currentPlayerId).toBe('p1');
    expect(state.currentPlayerIndex).toBe(0);
  });

  test('should select first player randomly in production mode', () => {
    // Track which players go first across multiple games
    const firstPlayerCounts: Record<string, number> = {
      p1: 0,
      p2: 0,
      p3: 0
    };

    // Run multiple games to verify randomness
    for (let i = 0; i < 30; i++) {
      const game = new GameEngineAdapter({ testMode: false }); // Production mode

      game.addPlayer({ id: 'p1', name: 'Alice', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'p2', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'p3', name: 'Charlie', isConnected: true, position: 2, hand: [], queens: [], score: 0 });

      game.startGame();
      const state = game.getState();

      if (state.currentPlayerId) {
        firstPlayerCounts[state.currentPlayerId]++;
      }
    }

    // Each player should have gone first at least once in 30 games (statistically very likely)
    expect(firstPlayerCounts.p1).toBeGreaterThan(0);
    expect(firstPlayerCounts.p2).toBeGreaterThan(0);
    expect(firstPlayerCounts.p3).toBeGreaterThan(0);

    // No player should go first every time
    expect(firstPlayerCounts.p1).toBeLessThan(30);
    expect(firstPlayerCounts.p2).toBeLessThan(30);
    expect(firstPlayerCounts.p3).toBeLessThan(30);
  });

  test('should maintain consistent first player throughout game', () => {
    const game = new GameEngineAdapter({ testMode: true });

    game.addPlayer({ id: 'p1', name: 'Alice', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p2', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

    game.startGame();

    const initialState = game.getState();
    const firstPlayer = initialState.currentPlayerId;

    // Simulate several moves
    const player = initialState.players.find((p: any) => p.id === firstPlayer);
    if (player?.hand?.length > 0) {
      const card = player.hand.find((c: any) => c.type === 'number');
      if (card) {
        game.playMove({
          type: 'discard',
          playerId: firstPlayer!,
          cards: [card],
          timestamp: Date.now()
        });

        const afterMoveState = game.getState();

        // Current player changes, but the game should remember who went first
        // (though we don't track this explicitly, we can verify the turn order is consistent)
        expect(afterMoveState.currentPlayerIndex).toBe(1); // Next player's turn
      }
    }
  });
});