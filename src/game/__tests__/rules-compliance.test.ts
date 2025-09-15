import { GameEngine } from '../engine/GameEngine';
import { GameState, GameMove, Queen, Card } from '../types';
import { GAME_CONFIG } from '../cards';

describe('Rules Compliance Tests', () => {
  let game: GameEngine;

  beforeEach(() => {
    game = new GameEngine();
    game.addPlayer({ id: 'p1', name: 'Player 1', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p2', name: 'Player 2', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.startGame();
  });

  describe('Win Conditions', () => {
    it('should have correct win conditions for 2-3 players', () => {
      expect(GAME_CONFIG.queensToWin[2]).toBe(5);
      expect(GAME_CONFIG.queensToWin[3]).toBe(5);
      expect(GAME_CONFIG.pointsToWin[2]).toBe(50);
      expect(GAME_CONFIG.pointsToWin[3]).toBe(50);
    });

    it('should have correct win conditions for 4-5 players', () => {
      expect(GAME_CONFIG.queensToWin[4]).toBe(4);
      expect(GAME_CONFIG.queensToWin[5]).toBe(4);
      expect(GAME_CONFIG.pointsToWin[4]).toBe(40);
      expect(GAME_CONFIG.pointsToWin[5]).toBe(40);
    });
  });

  describe('Rose Queen Special Power', () => {
    it('should allow waking an additional queen when Rose Queen is awakened from center', () => {
      const state = game.getState();
      const player = state.players.find(p => p.id === 'p1');
      if (!player) throw new Error('Player p1 not found');

      // Find an existing king in player's hand or add one
      let kingCard = player.hand.find(c => c.type === 'king');
      if (!kingCard) {
        // Replace first card with a king and update the state
        kingCard = { id: player.hand[0].id, type: 'king', name: 'Test King' };
        player.hand[0] = kingCard;
        // Use setState to persist our changes
        (game as any).setState(state);
      }

      // Find Rose Queen in sleeping queens
      let roseQueen = state.sleepingQueens.find(q => q.name === 'Rose Queen');
      if (!roseQueen) {
        // Replace first sleeping queen with Rose Queen if not present
        roseQueen = {
          id: state.sleepingQueens[0].id,
          type: 'queen',
          name: 'Rose Queen',
          points: 5,
          isAwake: false
        };
        state.sleepingQueens[0] = roseQueen;
        // Use setState to persist our changes
        (game as any).setState(state);
      }

      // Play king to wake Rose Queen
      const move: GameMove = {
        type: 'play_king',
        playerId: 'p1',
        cardId: kingCard.id,
        targetQueenId: roseQueen?.id,
        timestamp: Date.now()
      };

      // Verify king is in hand
      if (!kingCard) {
        throw new Error('No king card available');
      }

      const result = game.playMove(move);
      if (!result.isValid) {
        console.error('Rose Queen move failed:', result.error);
      }
      expect(result.isValid).toBe(true);

      // Check that Rose Queen bonus is active
      const newState = game.getState();
      expect(newState.roseQueenBonus).toBeDefined();
      expect(newState.roseQueenBonus?.playerId).toBe('p1');
      expect(newState.roseQueenBonus?.pending).toBe(true);
    });

    it('should NOT give bonus when Rose Queen is stolen', () => {
      const state = game.getState();
      const player1 = state.players.find(p => p.id === 'p1');
      const player2 = state.players.find(p => p.id === 'p2');
      if (!player1 || !player2) throw new Error('Players not found');

      // Give player2 the Rose Queen
      const roseQueen: Queen = {
        id: 'queen-rose',
        type: 'queen',
        name: 'Rose Queen',
        points: 5,
        isAwake: true
      };
      player2.queens.push(roseQueen);

      // Find or add a knight to player1's hand
      let knightCard = player1.hand.find(c => c.type === 'knight');
      if (!knightCard) {
        knightCard = { id: player1.hand[0].id, type: 'knight', name: 'Knight' };
        player1.hand[0] = knightCard;
      }

      // Remove dragons from player2 to ensure immediate steal
      player2.hand = player2.hand.filter(c => c.type !== 'dragon');

      // Update state to persist all changes
      (game as any).setState(state);

      // Play knight to steal Rose Queen
      const move: GameMove = {
        type: 'play_knight',
        playerId: 'p1',
        cardId: knightCard.id,
        targetPlayerId: 'p2',
        targetQueenId: roseQueen.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that Rose Queen bonus is NOT active
      const newState = game.getState();
      expect(newState.roseQueenBonus).toBeUndefined();
    });
  });

  describe('Cat/Dog Queen Conflict', () => {
    it('should return newest queen when both Cat and Dog Queens are acquired', () => {
      const state = game.getState();
      const player = state.players.find(p => p.id === 'p1');
      if (!player) throw new Error('Player p1 not found');

      // Give player Cat Queen first
      const catQueen: Queen = {
        id: 'queen-cat',
        type: 'queen',
        name: 'Cat Queen',
        points: 15,
        isAwake: true
      };
      player.queens.push(catQueen);

      // Find or add a king to player's hand
      let kingCard = player.hand.find(c => c.type === 'king');
      if (!kingCard) {
        kingCard = { id: player.hand[0].id, type: 'king', name: 'King' };
        player.hand[0] = kingCard;
      }

      // Ensure Dog Queen is in sleeping queens
      let dogQueen = state.sleepingQueens.find(q => q.name === 'Dog Queen');
      if (!dogQueen) {
        // Replace first sleeping queen with Dog Queen
        dogQueen = {
          id: state.sleepingQueens[0].id,
          type: 'queen',
          name: 'Dog Queen',
          points: 15,
          isAwake: false
        };
        state.sleepingQueens[0] = dogQueen;
      }

      // Update state to persist all changes
      (game as any).setState(state);

      const initialQueenCount = player.queens.length;

      // Play king to wake Dog Queen
      const move: GameMove = {
        type: 'play_king',
        playerId: 'p1',
        cardId: kingCard.id,
        targetQueenId: dogQueen.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that player still has only one queen (Cat Queen)
      const newState = game.getState();
      const newPlayer = newState.players.find(p => p.id === 'p1');
      if (!newPlayer) throw new Error('Player p1 not found');

      // Should have Cat Queen (first acquired) but not Dog Queen
      expect(newPlayer.queens.some(q => q.name === 'Cat Queen')).toBe(true);
      expect(newPlayer.queens.some(q => q.name === 'Dog Queen')).toBe(false);

      // Dog Queen should be back in sleeping queens
      expect(newState.sleepingQueens.some(q => q.name === 'Dog Queen')).toBe(true);
    });
  });

  describe('Math Equations', () => {
    it('should accept valid addition equations', () => {
      const { isValidMathEquation } = require('../cards');

      // Test 2 + 3 = 5
      const cards1 = [
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
        { type: 'number', value: 5 }
      ];
      expect(isValidMathEquation(cards1)).toBe(true);

      // Test 2 + 3 + 4 = 9
      const cards2 = [
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
        { type: 'number', value: 4 },
        { type: 'number', value: 9 }
      ];
      expect(isValidMathEquation(cards2)).toBe(true);
    });

    it('should reject invalid equations', () => {
      const { isValidMathEquation } = require('../cards');

      // Test 2 + 3 ≠ 6
      const cards = [
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
        { type: 'number', value: 6 }
      ];
      expect(isValidMathEquation(cards)).toBe(false);
    });

    it('should reject multiplication equations (not in official rules)', () => {
      const { isValidMathEquation } = require('../cards');

      // Test 2 × 3 = 6 (should be invalid per official rules)
      const cards = [
        { type: 'number', value: 2 },
        { type: 'number', value: 3 },
        { type: 'number', value: 6 }
      ];
      expect(isValidMathEquation(cards)).toBe(false);
    });
  });

  describe('Defense Windows', () => {
    it('should create immediate defense window for Knight attacks', () => {
      const state = game.getState();
      const player1 = state.players.find(p => p.id === 'p1');
      const player2 = state.players.find(p => p.id === 'p2');
      if (!player1 || !player2) throw new Error('Players not found');

      // Give player2 a queen and a dragon
      const queen: Queen = {
        id: 'queen-test',
        type: 'queen',
        name: 'Test Queen',
        points: 10,
        isAwake: true
      };
      player2.queens.push(queen);

      // Ensure player2 has a dragon
      let dragonCard = player2.hand.find(c => c.type === 'dragon');
      if (!dragonCard) {
        dragonCard = { id: player2.hand[0].id, type: 'dragon', name: 'Dragon' };
        player2.hand[0] = dragonCard;
      }

      // Find or add a knight to player1's hand
      let knightCard = player1.hand.find(c => c.type === 'knight');
      if (!knightCard) {
        knightCard = { id: player1.hand[0].id, type: 'knight', name: 'Knight' };
        player1.hand[0] = knightCard;
      }

      // Update state to persist changes
      (game as any).setState(state);

      // Play knight
      const move: GameMove = {
        type: 'play_knight',
        playerId: 'p1',
        cardId: knightCard.id,
        targetPlayerId: 'p2',
        targetQueenId: queen.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that pending attack exists with defense deadline
      const newState = game.getState();
      expect(newState.pendingKnightAttack).toBeDefined();
      expect(newState.pendingKnightAttack?.defenseDeadline).toBeGreaterThan(Date.now());
    });

    it('should complete attack immediately if defender has no defense card', () => {
      const state = game.getState();
      const player1 = state.players.find(p => p.id === 'p1');
      const player2 = state.players.find(p => p.id === 'p2');
      if (!player1 || !player2) throw new Error('Players not found');

      // Give player2 a queen but NO dragon
      const queen: Queen = {
        id: 'queen-test2',
        type: 'queen',
        name: 'Test Queen',
        points: 10,
        isAwake: true
      };
      player2.queens.push(queen);
      player2.hand = player2.hand.filter(c => c.type !== 'dragon');

      // Find or add a knight to player1's hand
      let knightCard = player1.hand.find(c => c.type === 'knight');
      if (!knightCard) {
        knightCard = { id: player1.hand[0].id, type: 'knight', name: 'Knight' };
        player1.hand[0] = knightCard;
      }

      // Update state to persist changes
      (game as any).setState(state);

      // Play knight
      const move: GameMove = {
        type: 'play_knight',
        playerId: 'p1',
        cardId: knightCard.id,
        targetPlayerId: 'p2',
        targetQueenId: queen.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that attack completed immediately (no pending attack)
      const newState = game.getState();
      expect(newState.pendingKnightAttack).toBeUndefined();

      // Queen should be stolen - check in the new state
      const newPlayer1 = newState.players.find(p => p.id === 'p1');
      const newPlayer2 = newState.players.find(p => p.id === 'p2');
      expect(newPlayer1?.queens.some(q => q.id === queen.id)).toBe(true);
      expect(newPlayer2?.queens.some(q => q.id === queen.id)).toBe(false);
    });
  });

  describe('Jester Card', () => {
    it('should give extra turn when power card is revealed', () => {
      const state = game.getState();
      const player = state.players.find(p => p.id === 'p1');
      if (!player) throw new Error('Player p1 not found');

      // Find or add a jester to player's hand
      let jesterCard = player.hand.find(c => c.type === 'jester');
      if (!jesterCard) {
        jesterCard = { id: player.hand[0].id, type: 'jester', name: 'Jester' };
        player.hand[0] = jesterCard;
      }

      // Put a King on top of deck
      const kingCard: Card = { id: 'king-deck', type: 'king', name: 'King' };
      state.deck.push(kingCard);

      // Update state to persist changes
      (game as any).setState(state);

      // Play jester
      const move: GameMove = {
        type: 'play_jester',
        playerId: 'p1',
        cardId: jesterCard.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that player gets the king and it's still their turn
      const newState = game.getState();
      expect(newState.currentPlayerId).toBe('p1'); // Still player 1's turn
      const newPlayer = newState.players.find(p => p.id === 'p1');
      expect(newPlayer?.hand.some(c => c.id === 'king-deck')).toBe(true);
    });

    it('should count correctly for number cards', () => {
      const state = game.getState();
      const player1 = state.players.find(p => p.id === 'p1');
      if (!player1) throw new Error('Player p1 not found');

      // Find or add a jester to player1's hand
      let jesterCard = player1.hand.find(c => c.type === 'jester');
      if (!jesterCard) {
        jesterCard = { id: player1.hand[0].id, type: 'jester', name: 'Jester' };
        player1.hand[0] = jesterCard;
      }

      // Put a number 1 on top of deck (should go to next player)
      const numberCard: Card = { id: 'number-1', type: 'number', value: 1 };
      state.deck.push(numberCard);

      // Update state to persist changes
      (game as any).setState(state);

      // Play jester
      const move: GameMove = {
        type: 'play_jester',
        playerId: 'p1',
        cardId: jesterCard.id,
        timestamp: Date.now()
      };

      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      // Check that player2 gets to select a queen
      const newState = game.getState();
      expect(newState.jesterReveal).toBeDefined();
      expect(newState.jesterReveal?.targetPlayerId).toBe('p2');
    });
  });

  describe('Card Distribution', () => {
    it('should have exactly 12 queens', () => {
      const { QUEENS } = require('../cards');
      expect(QUEENS.length).toBe(12);
    });

    it('should have correct number of each action card', () => {
      const { ACTION_CARDS } = require('../cards');

      const kings = ACTION_CARDS.filter((c: Card) => c.type === 'king');
      const knights = ACTION_CARDS.filter((c: Card) => c.type === 'knight');
      const dragons = ACTION_CARDS.filter((c: Card) => c.type === 'dragon');
      const wands = ACTION_CARDS.filter((c: Card) => c.type === 'wand');
      const potions = ACTION_CARDS.filter((c: Card) => c.type === 'potion');
      const jesters = ACTION_CARDS.filter((c: Card) => c.type === 'jester');

      expect(kings.length).toBe(8);
      expect(knights.length).toBe(4);
      expect(dragons.length).toBe(3);
      expect(wands.length).toBe(3);
      expect(potions.length).toBe(4);
      expect(jesters.length).toBe(5);
    });

    it('should have 4 of each number 1-10', () => {
      const { NUMBER_CARDS } = require('../cards');

      for (let value = 1; value <= 10; value++) {
        const cards = NUMBER_CARDS.filter((c: Card) => (c as any).value === value);
        expect(cards.length).toBe(4);
      }
    });
  });
});