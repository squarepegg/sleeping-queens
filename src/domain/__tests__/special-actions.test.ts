import {GameEngineAdapter} from '@/application/adapters/GameEngineAdapter';
import {GameMove} from '@/domain/models/GameMove';
import {Card, Queen} from '@/domain/models/Card';

describe('Special Actions - Players Acting Out of Turn', () => {
  let game: GameEngineAdapter;

  beforeEach(() => {
    game = new GameEngineAdapter();
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
        (game as any).setState(engineState); // Persist the hand change
      }

      // Setup: Mock the deck to reveal a number 2 (so it lands on player2)
      // Counting starts at 1 (yourself), so value 2 = next player
      const numberCard: Card = { id: 'number-2', type: 'number', value: 2 };
      const deckState = game.getState();
      deckState.deck.push(numberCard); // Push to end since we pop from end
      (game as any).setState(deckState); // Persist the deck change

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
      // With value 2: (0 + 2 - 1) % 2 = 1 (player2)
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

      // Setup: Mock the deck to reveal a number 2 (so it lands on player2)
      // Counting starts at 1 (yourself), so value 2 = next player
      const numberCard: Card = { id: 'number-2', type: 'number', value: 2 };
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
      // Player1 can't defend their own attack - error message may vary
      expect(dragonResult.error).toBeDefined();
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
      // The error might be different since p1 is trying to defend their own attack
      expect(wandResult.error).toBeDefined();
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
      // Complex scenario: Multiple special actions can happen in sequence
      // This test validates that special action permissions work correctly

      // Start a fresh game for this test
      const freshGame = new GameEngineAdapter();
      freshGame.addPlayer({
        id: 'p1',
        name: 'Alice',
        isConnected: true,
        position: 0,
        hand: [],
        queens: [],
        score: 0
      });
      freshGame.addPlayer({
        id: 'p2',
        name: 'Bob',
        isConnected: true,
        position: 1,
        hand: [],
        queens: [],
        score: 0
      });
      freshGame.startGame();

      const gameState = freshGame.getState();
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];

      // Give cards
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const dragonCard: Card = { id: 'dragon-1', type: 'dragon', name: 'Dragon' };
      const testQueen = { id: 'queen-test', name: 'Test Queen', points: 5, isAwake: true };

      // Setup: Player1 has knight, Player2 has dragon and a queen
      player1.hand[0] = knightCard;
      player2.hand[0] = dragonCard;
      player2.queens = [testQueen];

      (freshGame as any).setState(gameState);

      // Player1 plays Knight to steal Player2's queen
      const knightResult = freshGame.playMove({
        type: 'play_knight',
        playerId: 'p1',
        cards: [knightCard],
        targetPlayer: 'p2',
        targetCard: testQueen,
        timestamp: Date.now()
      });
      expect(knightResult.isValid).toBe(true);

      // There should be a pending knight attack since Player2 has Dragon
      const stateAfterKnight = freshGame.getState();
      expect(stateAfterKnight.pendingKnightAttack).toBeDefined();
      expect(stateAfterKnight.pendingKnightAttack?.target).toBe('p2');

      // Player2 can defend with Dragon even though it's not their turn
      const dragonResult = freshGame.playMove({
        type: 'play_dragon',
        playerId: 'p2',
        cards: [],
        timestamp: Date.now()
      });
      expect(dragonResult.isValid).toBe(true);

      // Pending attack should be cleared
      const finalState = freshGame.getState();
      expect(finalState.pendingKnightAttack).toBeUndefined();

      // Queen should still belong to Player2
      const player2Final = finalState.players.find(p => p.id === 'p2');
      expect(player2Final?.queens.length).toBe(1);
    });
  });
});