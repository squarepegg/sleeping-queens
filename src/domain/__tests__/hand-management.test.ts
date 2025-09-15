import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';

describe('Hand Management - Consistent Hand Size', () => {
  let game: GameEngineAdapter;

  beforeEach(() => {
    game = new GameEngineAdapter();

    // Add two players
    game.addPlayer({ id: 'p1', name: 'Player 1', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

    // Start game
    game.startGame();
  });

  const checkHandSizes = () => {
    const state = game.getState();
    state.players.forEach(player => {
      expect(player.hand.length).toBe(5);
    });
  };

  test('Playing a Jester that reveals an action card should maintain hand size', () => {
    const state = game.getState();
    const player = state.players[0];

    // Give player a jester
    let jesterCard;
    const jesterIndex = player.hand.findIndex(c => c.type === 'jester');
    if (jesterIndex === -1) {
      jesterCard = { id: 'test-jester', type: 'jester', name: 'Jester' };
      player.hand[0] = jesterCard;
      (game as any).setState(state); // Persist the change
    } else {
      jesterCard = player.hand[jesterIndex];
    }

    // Force an action card to be revealed (push to end since deck.pop() draws from end)
    const kingCard = { id: 'revealed-king', type: 'king', name: 'King' };
    state.deck.push(kingCard);
    (game as any).setState(state);

    // Play the jester
    const result = game.playMove({
      type: 'play_jester',
      playerId: 'p1',
      cards: [jesterCard],
      timestamp: Date.now()
    });

    expect(result.isValid).toBe(true);

    // Check hand size is still 5
    checkHandSizes();
  });

  test('Playing a King and waking a queen should maintain hand size', () => {
    const state = game.getState();
    const player = state.players[0];

    // Give player a king
    let kingCard;
    const kingIndex = player.hand.findIndex(c => c.type === 'king');
    if (kingIndex === -1) {
      kingCard = { id: 'test-king', type: 'king', name: 'King' };
      player.hand[0] = kingCard;
      (game as any).setState(state); // Persist the change
    } else {
      kingCard = player.hand[kingIndex];
    }

    // Get a sleeping queen to target
    const targetQueen = state.sleepingQueens[0];

    // Play the king directly with a target queen
    const playResult = game.playMove({
      type: 'play_king',
      playerId: 'p1',
      cards: [kingCard],
      targetCard: targetQueen,
      timestamp: Date.now()
    });

    expect(playResult.isValid).toBe(true);

    // Check hand size is still 5
    checkHandSizes();
  });

  test('Playing a Knight (no defense) should maintain hand size', () => {
    const state = game.getState();
    const player1 = state.players[0];
    const player2 = state.players[1];

    // Give player2 a queen
    const queenToSteal = state.sleepingQueens[0];
    queenToSteal.isAwake = true;
    player2.queens.push(queenToSteal);
    state.sleepingQueens.shift();

    // Give player1 a knight
    let knightCard;
    const knightIndex = player1.hand.findIndex(c => c.type === 'knight');
    if (knightIndex === -1) {
      knightCard = { id: 'test-knight', type: 'knight', name: 'Knight' };
      player1.hand[0] = knightCard;
    } else {
      knightCard = player1.hand[knightIndex];
    }

    // Remove any dragons from player2
    player2.hand = player2.hand.filter(c => c.type !== 'dragon');

    // Persist all changes
    (game as any).setState(state);

    // Play the knight directly
    const playResult = game.playMove({
      type: 'play_knight',
      playerId: 'p1',
      cards: [knightCard],
      targetCard: queenToSteal,
      targetPlayer: 'p2',
      timestamp: Date.now()
    });

    expect(playResult.isValid).toBe(true);

    // Check hand sizes
    checkHandSizes();
  });

  test('Playing number cards (discard) should maintain hand size', () => {
    const state = game.getState();
    const player = state.players[0];

    // Find a number card
    const numberCard = player.hand.find(c => c.type === 'number');

    if (numberCard) {
      const result = game.playMove({
        type: 'discard',
        playerId: 'p1',
        cards: [numberCard],
        timestamp: Date.now()
      });

      expect(result.isValid).toBe(true);

      // Check hand size is still 5
      checkHandSizes();
    }
  });

  test('Playing a pair should maintain hand size', () => {
    const state = game.getState();
    const player = state.players[0];

    // Give player a pair
    const card1 = { id: 'num1', type: 'number', value: 5 };
    const card2 = { id: 'num2', type: 'number', value: 5 };
    player.hand[0] = card1;
    player.hand[1] = card2;
    (game as any).setState(state); // Persist the change

    const result = game.playMove({
      type: 'discard',
      playerId: 'p1',
      cards: [card1, card2],
      timestamp: Date.now()
    });

    expect(result.isValid).toBe(true);

    // Check hand size is still 5
    checkHandSizes();
  });

  test('Playing an equation should maintain hand size', () => {
    const state = game.getState();
    const player = state.players[0];

    // Give player cards for equation 2 + 3 = 5
    const card1 = { id: 'num1', type: 'number', value: 2 };
    const card2 = { id: 'num2', type: 'number', value: 3 };
    const card3 = { id: 'num3', type: 'number', value: 5 };
    player.hand[0] = card1;
    player.hand[1] = card2;
    player.hand[2] = card3;
    (game as any).setState(state); // Persist the change

    const result = game.playMove({
      type: 'play_math',
      playerId: 'p1',
      cards: [card1, card2, card3],
      timestamp: Date.now()
    });

    expect(result.isValid).toBe(true);

    // Check hand size is still 5
    checkHandSizes();
  });
});