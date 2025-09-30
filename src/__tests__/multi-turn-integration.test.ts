/**
 * Multi-Turn Integration Tests
 *
 * Tests complex gameplay flows that span multiple players and turns
 * to catch state management bugs that only appear in real scenarios.
 */

import { GameEngineAdapter } from '../application/adapters/GameEngineAdapter';
import { GameMove } from '../domain/models/GameMove';

describe('Multi-Turn Integration Tests', () => {
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
          position: 0,
          isConnected: true,
          hand: [
            { id: 'king1', type: 'king' as const, name: 'Bubble Gum King' },
            { id: 'king2', type: 'king' as const, name: 'King' },
            { id: 'jester1', type: 'jester' as const, name: 'Jester' },
            { id: 'num1', type: 'number' as const, value: 5 },
            { id: 'num2', type: 'number' as const, value: 3 }
          ],
          queens: [],
          score: 0
        },
        {
          id: player2Id,
          name: 'Player 2',
          position: 1,
          isConnected: true,
          hand: [
            { id: 'knight1', type: 'knight' as const, name: 'Knight' },
            { id: 'potion1', type: 'potion' as const, name: 'Sleeping Potion' },
            { id: 'dragon1', type: 'dragon' as const, name: 'Dragon' },
            { id: 'num3', type: 'number' as const, value: 4 },
            { id: 'num4', type: 'number' as const, value: 6 }
          ],
          queens: [],
          score: 0
        }
      ],
      sleepingQueens: [
        { id: 'queen-rose', name: 'Rose Queen', points: 5, isAwake: false },
        { id: 'queen-moon', name: 'Moon Queen', points: 15, isAwake: false },
        { id: 'queen-cat', name: 'Cat Queen', points: 15, isAwake: false },
        { id: 'queen-dog', name: 'Dog Queen', points: 15, isAwake: false },
        { id: 'queen-cake', name: 'Cake Queen', points: 15, isAwake: false }
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
      phase: 'playing' as const,
      gameStarted: true,
      gameId: 'test-game',
      roomCode: 'TEST',
      maxPlayers: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      winner: null
    };

    game = new GameEngineAdapter(initialState);
  });

  describe('Rose Queen Bonus Turn Management', () => {
    test('should properly manage turns: King → Rose Queen → Bonus → Turn Advance → Opponent Turn → Player Return', () => {
      console.log('\n=== TESTING FULL ROSE QUEEN TURN FLOW ===');

      // STEP 1: Player 1 plays King to wake Rose Queen
      console.log('\nSTEP 1: Player 1 plays King to wake Rose Queen');
      let state = game.getState();
      expect(state.currentPlayerId).toBe(player1Id);
      expect(state.currentPlayerIndex).toBe(0);

      const kingMove: GameMove = {
        type: 'play_king',
        playerId: player1Id,
        timestamp: Date.now(),
        cards: [{ id: 'king1', type: 'king', name: 'Bubble Gum King' }],
        targetCard: { id: 'queen-rose', name: 'Rose Queen', points: 5, isAwake: false }
      };

      const kingResult = game.playMove(kingMove);
      expect(kingResult.isValid).toBe(true);

      state = game.getState();
      console.log('After King play:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        roseBonus: state.roseQueenBonus?.pending,
        player1Queens: state.players[0].queens.map(q => q.name)
      });

      // Should have Rose Queen and pending bonus
      expect(state.players[0].queens).toHaveLength(1);
      expect(state.players[0].queens[0].name).toBe('Rose Queen');
      expect(state.roseQueenBonus?.pending).toBe(true);
      expect(state.roseQueenBonus?.playerId).toBe(player1Id);

      // STEP 2: Player 1 uses Rose Queen bonus to wake Moon Queen
      console.log('\nSTEP 2: Player 1 uses Rose Queen bonus to wake Moon Queen');

      const bonusMove: GameMove = {
        type: 'rose_queen_bonus',
        playerId: player1Id,
        timestamp: Date.now() + 1000,
        cards: [],
        targetCard: { id: 'queen-moon', name: 'Moon Queen', points: 15, isAwake: false }
      };

      const bonusResult = game.playMove(bonusMove);
      expect(bonusResult.isValid).toBe(true);

      state = game.getState();
      console.log('After Rose Queen bonus:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        roseBonus: state.roseQueenBonus,
        player1Queens: state.players[0].queens.map(q => q.name),
        stagedCards: state.stagedCards
      });

      // Should have both queens, bonus cleared, turn advanced
      expect(state.players[0].queens).toHaveLength(2);
      expect(state.players[0].queens.map(q => q.name).sort()).toEqual(['Moon Queen', 'Rose Queen']);
      expect(state.roseQueenBonus).toBeUndefined();
      expect(state.currentPlayerIndex).toBe(1); // Turn should advance to Player 2
      expect(state.currentPlayerId).toBe(player2Id);

      // STEP 3: Player 2 takes their turn (simple discard)
      console.log('\nSTEP 3: Player 2 takes their turn');

      const player2Move: GameMove = {
        type: 'discard',
        playerId: player2Id,
        timestamp: Date.now() + 2000,
        cards: [{ id: 'num3', type: 'number', value: 4 }]
      };

      const player2Result = game.playMove(player2Move);
      expect(player2Result.isValid).toBe(true);

      state = game.getState();
      console.log('After Player 2 turn:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        jesterReveal: state.jesterReveal,
        roseBonus: state.roseQueenBonus,
        stagedCards: state.stagedCards
      });

      // Turn should advance back to Player 1
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentPlayerId).toBe(player1Id);

      // STEP 4: Critical test - Player 1's turn returns with clean state
      console.log('\nSTEP 4: Player 1 turn returns - state should be clean');

      // State should be completely clean - no pending actions
      expect(state.jesterReveal).toBeUndefined();
      expect(state.roseQueenBonus).toBeUndefined();
      expect(state.pendingKnightAttack).toBeUndefined();
      expect(state.pendingPotionAttack).toBeUndefined();
      expect(state.stagedCards?.[player1Id]).toBeUndefined();

      // Player 1 should be able to play normally
      const normalMove: GameMove = {
        type: 'discard',
        playerId: player1Id,
        timestamp: Date.now() + 3000,
        cards: [{ id: 'num1', type: 'number', value: 5 }]
      };

      const normalResult = game.playMove(normalMove);
      expect(normalResult.isValid).toBe(true);

      console.log('\n=== ROSE QUEEN TURN FLOW TEST COMPLETE ===');
    });
  });

  describe('Jester Multi-Turn Flow', () => {
    test('should properly manage Jester → Opponent Selection → Turn Management', () => {
      console.log('\n=== TESTING JESTER MULTI-TURN FLOW ===');

      // Setup: Give Player 1 a Jester, modify deck for predictable reveal
      let state = game.getState();
      const modifiedState = {
        ...state,
        deck: [
          { id: 'reveal-card', type: 'number' as const, value: 2 }, // Will target Player 2
          ...state.deck.slice(1)
        ]
      };
      game = new GameEngineAdapter(modifiedState);

      // STEP 1: Player 1 plays Jester
      console.log('\nSTEP 1: Player 1 plays Jester');

      const jesterMove: GameMove = {
        type: 'play_jester',
        playerId: player1Id,
        timestamp: Date.now(),
        cards: [{ id: 'jester1', type: 'jester', name: 'Jester' }]
      };

      const jesterResult = game.playMove(jesterMove);
      expect(jesterResult.isValid).toBe(true);

      state = game.getState();
      console.log('After Jester play:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        jesterReveal: state.jesterReveal,
        waitingForSelection: state.jesterReveal?.waitingForQueenSelection,
        targetPlayer: state.jesterReveal?.targetPlayer
      });

      // Should reveal number 2, targeting Player 2
      expect(state.jesterReveal?.waitingForQueenSelection).toBe(true);
      expect(state.jesterReveal?.targetPlayer).toBe(player2Id);
      expect(state.currentPlayerId).toBe(player1Id); // Turn shouldn't advance yet

      // STEP 2: Player 2 selects queen (as target of Jester)
      console.log('\nSTEP 2: Player 2 selects queen from Jester reveal');

      const queenSelectionMove: GameMove = {
        type: 'play_jester',
        playerId: player2Id, // Player 2 makes the selection
        timestamp: Date.now() + 1000,
        cards: [],
        targetCard: { id: 'queen-cat', name: 'Cat Queen', points: 15, isAwake: false }
      };

      const selectionResult = game.playMove(queenSelectionMove);
      expect(selectionResult.isValid).toBe(true);

      state = game.getState();
      console.log('After queen selection:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        jesterReveal: state.jesterReveal,
        player2Queens: state.players[1].queens.map(q => q.name),
        player1HandSize: state.players[0].hand.length
      });

      // Player 2 should have the queen, jester reveal cleared, turn advanced
      expect(state.players[1].queens).toHaveLength(1);
      expect(state.players[1].queens[0].name).toBe('Cat Queen');
      expect(state.jesterReveal).toBeUndefined();
      expect(state.currentPlayerIndex).toBe(1); // Turn advances to Player 2
      expect(state.currentPlayerId).toBe(player2Id);

      // STEP 3: Player 2 continues their turn normally
      console.log('\nSTEP 3: Player 2 continues their turn');

      const player2ContinueMove: GameMove = {
        type: 'discard',
        playerId: player2Id,
        timestamp: Date.now() + 2000,
        cards: [{ id: 'num4', type: 'number', value: 6 }]
      };

      const continueResult = game.playMove(player2ContinueMove);
      expect(continueResult.isValid).toBe(true);

      state = game.getState();

      // Turn should advance back to Player 1
      expect(state.currentPlayerIndex).toBe(0);
      expect(state.currentPlayerId).toBe(player1Id);

      // STEP 4: Player 1's turn returns with clean state
      console.log('\nSTEP 4: Player 1 turn returns - state should be clean');

      expect(state.jesterReveal).toBeUndefined();
      expect(state.roseQueenBonus).toBeUndefined();
      expect(state.stagedCards?.[player1Id]).toBeUndefined();

      console.log('\n=== JESTER MULTI-TURN FLOW TEST COMPLETE ===');
    });
  });

  describe('Complex Multi-Action Sequences', () => {
    test('should handle King → Rose Queen → Jester → Queen Selection → Turn Management', () => {
      console.log('\n=== TESTING COMPLEX MULTI-ACTION SEQUENCE ===');

      // Setup for predictable Jester reveal
      let state = game.getState();
      const modifiedState = {
        ...state,
        players: state.players.map(p => p.id === player1Id ? {
          ...p,
          hand: [
            { id: 'king1', type: 'king' as const, name: 'King' },
            { id: 'jester1', type: 'jester' as const, name: 'Jester' },
            { id: 'num1', type: 'number' as const, value: 5 },
            { id: 'num2', type: 'number' as const, value: 3 },
            { id: 'num3', type: 'number' as const, value: 7 }
          ]
        } : p),
        deck: [
          { id: 'reveal-card', type: 'number' as const, value: 2 }, // Will target Player 2
          ...state.deck.slice(1)
        ]
      };
      game = new GameEngineAdapter(modifiedState);

      // PHASE 1: King → Rose Queen → Bonus
      console.log('\nPHASE 1: King → Rose Queen → Bonus');

      const kingMove: GameMove = {
        type: 'play_king',
        playerId: player1Id,
        timestamp: Date.now(),
        cards: [{ id: 'king1', type: 'king', name: 'King' }],
        targetCard: { id: 'queen-rose', name: 'Rose Queen', points: 5, isAwake: false }
      };

      game.playMove(kingMove);

      const bonusMove: GameMove = {
        type: 'rose_queen_bonus',
        playerId: player1Id,
        timestamp: Date.now() + 1000,
        cards: [],
        targetCard: { id: 'queen-moon', name: 'Moon Queen', points: 15, isAwake: false }
      };

      game.playMove(bonusMove);

      state = game.getState();
      console.log('After Rose Queen sequence:', {
        currentPlayer: state.currentPlayerId,
        player1Queens: state.players[0].queens.map(q => q.name),
        roseBonus: state.roseQueenBonus
      });

      expect(state.currentPlayerId).toBe(player2Id);
      expect(state.players[0].queens).toHaveLength(2);
      expect(state.roseQueenBonus).toBeUndefined();

      // PHASE 2: Player 2 turn
      console.log('\nPHASE 2: Player 2 turn');

      const player2Move: GameMove = {
        type: 'discard',
        playerId: player2Id,
        timestamp: Date.now() + 2000,
        cards: [{ id: 'num3', type: 'number', value: 4 }]
      };

      game.playMove(player2Move);

      state = game.getState();
      expect(state.currentPlayerId).toBe(player1Id);

      // PHASE 3: Player 1 plays Jester on return
      console.log('\nPHASE 3: Player 1 plays Jester on turn return');

      const jesterMove: GameMove = {
        type: 'play_jester',
        playerId: player1Id,
        timestamp: Date.now() + 3000,
        cards: [{ id: 'jester1', type: 'jester', name: 'Jester' }]
      };

      const jesterResult = game.playMove(jesterMove);
      expect(jesterResult.isValid).toBe(true);

      state = game.getState();
      console.log('After Jester play:', {
        jesterReveal: state.jesterReveal,
        targetPlayer: state.jesterReveal?.targetPlayer,
        waitingForSelection: state.jesterReveal?.waitingForQueenSelection
      });

      // Should target Player 2 due to value 2
      expect(state.jesterReveal?.waitingForQueenSelection).toBe(true);
      expect(state.jesterReveal?.targetPlayer).toBe(player2Id);

      // PHASE 4: Player 2 selects queen from Jester reveal
      console.log('\nPHASE 4: Player 2 selects queen from Jester reveal');

      const queenSelectionMove: GameMove = {
        type: 'play_jester',
        playerId: player2Id,
        timestamp: Date.now() + 4000,
        cards: [],
        targetCard: { id: 'queen-cat', name: 'Cat Queen', points: 15, isAwake: false }
      };

      const selectionResult = game.playMove(queenSelectionMove);
      expect(selectionResult.isValid).toBe(true);

      state = game.getState();
      console.log('After queen selection:', {
        currentPlayer: state.currentPlayerId,
        currentIndex: state.currentPlayerIndex,
        player1Queens: state.players[0].queens.map(q => q.name),
        player2Queens: state.players[1].queens.map(q => q.name),
        jesterReveal: state.jesterReveal
      });

      // Player 1 should still have 2 queens, Player 2 should have 1 queen, jester cleared
      expect(state.players[0].queens).toHaveLength(2);
      expect(state.players[0].queens.map(q => q.name).sort()).toEqual(['Moon Queen', 'Rose Queen']);
      expect(state.players[1].queens).toHaveLength(1);
      expect(state.players[1].queens[0].name).toBe('Cat Queen');
      expect(state.jesterReveal).toBeUndefined();
      expect(state.currentPlayerId).toBe(player2Id);

      console.log('\n=== COMPLEX MULTI-ACTION SEQUENCE TEST COMPLETE ===');
    });
  });

  describe('Specific Bug Reproductions', () => {
    test('should not show "played King again" after Rose Queen bonus → opponent turn → player return', () => {
      console.log('\n=== TESTING SPECIFIC "KING PERSISTENCE" BUG ===');

      // Exactly reproduce the user's scenario:
      // "Played the bubble gum king, woke the rose queen, got a bonus woke the moon queen.
      // turn ended. opponent played their turn. Now when my turn started it said i'd
      // played the bubble gum king again and to choose a queen"

      // STEP 1: Player 1 plays Bubble Gum King → Rose Queen
      console.log('\nSTEP 1: Player 1 plays Bubble Gum King to wake Rose Queen');

      let state = game.getState();
      expect(state.currentPlayerId).toBe(player1Id);

      const bubbleGumKingMove: GameMove = {
        type: 'play_king',
        playerId: player1Id,
        timestamp: Date.now(),
        cards: [{ id: 'king1', type: 'king', name: 'Bubble Gum King' }],
        targetCard: { id: 'queen-rose', name: 'Rose Queen', points: 5, isAwake: false }
      };

      const kingResult = game.playMove(bubbleGumKingMove);
      expect(kingResult.isValid).toBe(true);

      state = game.getState();
      console.log('After Bubble Gum King:', {
        roseBonus: state.roseQueenBonus?.pending,
        stagedCards: state.stagedCards,
        lastAction: state.lastAction?.actionType
      });

      expect(state.roseQueenBonus?.pending).toBe(true);

      // STEP 2: Use Rose Queen bonus → Moon Queen
      console.log('\nSTEP 2: Player 1 uses Rose Queen bonus to wake Moon Queen');

      const roseBonus: GameMove = {
        type: 'rose_queen_bonus',
        playerId: player1Id,
        timestamp: Date.now() + 1000,
        cards: [],
        targetCard: { id: 'queen-moon', name: 'Moon Queen', points: 15, isAwake: false }
      };

      const bonusResult = game.playMove(roseBonus);
      expect(bonusResult.isValid).toBe(true);

      state = game.getState();
      console.log('After Rose Queen bonus:', {
        currentPlayer: state.currentPlayerId,
        roseBonus: state.roseQueenBonus,
        stagedCards: state.stagedCards,
        lastAction: state.lastAction?.actionType,
        player1Queens: state.players[0].queens.map(q => q.name)
      });

      // Turn should advance, bonus cleared, 2 queens
      expect(state.currentPlayerId).toBe(player2Id);
      expect(state.roseQueenBonus).toBeUndefined();
      expect(state.players[0].queens).toHaveLength(2);

      // STEP 3: Opponent (Player 2) plays their turn
      console.log('\nSTEP 3: Player 2 plays their turn (discard)');

      const opponentMove: GameMove = {
        type: 'discard',
        playerId: player2Id,
        timestamp: Date.now() + 2000,
        cards: [{ id: 'num3', type: 'number', value: 4 }]
      };

      const opponentResult = game.playMove(opponentMove);
      expect(opponentResult.isValid).toBe(true);

      state = game.getState();
      console.log('After opponent turn:', {
        currentPlayer: state.currentPlayerId,
        stagedCards: state.stagedCards,
        lastAction: state.lastAction?.actionType,
        jesterReveal: state.jesterReveal,
        roseBonus: state.roseQueenBonus
      });

      // Turn should return to Player 1
      expect(state.currentPlayerId).toBe(player1Id);

      // STEP 4: CRITICAL - Player 1's turn returns, state should be COMPLETELY CLEAN
      console.log('\nSTEP 4: Player 1 turn returns - checking for state pollution');

      console.log('Detailed state check:', {
        currentPlayer: state.currentPlayerId,
        jesterReveal: state.jesterReveal,
        roseQueenBonus: state.roseQueenBonus,
        pendingKnightAttack: state.pendingKnightAttack,
        pendingPotionAttack: state.pendingPotionAttack,
        stagedCards: state.stagedCards,
        lastAction: {
          type: state.lastAction?.actionType,
          playerId: state.lastAction?.playerId,
          cards: state.lastAction?.cards?.length
        }
      });

      // These should ALL be undefined/clean
      expect(state.jesterReveal).toBeUndefined();
      expect(state.roseQueenBonus).toBeUndefined();
      expect(state.pendingKnightAttack).toBeUndefined();
      expect(state.pendingPotionAttack).toBeUndefined();
      expect(state.stagedCards?.[player1Id]).toBeUndefined();

      // STEP 5: Player 1 should be able to play normally without "King again" issue
      console.log('\nSTEP 5: Player 1 should be able to play normally');

      const normalPlay: GameMove = {
        type: 'discard',
        playerId: player1Id,
        timestamp: Date.now() + 3000,
        cards: [{ id: 'num1', type: 'number', value: 5 }]
      };

      const normalResult = game.playMove(normalPlay);
      expect(normalResult.isValid).toBe(true);

      state = game.getState();
      console.log('After normal play:', {
        success: normalResult.isValid,
        currentPlayer: state.currentPlayerId
      });

      expect(state.currentPlayerId).toBe(player2Id); // Turn should advance normally

      console.log('\n=== SPECIFIC BUG TEST COMPLETE ===');
    });
  });

  describe('State Cleanup Verification', () => {
    test('should ensure no state pollution between complex sequences', () => {
      console.log('\n=== TESTING STATE CLEANUP ===');

      // Run multiple complex sequences and verify clean state each time
      for (let i = 0; i < 3; i++) {
        console.log(`\nIteration ${i + 1}: Testing state cleanup`);

        let state = game.getState();
        const currentPlayer = state.currentPlayerId;
        const otherPlayer = currentPlayer === player1Id ? player2Id : player1Id;

        console.log('Before move - State check:', {
          currentPlayer,
          jesterReveal: state.jesterReveal,
          roseBonus: state.roseQueenBonus,
          pendingAttacks: {
            knight: state.pendingKnightAttack,
            potion: state.pendingPotionAttack
          },
          stagedCards: state.stagedCards
        });

        // State should be clean before each move
        expect(state.jesterReveal).toBeUndefined();
        expect(state.roseQueenBonus).toBeUndefined();
        expect(state.pendingKnightAttack).toBeUndefined();
        expect(state.pendingPotionAttack).toBeUndefined();
        expect(state.stagedCards?.[currentPlayer]).toBeUndefined();

        // Perform a simple action
        const discardMove: GameMove = {
          type: 'discard',
          playerId: currentPlayer,
          timestamp: Date.now() + (i * 1000),
          cards: [{ id: `discard-${i}`, type: 'number', value: i + 1 }]
        };

        // Add the card to hand first
        const currentPlayerIndex = state.players.findIndex(p => p.id === currentPlayer);
        const modifiedState = {
          ...state,
          players: state.players.map((p, idx) =>
            idx === currentPlayerIndex
              ? { ...p, hand: [...p.hand, discardMove.cards[0]] }
              : p
          )
        };
        game = new GameEngineAdapter(modifiedState);

        const result = game.playMove(discardMove);
        expect(result.isValid).toBe(true);

        state = game.getState();
        console.log('After move - State check:', {
          currentPlayer: state.currentPlayerId,
          jesterReveal: state.jesterReveal,
          roseBonus: state.roseQueenBonus,
          stagedCards: state.stagedCards
        });

        // State should remain clean after simple actions
        expect(state.jesterReveal).toBeUndefined();
        expect(state.roseQueenBonus).toBeUndefined();
        expect(state.pendingKnightAttack).toBeUndefined();
        expect(state.pendingPotionAttack).toBeUndefined();
      }

      console.log('\n=== STATE CLEANUP TEST COMPLETE ===');
    });
  });
});