import { PlayJesterCommand } from '../PlayJesterCommand';
import { GameState } from '../../../domain/models/GameState';
import { GameMove } from '../../../domain/models/GameMove';

describe('PlayJesterCommand - Rose Queen Bonus', () => {
  it('should trigger Rose Queen bonus when Rose Queen is awakened via Jester', () => {
    // Setup: Game state after jester reveal waiting for queen selection
    const state: GameState = {
      id: 'test-game',
      players: [
        {
          id: 'player1',
          name: 'Player 1',
          hand: [],
          queens: [],
          score: 0,
          position: 0,
          isConnected: true
        },
        {
          id: 'player2',
          name: 'Player 2',
          hand: [
            { id: 'card1', type: 'king', name: 'King' }
          ],
          queens: [],
          score: 0,
          position: 1,
          isConnected: true
        }
      ],
      currentPlayerIndex: 0,
      currentPlayerId: 'player1',
      sleepingQueens: [
        { id: 'rose-queen', type: 'queen', name: 'Rose Queen', points: 5, isAwake: false },
        { id: 'cake-queen', type: 'queen', name: 'Cake Queen', points: 10, isAwake: false }
      ],
      deck: [],
      discardPile: [],
      phase: 'playing',
      jesterReveal: {
        revealedCard: { id: 'number-3', type: 'number', value: 3 },
        targetPlayer: 'player1',
        originalPlayerId: 'player1',
        waitingForQueenSelection: true
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxPlayers: 4,
      roomCode: 'TEST',
      version: 1
    };

    // Move: Select Rose Queen
    const move: GameMove = {
      playerId: 'player1',
      type: 'play_jester',
      targetCard: { id: 'rose-queen', type: 'queen', name: 'Rose Queen', points: 5 },
      timestamp: Date.now()
    };

    const command = new PlayJesterCommand(state, move);

    // Validate the move is allowed
    const validation = command.validate();
    expect(validation.isValid).toBe(true);

    // Execute the move
    const newState = command.execute();

    // Check Rose Queen was awakened
    const player1 = newState.players.find(p => p.id === 'player1');
    expect(player1?.queens).toHaveLength(1);
    expect(player1?.queens[0].name).toBe('Rose Queen');

    // Check Rose Queen bonus was triggered
    expect(newState.roseQueenBonus).toBeDefined();
    expect(newState.roseQueenBonus?.playerId).toBe('player1');
    expect(newState.roseQueenBonus?.pending).toBe(true);

    // Check jester reveal was cleared
    expect(newState.jesterReveal).toBeUndefined();
  });

  it('should not trigger Rose Queen bonus for other queens', () => {
    // Setup: Game state after jester reveal waiting for queen selection
    const state: GameState = {
      id: 'test-game',
      players: [
        {
          id: 'player1',
          name: 'Player 1',
          hand: [],
          queens: [],
          score: 0,
          position: 0,
          isConnected: true
        }
      ],
      currentPlayerIndex: 0,
      currentPlayerId: 'player1',
      sleepingQueens: [
        { id: 'cake-queen', type: 'queen', name: 'Cake Queen', points: 10, isAwake: false }
      ],
      deck: [],
      discardPile: [],
      phase: 'playing',
      jesterReveal: {
        revealedCard: { id: 'number-1', type: 'number', value: 1 },
        targetPlayer: 'player1',
        originalPlayerId: 'player1',
        waitingForQueenSelection: true
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxPlayers: 4,
      roomCode: 'TEST',
      version: 1
    };

    // Move: Select Cake Queen
    const move: GameMove = {
      playerId: 'player1',
      type: 'play_jester',
      targetCard: { id: 'cake-queen', type: 'queen', name: 'Cake Queen', points: 10 },
      timestamp: Date.now()
    };

    const command = new PlayJesterCommand(state, move);
    const newState = command.execute();

    // Check Cake Queen was awakened
    const player1 = newState.players.find(p => p.id === 'player1');
    expect(player1?.queens).toHaveLength(1);
    expect(player1?.queens[0].name).toBe('Cake Queen');

    // Check Rose Queen bonus was NOT triggered
    expect(newState.roseQueenBonus).toBeUndefined();
  });
});