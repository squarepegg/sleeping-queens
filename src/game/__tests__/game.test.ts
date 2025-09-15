import { GameEngine as SleepingQueensGame } from '../engine/GameEngine';
import { GameState, GameMove, Player, Queen, NumberCard } from '../types';
import { GAME_CONFIG } from '../cards';

describe('SleepingQueensGame', () => {
  let game: SleepingQueensGame;

  beforeEach(() => {
    game = new SleepingQueensGame();
  });

  describe('Game Initialization', () => {
    test('should initialize game with correct default state', () => {
      const state = game.getState();
      
      expect(state.id).toBeDefined();
      expect(state.players).toEqual([]);
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.sleepingQueens).toHaveLength(12);
      expect(state.deck.length).toBeGreaterThan(0);
      expect(state.discardPile).toEqual([]);
      expect(state.phase).toBe('waiting');
      expect(state.winner).toBeNull();
      expect(state.roomCode).toBeDefined();
      expect(state.maxPlayers).toBe(GAME_CONFIG.maxPlayers);
    });

    test('should accept initial state', () => {
      const initialState: Partial<GameState> = {
        id: 'test-game',
        maxPlayers: 3,
      currentPlayerId: null,
      version: 1,
        roomCode: 'TEST01'
      };

      const customGame = new SleepingQueensGame(initialState);
      const state = customGame.getState();
      
      expect(state.id).toBe('test-game');
      expect(state.maxPlayers).toBe(3);
      expect(state.roomCode).toBe('TEST01');
    });
  });

  describe('Player Management', () => {
    test('should add players successfully', () => {
      const player = {
        id: 'player1',
        name: 'Test Player',
        isConnected: true,
        position: 0,
        hand: [],
        queens: [],
        score: 0
      };

      const success = game.addPlayer(player);
      expect(success).toBe(true);

      const state = game.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].name).toBe('Test Player');
      expect(state.players[0].hand).toEqual([]);
      expect(state.players[0].queens).toEqual([]);
      expect(state.players[0].position).toBe(0);
    });

    test('should not add more than maxPlayers', () => {
      // Add maximum players
      for (let i = 0; i < GAME_CONFIG.maxPlayers; i++) {
        game.addPlayer({
          id: `player${i}`,
          name: `Player ${i}`,
          isConnected: true,
          position: i,
          hand: [],
          queens: [],
          score: 0
        });
      }

      // Try to add one more
      const success = game.addPlayer({
        id: 'extra-player',
        name: 'Extra Player',
        isConnected: true,
        position: 0,
        hand: [],
        queens: [],
        score: 0
      });

      expect(success).toBe(false);
      expect(game.getState().players).toHaveLength(GAME_CONFIG.maxPlayers);
    });

    test('should not add duplicate players', () => {
      const player = {
        id: 'player1',
        name: 'Test Player',
        isConnected: true,
        position: 0,
        hand: [],
        queens: [],
        score: 0
      };

      game.addPlayer(player);
      const success = game.addPlayer(player);

      expect(success).toBe(false);
      expect(game.getState().players).toHaveLength(1);
    });

    test('should remove players successfully', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

      const success = game.removePlayer('player1');
      expect(success).toBe(true);

      const state = game.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].name).toBe('Player 2');
      expect(state.players[0].position).toBe(0); // Position should be updated
    });

    test('should adjust current player index when removing players', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player3', name: 'Player 3', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

      // Set current player to last player
      const state = game.getState();
      state.currentPlayerIndex = 2;

      // Remove last player
      game.removePlayer('player3');
      
      const newState = game.getState();
      expect(newState.currentPlayerIndex).toBe(0); // Should wrap to 0
    });
  });

  describe('Game Start', () => {
    test('should start game with enough players', () => {
      // Add minimum players
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

      const success = game.startGame();
      expect(success).toBe(true);

      const state = game.getState();
      expect(state.phase).toBe('playing');
      
      // Each player should have initial hand
      state.players.forEach(player => {
        expect(player.hand).toHaveLength(GAME_CONFIG.initialHandSize);
      });
    });

    test('should not start game without enough players', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });

      const success = game.startGame();
      expect(success).toBe(false);
      expect(game.getState().phase).toBe('waiting');
    });

    test('should not start already started game', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      
      game.startGame();
      const secondStart = game.startGame();
      
      expect(secondStart).toBe(false);
    });
  });

  describe('Game Moves', () => {
    beforeEach(() => {
      // Set up game with 2 players
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.startGame();
    });

    test('should play king move successfully', () => {
      const state = (game as any).getInternalState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Give player a king
      currentPlayer.hand.push({ id: 'king1', type: 'king' as const, name: 'King' });
      
      const targetQueen = state.sleepingQueens[0];
      const move: GameMove = {
        type: 'play_king',
        playerId: currentPlayer.id,
        cards: [{ id: 'king1', type: 'king' as const, name: 'King' }],
        targetCard: targetQueen,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      const newState = game.getState();
      // Queen should be moved to player's queens
      expect(newState.sleepingQueens.find(q => q.id === targetQueen.id)).toBeUndefined();
      expect(newState.players[newState.currentPlayerIndex === 0 ? 1 : 0].queens.find(q => q.id === targetQueen.id)).toBeDefined();
      
      // King should be in discard pile (check any king type card was discarded)
      expect(newState.discardPile.some(card => card.type === 'king')).toBe(true);
    });

    test('should reject invalid king move', () => {
      const state = (game as any).getInternalState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Try to play a fake king card not in hand
      const fakeKing = { id: 'fake-king', type: 'king' as const, name: 'Fake King' };
      
      const targetQueen = state.sleepingQueens[0];
      const move: GameMove = {
        type: 'play_king',
        playerId: currentPlayer.id,
        cards: [fakeKing],
        targetCard: targetQueen,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(false);
      // The error will be "Card is not a king" since we're checking card type
      expect(result.error).toBeDefined();
    });

    test('should handle knight attack', () => {
      const state = (game as any).getInternalState();
      const attacker = state.players[0];
      const target = state.players[1];
      
      // Clear target's hand to ensure no dragon
      target.hand = [];
      
      // Give attacker a knight
      attacker.hand.push({ id: 'knight1', type: 'knight' as const, name: 'Knight' });
      
      // Give target a queen
      const queen: Queen = { id: 'queen1', type: 'queen' as const, name: 'Test Queen', points: 10, isAwake: true };
      target.queens.push(queen);

      const move: GameMove = {
        type: 'play_knight',
        playerId: attacker.id,
        cards: [{ id: 'knight1', type: 'knight' as const, name: 'Knight' }],
        targetPlayer: target.id,
        targetCard: queen,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Since target has no dragon, attack completes immediately
      const stateAfterAttack = game.getState();
      expect(stateAfterAttack.pendingKnightAttack).toBeUndefined();

      const newAttacker = stateAfterAttack.players[0];
      const newTarget = stateAfterAttack.players[1];

      // Queen should already be moved from target to attacker
      expect(newTarget.queens.find(q => q.id === queen.id)).toBeUndefined();
      expect(newAttacker.queens.find(q => q.id === queen.id)).toBeDefined();
    });

    test('should handle math equation move', () => {
      const state = (game as any).getInternalState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      // Give player number cards for valid equation
      const numberCards: NumberCard[] = [
        { id: 'num2', type: 'number' as const, value: 2, name: '2' },
        { id: 'num3', type: 'number' as const, value: 3, name: '3' },
        { id: 'num5', type: 'number' as const, value: 5, name: '5' }
      ];
      
      currentPlayer.hand.push(...numberCards);

      const move: GameMove = {
        type: 'play_math',
        playerId: currentPlayer.id,
        cards: numberCards,
        mathEquation: {
          cards: numberCards,
          equation: '2 + 3 = 5',
          result: 5
        },
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      const newState = game.getState();
      // Cards should be in discard pile
      numberCards.forEach(card => {
        expect(newState.discardPile.some(discardCard => discardCard.id === card.id)).toBe(true);
      });
    });

    test('should handle single card discard move', () => {
      const state = game.getState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      
      const cardsToDiscard = [currentPlayer.hand[0]]; // Just one card
      const originalHandSize = currentPlayer.hand.length;

      const move: GameMove = {
        type: 'discard',
        playerId: currentPlayer.id,
        cards: cardsToDiscard,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      const newState = game.getState();
      const newPlayer = newState.players[state.currentPlayerIndex];
      
      // Player should have same hand size (discarded + drew new)
      expect(newPlayer.hand.length).toBe(originalHandSize);
      
      // Discarded card should be in discard pile
      cardsToDiscard.forEach(card => {
        expect(newState.discardPile.some(discardCard => discardCard.id === card.id)).toBe(true);
      });
    });
  });

  describe('Turn Management', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player3', name: 'Player 3', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.startGame();
    });

    test('should advance turn after successful move', () => {
      const initialState = (game as any).getInternalState();
      const initialPlayerIndex = initialState.currentPlayerIndex;
      const currentPlayer = initialState.players[initialPlayerIndex];
      
      // Give player a king and make a move
      currentPlayer.hand.push({ id: 'king1', type: 'king' as const, name: 'King' });
      
      const move: GameMove = {
        type: 'play_king',
        playerId: currentPlayer.id,
        cards: [{ id: 'king1', type: 'king' as const, name: 'King' }],
        targetCard: initialState.sleepingQueens[0],
        timestamp: Date.now()
      };

      game.playMove(move);
      
      const newState = game.getState();
      expect(newState.currentPlayerIndex).toBe((initialPlayerIndex + 1) % initialState.players.length);
    });

    test('should get current turn player', () => {
      const state = game.getState();
      const currentPlayer = game.getCurrentTurnPlayer();
      
      expect(currentPlayer).toEqual(state.players[state.currentPlayerIndex]);
    });
  });

  describe('Win Conditions', () => {
    beforeEach(() => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.startGame();
    });

    test('should end game when player reaches queen limit', () => {
      const state = (game as any).getInternalState();
      const player = state.players[0];
      
      // Give player enough queens to win (5 for 2-player game)
      for (let i = 0; i < 5; i++) {
        player.queens.push({
          id: `queen${i}`,
          type: 'queen' as const,
          name: `Queen ${i}`,
          points: 10,
          isAwake: true
        });
      }
      
      player.score = 50; // Update score
      
      // Make a move to trigger win check
      player.hand.push({ id: 'king1', type: 'king' as const, name: 'King' });
      
      const move: GameMove = {
        type: 'play_king',
        playerId: player.id,
        cards: [{ id: 'king1', type: 'king' as const, name: 'King' }],
        targetCard: state.sleepingQueens[0],
        timestamp: Date.now()
      };

      game.playMove(move);
      
      const newState = game.getState();
      expect(newState.phase).toBe('ended');
      expect(newState.winner).toBe(player.id);
    });
  });


  describe('Edge Cases', () => {
    test('should handle empty deck gracefully', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.startGame();
      
      const state = game.getState();
      
      // Empty the deck
      state.deck = [];
      state.discardPile = [];
      
      const player = state.players[0];
      player.hand = []; // Empty hand
      
      // Try to discard (which would normally draw cards)
      const move: GameMove = {
        type: 'discard',
        playerId: player.id,
        cards: [],
        timestamp: Date.now()
      };

      // Should handle gracefully without crashing
      const result = game.playMove(move);
      expect(result.isValid).toBe(false);
    });

    test('should handle player disconnection during game', () => {
      game.addPlayer({ id: 'player1', name: 'Player 1', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.addPlayer({ id: 'player2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
      game.startGame();

      const success = game.removePlayer('player1');
      expect(success).toBe(true);

      const state = game.getState();
      
      // Game should end if not enough players
      if (state.players.length < GAME_CONFIG.minPlayers) {
        expect(state.phase).toBe('ended');
      }
    });
  });
});