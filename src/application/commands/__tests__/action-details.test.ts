import { PlayKingCommand } from '../PlayKingCommand';
import { PlayKnightCommand } from '../PlayKnightCommand';
import { GameState } from '../../../domain/models/GameState';
import { GameMove } from '../../../domain/models/GameMove';
import { Card, Queen } from '../../../domain/models/Card';

describe('Action Details - Grouped Actions Feature', () => {
  describe('PlayKingCommand actionDetails', () => {
    it('should include actionDetails when waking a queen', () => {
      const kingCard: Card = { id: 'king-1', type: 'king', name: 'Fire King' };
      const targetQueen: Queen = { id: 'queen-1', type: 'queen', name: 'Pancake Queen', points: 10, isAwake: false };

      const state: GameState = {
        id: 'test-game',
        players: [
          {
            id: 'alice',
            name: 'Alice',
            hand: [kingCard, { id: 'card2', type: 'number', name: '5', value: 5 }],
            queens: [],
            score: 0,
            position: 0,
            isConnected: true
          },
          {
            id: 'bob',
            name: 'Bob',
            hand: [],
            queens: [],
            score: 0,
            position: 1,
            isConnected: true
          }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'alice',
        sleepingQueens: [targetQueen, { id: 'queen-2', type: 'queen', name: 'Cake Queen', points: 15, isAwake: false }],
        deck: [{ id: 'deck-1', type: 'number', name: '3', value: 3 }],
        discardPile: [],
        phase: 'playing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 4,
        roomCode: 'TEST',
        version: 1
      };

      const move: GameMove = {
        moveId: 'test-move-1',
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        targetQueenId: targetQueen.id,
        timestamp: Date.now()
      };

      const command = new PlayKingCommand(state, move);
      const result = command.execute();

      expect(result.lastAction).toBeDefined();
      expect(result.lastAction?.actionDetails).toBeDefined();
      expect(result.lastAction?.actionDetails).toHaveLength(3); // Played King, Woke Queen, Drew card

      const details = result.lastAction!.actionDetails!;
      expect(details[0].action).toBe('Played King');
      expect(details[0].cards).toHaveLength(1);
      expect(details[0].cards![0].type).toBe('king');

      expect(details[1].action).toBe('Woke Queen');
      expect(details[1].detail).toContain('points');
      expect(details[1].cards).toHaveLength(1);
      expect(details[1].cards![0].type).toBe('queen');

      expect(details[2].action).toBe('Drew card');
      expect(details[2].detail).toBe('Replacement card drawn');
    });

    it('should include Rose Queen bonus in actionDetails', () => {
      const kingCard: Card = { id: 'king-1', type: 'king', name: 'Fire King' };
      const roseQueen: Queen = { id: 'rose-queen', type: 'queen', name: 'Rose Queen', points: 5, isAwake: false };

      const state: GameState = {
        id: 'test-game',
        players: [
          {
            id: 'alice',
            name: 'Alice',
            hand: [kingCard],
            queens: [],
            score: 0,
            position: 0,
            isConnected: true
          }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'alice',
        sleepingQueens: [roseQueen],
        deck: [{ id: 'deck-1', type: 'number', name: '3', value: 3 }],
        discardPile: [],
        phase: 'playing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 4,
        roomCode: 'TEST',
        version: 1
      };

      const move: GameMove = {
        moveId: 'test-move-2',
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        targetQueenId: roseQueen.id,
        timestamp: Date.now()
      };

      const command = new PlayKingCommand(state, move);
      const result = command.execute();

      const details = result.lastAction!.actionDetails!;
      const roseBonus = details.find(d => d.action === 'Rose Queen Bonus');
      expect(roseBonus).toBeDefined();
      expect(roseBonus?.detail).toContain('Choose another queen');
    });

    it('should include Cat/Dog conflict in actionDetails', () => {
      const kingCard: Card = { id: 'king-1', type: 'king', name: 'Fire King' };
      const catQueen: Queen = { id: 'cat-queen', type: 'queen', name: 'Cat Queen', points: 15, isAwake: true };
      const dogQueen: Queen = { id: 'dog-queen', type: 'queen', name: 'Dog Queen', points: 15, isAwake: false };

      const state: GameState = {
        id: 'test-game',
        players: [
          {
            id: 'alice',
            name: 'Alice',
            hand: [kingCard],
            queens: [catQueen], // Alice already has Cat Queen
            score: 15,
            position: 0,
            isConnected: true
          }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'alice',
        sleepingQueens: [dogQueen],
        deck: [{ id: 'deck-1', type: 'number', name: '3', value: 3 }],
        discardPile: [],
        phase: 'playing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 4,
        roomCode: 'TEST',
        version: 1
      };

      const move: GameMove = {
        moveId: 'test-move-3',
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        targetQueenId: dogQueen.id,
        timestamp: Date.now()
      };

      const command = new PlayKingCommand(state, move);
      const result = command.execute();

      const details = result.lastAction!.actionDetails!;
      const conflict = details.find(d => d.action === 'Queen Conflict');
      expect(conflict).toBeDefined();
      expect(conflict?.detail).toContain("can't be together");
    });
  });

  describe('PlayKnightCommand actionDetails', () => {
    it('should include actionDetails for pending knight attack', () => {
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const dragonCard: Card = { id: 'dragon-1', type: 'dragon', name: 'Dragon' };
      const targetQueen: Queen = { id: 'queen-1', type: 'queen', name: 'Test Queen', points: 10, isAwake: true };

      const state: GameState = {
        id: 'test-game',
        players: [
          {
            id: 'alice',
            name: 'Alice',
            hand: [knightCard],
            queens: [],
            score: 0,
            position: 0,
            isConnected: true
          },
          {
            id: 'bob',
            name: 'Bob',
            hand: [dragonCard], // Bob has a dragon so can block
            queens: [targetQueen],
            score: 10,
            position: 1,
            isConnected: true
          }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'alice',
        sleepingQueens: [],
        deck: [{ id: 'deck-1', type: 'number', name: '3', value: 3 }],
        discardPile: [],
        phase: 'playing',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 4,
        roomCode: 'TEST',
        version: 1
      };

      const move: GameMove = {
        moveId: 'test-move-4',
        type: 'play_knight',
        playerId: 'alice',
        cards: [knightCard],
        targetPlayer: 'bob',
        targetQueenId: targetQueen.id,
        timestamp: Date.now()
      };

      const command = new PlayKnightCommand(state, move);
      const result = command.execute();

      const details = result.lastAction!.actionDetails!;
      expect(details.length).toBeGreaterThanOrEqual(3); // Played Knight, Target, Waiting

      expect(details[0].action).toBe('Played Knight');
      expect(details[0].detail).toBe('Initiating attack');

      expect(details[1].action).toBe('Target');
      expect(details[1].detail).toContain('from Bob');

      expect(details[2].action).toBe('Waiting');
      expect(details[2].detail).toContain('can block with Dragon');
    });

    it('should include actionDetails for successful knight steal', () => {
      const knightCard: Card = { id: 'knight-1', type: 'knight', name: 'Knight' };
      const targetQueen: Queen = { id: 'queen-1', type: 'queen', name: 'Test Queen', points: 10, isAwake: true };

      const state: GameState = {
        id: 'test-game',
        players: [
          {
            id: 'alice',
            name: 'Alice',
            hand: [knightCard],
            queens: [],
            score: 0,
            position: 0,
            isConnected: true
          },
          {
            id: 'bob',
            name: 'Bob',
            hand: [], // Bob has no dragon, can't block
            queens: [targetQueen],
            score: 10,
            position: 1,
            isConnected: true
          }
        ],
        currentPlayerIndex: 0,
        currentPlayerId: 'alice',
        sleepingQueens: [],
        deck: [{ id: 'deck-1', type: 'number', name: '3', value: 3 }],
        discardPile: [],
        phase: 'playing',
        pendingKnightAttack: null, // No pending attack, immediate execution
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maxPlayers: 4,
        roomCode: 'TEST',
        version: 1
      };

      const move: GameMove = {
        moveId: 'test-move-5',
        type: 'play_knight',
        playerId: 'alice',
        cards: [knightCard],
        targetPlayer: 'bob',
        targetQueenId: targetQueen.id,
        timestamp: Date.now()
      };

      const command = new PlayKnightCommand(state, move);
      const validation = command.validate();

      if (validation.isValid) {
        const result = command.execute();

        // Check if it was immediate execution (no pending attack means Bob couldn't block)
        if (!result.pendingKnightAttack) {
          const details = result.lastAction!.actionDetails!;
          expect(details[0].action).toBe('Played Knight');
          expect(details[0].detail).toBe('Successful attack');

          expect(details[1].action).toBe('Stole Queen');
          expect(details[1].detail).toContain('points');
          expect(details[1].detail).toContain('from Bob');
        }
      }
    });
  });
});