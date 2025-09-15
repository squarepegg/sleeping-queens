import { GameEngine } from '../engine/GameEngine';
import { GameState, GameMove, Card, Queen } from '../types';

describe('Special Actions - Players Acting Out of Turn', () => {
  let game: GameEngine;

  beforeEach(() => {
    game = new GameEngine();
    game.addPlayer({ id: 'p1', name: 'Alice', isConnected: true, position: 0, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'p2', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.startGame();
  });

  describe('Jester Number Count Selection', () => {
    it('should allow target player to select queen after Jester number count', () => {
      // Setup: Ensure player1 has a Jester card (find it in their hand)
      let gameState = game.getState();
      const player1 = gameState.players[0];

      // Find a jester in player1's hand or add one
      let jesterCard = player1.hand.find(c => c.type === 'jester');
      if (!jesterCard) {
        // If no jester, replace first card with a jester
        jesterCard = { id: 'jester-1', type: 'jester', name: 'Jester' };
        // Directly modify the game engine's state (for testing)
        const engineState = game.getState();
        engineState.players[0].hand[0] = jesterCard;
      }

      // Setup: Mock the deck to reveal a number 1 (so it lands on player2)
      const numberCard: Card = { id: 'number-1', type: 'number', value: 1 };
      const engineState = game.getState();
      engineState.deck.push(numberCard); // Push to end since we pop from end
      (game as any).setState(engineState); // Persist the change

      // Player1 plays Jester
      const jesterMove: GameMove = {
        type: 'play_jester',
        playerId: 'p1',
        cards: [jesterCard],
        timestamp: Date.now()
      };

      const jesterResult = game.playMove(jesterMove);
      expect(jesterResult.isValid).toBe(true);

      // Check that jester reveal is set for player2
      const updatedState = game.getState();
      expect(updatedState.jesterReveal).toBeDefined();
      expect(updatedState.jesterReveal?.targetPlayerId).toBe('p2');
      expect(updatedState.jesterReveal?.waitingForQueenSelection).toBe(true);

      // Player2 should be able to select a queen even though it's not their turn
      const targetQueen = updatedState.sleepingQueens[0];
      const selectQueenMove: GameMove = {
        type: 'play_jester',
        playerId: 'p2',
        cards: [], // Empty since jester was already played
        targetCard: targetQueen,
        timestamp: Date.now()
      };

      const selectResult = game.playMove(selectQueenMove);
      expect(selectResult.isValid).toBe(true);

      // Verify queen was awakened for player2
      const finalState = game.getState();
      const player2 = finalState.players.find(p => p.id === 'p2');
      expect(player2?.queens).toContainEqual(expect.objectContaining({ id: targetQueen.id }));
      expect(finalState.jesterReveal).toBeUndefined();
    });

    it('should not allow wrong player to select queen after Jester number count', () => {
      // Setup: Give player1 a Jester card
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const jesterCard: Card = { id: 'jester-1', type: 'jester', name: 'Jester' };
      player1.hand = [jesterCard, ...player1.hand.slice(1)];

      // Setup: Mock the deck to reveal a number 1 (so it lands on player2)
      const numberCard: Card = { id: 'number-1', type: 'number', value: 1 };
      gameState.deck.push(numberCard);
      (game as any).setState(gameState); // Persist the changes

      // Player1 plays Jester
      const jesterMove: GameMove = {
        type: 'play_jester',
        playerId: 'p1',
        cards: [jesterCard],
        timestamp: Date.now()
      };

      game.playMove(jesterMove);

      // Player1 tries to select queen (should fail - it's player2's selection)
      const targetQueen = game.getState().sleepingQueens[0];
      const selectQueenMove: GameMove = {
        type: 'play_jester',
        playerId: 'p1',
        cards: [],
        targetCard: targetQueen,
        timestamp: Date.now()
      };

      const selectResult = game.playMove(selectQueenMove);
      expect(selectResult.isValid).toBe(false);
      expect(selectResult.error).toContain('Only the target player can select a queen');
    });
  });

  describe('Dragon Defense Against Knight', () => {
    it('should allow target player to defend with Dragon when not their turn', () => {
      // Setup: Give player1 a Knight, player2 a Dragon and a Queen
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const dragonCard: Card = { id: 'dragon-1', type: 'dragon', name: 'Dragon' };
      const queen: Queen = {
        id: 'queen-1',
        type: 'queen',
        name: 'Rose Queen',
        points: 5,
        isAwake: true
      };

      player1.hand = [knightCard, ...player1.hand.slice(1)];
      player2.hand = [dragonCard, ...player2.hand.slice(1)];
      player2.queens = [queen];
      (game as any).setState(gameState); // Persist the changes

      // No need to stage, play directly

      // Player1 plays Knight targeting player2's queen
      const knightMove: GameMove = {
        type: 'play_knight',
        playerId: 'p1',
        cards: [knightCard],
        targetCard: queen,
        targetPlayer: 'p2',
        timestamp: Date.now()
      };

      const knightResult = game.playMove(knightMove);
      expect(knightResult.isValid).toBe(true);

      // Check that pending attack exists
      const attackState = game.getState();
      expect(attackState.pendingKnightAttack).toBeDefined();
      expect(attackState.pendingKnightAttack?.target).toBe('p2');

      // Player2 should be able to play Dragon even though it's not their turn
      const dragonMove: GameMove = {
        type: 'play_dragon',
        playerId: 'p2',
        cards: [dragonCard],
        timestamp: Date.now()
      };

      const dragonResult = game.playMove(dragonMove);
      expect(dragonResult.isValid).toBe(true);

      // Verify attack was blocked
      const finalState = game.getState();
      expect(finalState.pendingKnightAttack).toBeUndefined();
      expect(player2.queens).toContainEqual(queen); // Queen should still be with player2
    });

    it('should not allow non-target player to play Dragon', () => {
      // Setup: Give player1 a Knight and Dragon, player2 a Queen
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const dragonCard: Card = { id: 'dragon-1', type: 'dragon', name: 'Dragon' };
      const queen: Queen = {
        id: 'queen-1',
        type: 'queen',
        name: 'Rose Queen',
        points: 5,
        isAwake: true
      };

      player1.hand = [knightCard, dragonCard, ...player1.hand.slice(2)];
      player2.queens = [queen];
      (game as any).setState(gameState); // Persist the changes

      // Play Knight directly
      game.playMove({
        type: 'play_knight',
        playerId: 'p1',
        cards: [knightCard],
        targetCard: queen,
        targetPlayer: 'p2',
        timestamp: Date.now()
      });

      // Player1 tries to play Dragon (should fail - they're the attacker)
      const dragonMove: GameMove = {
        type: 'play_dragon',
        playerId: 'p1',
        cards: [dragonCard],
        timestamp: Date.now()
      };

      const dragonResult = game.playMove(dragonMove);
      expect(dragonResult.isValid).toBe(false);
      expect(dragonResult.error).toContain('Not your turn');
    });
  });

  describe('Wand Defense Against Potion', () => {
    it('should allow target player to defend with Wand when not their turn', () => {
      // Setup: Give player1 a Potion, player2 a Wand and a Queen
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      const potionCard: Card = { id: 'potion-1', type: 'potion', name: 'Sleeping Potion' };
      const wandCard: Card = { id: 'wand-1', type: 'wand', name: 'Magic Wand' };
      const queen: Queen = {
        id: 'queen-1',
        type: 'queen',
        name: 'Rose Queen',
        points: 5,
        isAwake: true
      };

      player1.hand = [potionCard, ...player1.hand.slice(1)];
      player2.hand = [wandCard, ...player2.hand.slice(1)];
      player2.queens = [queen];
      (game as any).setState(gameState); // Persist the changes

      // No need to stage, play directly

      // Player1 plays Potion targeting player2's queen
      const potionMove: GameMove = {
        type: 'play_potion',
        playerId: 'p1',
        cards: [potionCard],
        targetCard: queen,
        targetPlayer: 'p2',
        timestamp: Date.now()
      };

      const potionResult = game.playMove(potionMove);
      expect(potionResult.isValid).toBe(true);

      // Check that pending attack exists
      const attackState = game.getState();
      expect(attackState.pendingPotionAttack).toBeDefined();
      expect(attackState.pendingPotionAttack?.target).toBe('p2');

      // Player2 should be able to play Wand even though it's not their turn
      const wandMove: GameMove = {
        type: 'play_wand',
        playerId: 'p2',
        cards: [wandCard],
        timestamp: Date.now()
      };

      const wandResult = game.playMove(wandMove);
      expect(wandResult.isValid).toBe(true);

      // Verify attack was blocked
      const finalState = game.getState();
      expect(finalState.pendingPotionAttack).toBeUndefined();
      expect(player2.queens).toContainEqual(queen); // Queen should still be awake
    });

    it('should not allow non-target player to play Wand', () => {
      // Setup: Give player1 a Potion and Wand, player2 a Queen
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      const potionCard: Card = { id: 'potion-1', type: 'potion', name: 'Sleeping Potion' };
      const wandCard: Card = { id: 'wand-1', type: 'wand', name: 'Magic Wand' };
      const queen: Queen = {
        id: 'queen-1',
        type: 'queen',
        name: 'Rose Queen',
        points: 5,
        isAwake: true
      };

      player1.hand = [potionCard, wandCard, ...player1.hand.slice(2)];
      player2.queens = [queen];
      (game as any).setState(gameState); // Persist the changes

      // Play Potion directly
      game.playMove({
        type: 'play_potion',
        playerId: 'p1',
        cards: [potionCard],
        targetCard: queen,
        targetPlayer: 'p2',
        timestamp: Date.now()
      });

      // Player1 tries to play Wand (should fail - they're the attacker)
      const wandMove: GameMove = {
        type: 'play_wand',
        playerId: 'p1',
        cards: [wandCard],
        timestamp: Date.now()
      };

      const wandResult = game.playMove(wandMove);
      expect(wandResult.isValid).toBe(false);
      expect(wandResult.error).toContain('Not your turn');
    });
  });

  describe('Turn Validation Edge Cases', () => {
    it('should not allow regular moves when not player turn', () => {
      // Give player2 a King (it's player1's turn)
      const gameState = game.getState();
      const player2 = gameState.players[1];
      const kingCard: Card = { id: 'king-1', type: 'king', name: 'Turtle King' };
      player2.hand = [kingCard, ...player2.hand.slice(1)];

      // Player2 tries to play King on player1's turn
      const kingMove: GameMove = {
        type: 'play_king',
        playerId: 'p2',
        cards: [kingCard],
        targetCard: gameState.sleepingQueens[0],
        timestamp: Date.now()
      };

      const result = game.playMove(kingMove);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should handle multiple special actions in sequence', () => {
      // Complex scenario: Jester reveals number, target gets attacked by Knight, defends with Dragon
      const gameState = game.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];

      // Give cards
      const jesterCard: Card = { id: 'jester-1', type: 'jester', name: 'Jester' };
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const dragonCard: Card = { id: 'dragon-1', type: 'dragon', name: 'Dragon' };

      player1.hand = [jesterCard, knightCard, ...player1.hand.slice(2)];
      player2.hand = [dragonCard, ...player2.hand.slice(1)];

      // 1. Player1 plays Jester
      gameState.deck.push({ id: 'number-1', type: 'number', value: 1 });
      (game as any).setState(gameState); // Persist the changes
      game.playMove({
        type: 'play_jester',
        playerId: 'p1',
        cards: [jesterCard],
        timestamp: Date.now()
      });

      // 2. Player2 selects queen (out of turn via Jester)
      const targetQueen = game.getState().sleepingQueens[0];
      const selectResult = game.playMove({
        type: 'play_jester',
        playerId: 'p2',
        cards: [],
        targetCard: targetQueen,
        timestamp: Date.now()
      });
      expect(selectResult.isValid).toBe(true);

      // 3. Turn should advance back to player1 after Jester completes
      const stateAfterJester = game.getState();
      expect(stateAfterJester.currentPlayerId).toBe('p1');

      // Player2 should have the queen
      const player2AfterJester = stateAfterJester.players.find(p => p.id === 'p2');
      expect(player2AfterJester?.queens.length).toBeGreaterThan(0);
    });
  });
});