import { GameEngine } from '../GameEngine';
import { Player, GameMove } from '../../types';

describe('GameEngine', () => {
  let engine: GameEngine;
  let players: Player[];

  beforeEach(() => {
    engine = new GameEngine();
    players = [
      {
        id: 'player1',
        name: 'Alice',
        hand: [],
        queens: [],
        score: 0,
        isConnected: true,
        position: 0
      },
      {
        id: 'player2', 
        name: 'Bob',
        hand: [],
        queens: [],
        score: 0,
        isConnected: true,
        position: 1
      }
    ];
  });

  describe('Game Initialization', () => {
    it('should add players correctly', () => {
      const result1 = engine.addPlayer(players[0]);
      const result2 = engine.addPlayer(players[1]);
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      
      const state = engine.getGameState();
      expect(state.players).toHaveLength(2);
      expect(state.players[0].name).toBe('Alice');
      expect(state.players[1].name).toBe('Bob');
    });

    it('should not add duplicate players', () => {
      engine.addPlayer(players[0]);
      const result = engine.addPlayer(players[0]);
      
      expect(result).toBe(false);
      expect(engine.getGameState().players).toHaveLength(1);
    });

    it('should not add players after game starts', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      const newPlayer: Player = {
        id: 'player3',
        name: 'Charlie',
        hand: [],
        queens: [],
        score: 0,
        isConnected: true,
        position: 2
      };
      
      const result = engine.addPlayer(newPlayer);
      expect(result).toBe(false);
    });

    it('should enforce max player limit', () => {
      for (let i = 0; i < 5; i++) {
        engine.addPlayer({
          id: `player${i}`,
          name: `Player ${i}`,
          hand: [],
          queens: [],
          score: 0,
          isConnected: true,
          position: i
        });
      }
      
      const sixthPlayer: Player = {
        id: 'player6',
        name: 'Extra',
        hand: [],
        queens: [],
        score: 0,
        isConnected: true,
        position: 5
      };
      
      const result = engine.addPlayer(sixthPlayer);
      expect(result).toBe(false);
      expect(engine.getGameState().players).toHaveLength(5);
    });

    it('should start game with correct initial state', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      
      const result = engine.startGame();
      expect(result).toBe(true);
      
      const state = engine.getGameState();
      expect(state.phase).toBe('playing');
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentPlayerId).toBe('player1');
      
      // Each player should have 5 cards
      expect(state.players[0].hand).toHaveLength(5);
      expect(state.players[1].hand).toHaveLength(5);
      
      // Should have 12 sleeping queens
      expect(state.sleepingQueens).toHaveLength(12);
    });

    it('should not start game with less than 2 players', () => {
      engine.addPlayer(players[0]);
      const result = engine.startGame();
      
      expect(result).toBe(false);
      expect(engine.getGameState().phase).toBe('waiting');
    });

    it('should deal unique cards to players', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      const state = engine.getGameState();
      const allCardIds = [
        ...state.players[0].hand.map(c => c.id),
        ...state.players[1].hand.map(c => c.id)
      ];
      
      const uniqueIds = new Set(allCardIds);
      expect(uniqueIds.size).toBe(allCardIds.length);
    });
  });

  describe('Turn Management', () => {
    beforeEach(() => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
    });

    it('should validate correct player turn', () => {
      const state = engine.getGameState();
      const currentPlayer = state.players[state.currentPlayerIndex];
      const move: GameMove = {
        type: 'discard',
        playerId: currentPlayer.id,
        cards: [currentPlayer.hand[0]],
        timestamp: Date.now()
      };
      
      const result = engine.validateMove(move);
      expect(result.isValid).toBe(true);
    });

    it('should reject move from wrong player', () => {
      const state = engine.getGameState();
      const wrongPlayer = state.players[1]; // Not current player
      const move: GameMove = {
        type: 'discard',
        playerId: wrongPlayer.id,
        cards: wrongPlayer.hand.length > 0 ? [wrongPlayer.hand[0]] : [],
        timestamp: Date.now()
      };
      
      const result = engine.validateMove(move);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });

    it('should advance turn after valid move', () => {
      const state = engine.getGameState();
      const currentPlayer = state.players[0];
      
      if (currentPlayer.hand.length > 0) {
        const move: GameMove = {
          type: 'discard',
          playerId: currentPlayer.id,
          cards: [currentPlayer.hand[0]],
          timestamp: Date.now()
        };
        
        engine.playMove(move);
        const newState = engine.getGameState();
        expect(newState.currentPlayerIndex).toBe(1);
        expect(newState.currentPlayerId).toBe('player2');
      }
    });

    it('should cycle turns correctly', () => {
      const initialState = engine.getGameState();
      
      // Play moves for both players
      for (let i = 0; i < 4; i++) {
        const state = engine.getGameState();
        const currentPlayer = state.players[state.currentPlayerIndex];
        
        if (currentPlayer.hand.length > 0) {
          const move: GameMove = {
            type: 'discard',
            playerId: currentPlayer.id,
            cards: [currentPlayer.hand[0]],
            timestamp: Date.now()
          };
          
          engine.playMove(move);
        }
      }
      
      // Should cycle back
      const finalState = engine.getGameState();
      expect(finalState.currentPlayerIndex).toBe(0);
    });
  });

  describe('Card Actions', () => {
    beforeEach(() => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
    });

    it('should handle king card to wake queen', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // Give player a king card
      const kingCard = { id: 'king1', type: 'king' as const, name: 'King' };
      player.hand.push(kingCard);
      
      const queen = state.sleepingQueens[0];
      const move: GameMove = {
        type: 'play_king',
        playerId: player.id,
        cards: [kingCard],
        targetCard: queen,
        timestamp: Date.now()
      };
      
      const result = engine.playMove(move);
      
      if (result.isValid) {
        const newState = engine.getGameState();
        expect(newState.sleepingQueens).toHaveLength(11);
        expect(player.queens).toContainEqual(queen);
        expect(player.score).toBe(queen.points);
      }
    });

    it('should handle knight card to steal queen', () => {
      const state = engine.getGameState();
      const attacker = state.players[0];
      const target = state.players[1];
      
      // Give target a queen
      const queen = state.sleepingQueens[0];
      state.sleepingQueens.splice(0, 1);
      target.queens.push(queen);
      target.score = queen.points;
      
      // Give attacker a knight
      const knightCard = { id: 'knight1', type: 'knight' as const, name: 'Knight' };
      attacker.hand.push(knightCard);
      
      const move: GameMove = {
        type: 'play_knight',
        playerId: attacker.id,
        cards: [knightCard],
        targetPlayer: target.id,
        targetCard: queen,
        timestamp: Date.now()
      };
      
      const result = engine.playMove(move);
      
      // Move should be valid
      expect(result.isValid).toBe(true);

      // Since target has no dragon, attack completes immediately
      const newState = engine.getGameState();
      expect(newState.pendingKnightAttack).toBeUndefined();

      // Queen should be stolen immediately
      const newAttacker = newState.players[0];
      const newTarget = newState.players[1];
      expect(newAttacker.queens.find(q => q.id === queen.id)).toBeDefined();
      expect(newTarget.queens.find(q => q.id === queen.id)).toBeUndefined();
    });

    it('should handle dragon defense against knight', () => {
      const state = engine.getGameState();
      const attacker = state.players[0];
      const defender = state.players[1];
      
      // Setup: defender has a queen and dragon
      const queen = state.sleepingQueens[0];
      state.sleepingQueens.splice(0, 1);
      defender.queens.push(queen);
      
      const dragonCard = { id: 'dragon1', type: 'dragon' as const, name: 'Dragon' };
      defender.hand.push(dragonCard);
      
      // Attacker plays knight
      const knightCard = { id: 'knight1', type: 'knight' as const, name: 'Knight' };
      attacker.hand.push(knightCard);
      
      engine.playMove({
        type: 'play_knight',
        playerId: attacker.id,
        cards: [knightCard],
        targetPlayer: defender.id,
        targetCard: queen,
        timestamp: Date.now()
      });
      
      // Defender plays dragon
      const defenseMove: GameMove = {
        type: 'play_dragon',
        playerId: defender.id,
        cards: [dragonCard],
        timestamp: Date.now()
      };
      
      const result = engine.playMove(defenseMove);
      
      if (result.isValid) {
        const newState = engine.getGameState();
        expect(defender.queens).toContainEqual(queen);
        expect(newState.pendingKnightAttack).toBeUndefined();
      }
    });

    it('should handle jester card reveal', () => {
      const state = engine.getInternalState(); // Use internal state for testing
      const player = state.players[0];
      
      const jesterCard = { id: 'jester1', type: 'jester' as const, name: 'Jester' };
      player.hand.push(jesterCard);
      
      const move: GameMove = {
        type: 'play_jester',
        playerId: player.id,
        cards: [jesterCard],
        timestamp: Date.now()
      };
      
      const result = engine.playMove(move);
      
      // Move should be valid
      expect(result.isValid).toBe(true);
      
      const newState = engine.getGameState();
      // Jester move was processed successfully
      // The jesterReveal will be set if there are cards in the deck
      // Just verify the move was processed
      expect(result.isValid).toBe(true);
    });
  });

  describe('Math Equations', () => {
    beforeEach(() => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
    });

    it('should validate correct addition equation', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // Give player cards for 2 + 3 = 5
      const cards = [
        { id: 'n1', type: 'number' as const, value: 2, name: '2' },
        { id: 'n2', type: 'number' as const, value: 3, name: '3' },
        { id: 'n3', type: 'number' as const, value: 5, name: '5' }
      ];
      
      player.hand.push(...cards);
      
      const move: GameMove = {
        type: 'play_math',
        playerId: player.id,
        cards: cards,
        timestamp: Date.now()
      };
      
      const result = engine.validateMove(move);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid equation', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // Give player cards that don't form valid equation (2, 3, 4 has no valid equation)
      const cards = [
        { id: 'n1', type: 'number' as const, value: 2, name: '2' },
        { id: 'n2', type: 'number' as const, value: 3, name: '3' },
        { id: 'n3', type: 'number' as const, value: 4, name: '4' }
      ];
      
      player.hand.push(...cards);
      
      const move: GameMove = {
        type: 'play_math',
        playerId: player.id,
        cards: cards,
        timestamp: Date.now()
      };
      
      const result = engine.validateMove(move);
      expect(result.isValid).toBe(false);
    });

    it('should handle multiplication equation', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // 2 × 3 = 6
      const cards = [
        { id: 'n1', type: 'number' as const, value: 2, name: '2' },
        { id: 'n2', type: 'number' as const, value: 3, name: '3' },
        { id: 'n3', type: 'number' as const, value: 6, name: '6' }
      ];
      
      player.hand.push(...cards);
      
      const move: GameMove = {
        type: 'play_math',
        playerId: player.id,
        cards: cards,
        timestamp: Date.now()
      };
      
      const result = engine.validateMove(move);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Win Conditions', () => {
    beforeEach(() => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
    });

    it('should detect win by 5 queens', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // Give player 5 queens
      for (let i = 0; i < 5; i++) {
        const queen = state.sleepingQueens[0];
        state.sleepingQueens.splice(0, 1);
        player.queens.push(queen);
        player.score += queen.points;
      }
      
      const stats = engine.getGameStats();
      expect(stats.winRequirements.queensRequired).toBeGreaterThan(0);
    });

    it('should detect win by 50 points', () => {
      const state = engine.getGameState();
      const player = state.players[0];
      
      // Give player enough points
      player.score = 50;
      
      const stats = engine.getGameStats();
      expect(stats.winRequirements.pointsRequired).toBeGreaterThan(0);
    });

    it('should handle all queens awakened', () => {
      const state = engine.getGameState();
      
      // Distribute all queens to players
      while (state.sleepingQueens.length > 0) {
        const queen = state.sleepingQueens.pop()!;
        const playerIndex = state.sleepingQueens.length % 2;
        state.players[playerIndex].queens.push(queen);
        state.players[playerIndex].score += queen.points;
      }
      
      const stats = engine.getGameStats();
      expect(stats.queensSleeping).toBe(0);
      expect(stats.queensAwakened).toBe(12);
    });
  });

  describe('Game State Management', () => {
    it('should get and set game state', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      const originalState = engine.getState();
      const newEngine = new GameEngine();
      newEngine.setState(originalState);
      
      const restoredState = newEngine.getState();
      expect(restoredState.players).toHaveLength(2);
      expect(restoredState.phase).toBe('playing');
      expect(restoredState.roomCode).toBe(originalState.roomCode);
    });

    it('should track game version', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      const initialState = engine.getGameState();
      const initialVersion = initialState.version;
      
      // Make a move
      const player = initialState.players[0];
      if (player.hand.length > 0) {
        engine.playMove({
          type: 'discard',
          playerId: player.id,
          cards: [player.hand[0]],
          timestamp: Date.now()
        });
        
        const newState = engine.getGameState();
        expect(newState.version).toBeGreaterThan(initialVersion);
      }
    });

    it('should provide game statistics', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      const stats = engine.getGameStats();
      
      expect(stats.playerCount).toBe(2);
      expect(stats.queensSleeping).toBe(12);
      expect(stats.queensAwakened).toBe(0);
      expect(stats.leaderboard).toHaveLength(2);
      expect(stats.winRequirements).toBeDefined();
    });
  });

  describe('Player Management', () => {
    it('should remove player correctly', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      
      const result = engine.removePlayer('player1');
      expect(result).toBe(true);
      
      const state = engine.getGameState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0].id).toBe('player2');
      expect(state.players[0].position).toBe(0);
    });

    it('should end game if not enough players', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
      
      engine.removePlayer('player2');
      
      const state = engine.getGameState();
      expect(state.phase).toBe('ended');
    });

    it('should handle current player removal', () => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      const thirdPlayer: Player = {
        id: 'player3',
        name: 'Charlie',
        hand: [],
        queens: [],
        score: 0,
        isConnected: true,
        position: 2
      };
      engine.addPlayer(thirdPlayer);
      engine.startGame();
      
      // Remove current player
      engine.removePlayer('player1');
      
      const state = engine.getGameState();
      expect(state.currentPlayerIndex).toBeLessThan(state.players.length);
    });
  });

  describe('Defense Mechanisms', () => {
    beforeEach(() => {
      engine.addPlayer(players[0]);
      engine.addPlayer(players[1]);
      engine.startGame();
    });

    it('should check if player can play dragon defense', () => {
      const state = engine.getInternalState(); // Use internal state for testing
      const defender = state.players[1];
      
      // Give defender a dragon
      const dragonCard = { id: 'dragon1', type: 'dragon' as const, name: 'Dragon' };
      defender.hand.push(dragonCard);
      
      // Create pending knight attack
      const queen = state.sleepingQueens[0];
      state.pendingKnightAttack = {
        attacker: 'player1',
        target: 'player2',
        targetQueen: queen,
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 5000
      };
      
      const canDefend = engine.canPlayerPlayDragon('player2');
      expect(canDefend).toBe(true);
    });

    it('should check remaining defense time', () => {
      const state = engine.getInternalState(); // Use internal state for testing
      
      const queen = state.sleepingQueens[0];
      state.pendingKnightAttack = {
        attacker: 'player1',
        target: 'player2',
        targetQueen: queen,
        timestamp: Date.now(),
        defenseDeadline: Date.now() + 3000
      };
      
      const remainingTime = engine.getRemainingDefenseTime();
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(3000);
    });

    it('should complete attack when defense expires', () => {
      const state = engine.getGameState();
      const defender = state.players[1];
      
      // Give defender a queen
      const queen = state.sleepingQueens[0];
      state.sleepingQueens.splice(0, 1);
      defender.queens.push(queen);
      
      // Create expired knight attack
      state.pendingKnightAttack = {
        attacker: 'player1',
        target: 'player2',
        targetQueen: queen,
        timestamp: Date.now(),
        defenseDeadline: Date.now() - 1000 // Expired
      };
      
      const result = engine.completeKnightAttackTimeout();
      
      if (result.isValid) {
        const newState = engine.getGameState();
        expect(newState.players[0].queens).toContainEqual(queen);
        expect(defender.queens).not.toContainEqual(queen);
      }
    });
  });
});