/**
 * GameEngineAdapter: Implements game logic using clean architecture
 * Uses ONLY new architecture types and patterns
 */

import {GameState} from '@/domain/models/GameState';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
import {Player} from '@/domain/models/Player';
import {Card} from '@/domain/models/Card';
import {GameOrchestrator} from '../services/GameOrchestrator';
import {SimpleEventBus} from '@/infrastructure/events/SimpleEventBus';
import {InMemoryGameRepository} from '@/infrastructure/persistence/InMemoryGameRepository';
import {IdGenerator} from '@/infrastructure/utils/IdGenerator';
import {createDeck, createSleepingQueens} from '@/domain/factories/CardFactory';
import {CardShuffler} from '@/infrastructure/random/CardShuffler';

import {debugLogger as testDebugLogger} from '@/infrastructure/logging/DebugLogger';

/**
 * Game engine implementation using clean architecture
 */
export class GameEngineAdapter {
  private gameState: GameState;
  private orchestrator: GameOrchestrator;
  private repository: InMemoryGameRepository;
  private readonly eventBus: SimpleEventBus;

  constructor(initialState?: Partial<GameState>) {
    // Initialize infrastructure
    this.eventBus = new SimpleEventBus();
    this.repository = new InMemoryGameRepository();
    this.orchestrator = new GameOrchestrator(this.eventBus);

    // Initialize game state
    if (initialState && initialState.id) {
      // Loading existing game
      this.gameState = initialState as GameState;
    } else {
      // Creating new game
      const maxPlayers = initialState?.maxPlayers || 5;
      this.gameState = this.createInitialGameState(maxPlayers);
    }

    // Store in repository
    this.repository.save(this.gameState);
  }


  /**
   * Create initial game state
   */
  private createInitialGameState(maxPlayers: number): GameState {
    const gameId = IdGenerator.generateGameId();
    const roomCode = IdGenerator.generateRoomCode();

    return {
      id: gameId,
      roomCode,
      players: [],
      currentPlayerIndex: 0,
      currentPlayerId: null,
      sleepingQueens: createSleepingQueens(),
      deck: CardShuffler.shuffle(createDeck()),
      discardPile: [],
      phase: 'waiting',
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maxPlayers,
      version: 1
    };
  }

  /**
   * Get current game state
   */
  getState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Set game state (for testing)
   */
  setState(state: GameState): void {
    this.gameState = state;
    this.repository.save(this.gameState);
  }

  /**
   * Add a player to the game
   */
  addPlayer(player: Player): boolean {
    testDebugLogger.logPlayer(`Adding player ${player.name}`, { player });

    if (this.gameState.players.length >= this.gameState.maxPlayers) {
      testDebugLogger.logPlayer(`Cannot add player - game is full`, { maxPlayers: this.gameState.maxPlayers });
      return false;
    }

    if (this.gameState.players.some(p => p.id === player.id)) {
      testDebugLogger.logPlayer(`Cannot add player - duplicate id: ${player.id}`, { player });
      return false;
    }

    // Create new state with added player
    this.gameState = {
      ...this.gameState,
      players: [
        ...this.gameState.players,
        {
          ...player,
          position: this.gameState.players.length,
          hand: [],
          queens: [],
          score: 0
        }
      ],
      updatedAt: Date.now()
    };

    this.repository.save(this.gameState);
    // Log messages that match the test expectations
    const position = this.gameState.players.length - 1;
    testDebugLogger.logPlayer(`Added player: ${player.name} (${player.id}) at position ${position}`, {
      playerCount: this.gameState.players.length,
      player
    });
    testDebugLogger.logPlayer(`Total players: ${this.gameState.players.length}`, {
      playerCount: this.gameState.players.length
    });
    return true;
  }

  /**
   * Start the game
   */
  startGame(): boolean {
    testDebugLogger.logState(`Starting game with ${this.gameState.players.length} players`, { playerCount: this.gameState.players.length });

    if (this.gameState.players.length < 2) {
      testDebugLogger.logState(`Cannot start game - need at least 2 players, have ${this.gameState.players.length}`, { playerCount: this.gameState.players.length });
      return false;
    }

    // Don't start if already started
    if (this.gameState.phase === 'playing') {
      testDebugLogger.logState('Game already started', { phase: this.gameState.phase });
      return false;
    }

    // Deal cards to players - create new deck and players arrays
    const newDeck = [...this.gameState.deck];
    const newPlayers = this.gameState.players.map(player => {
      const newHand: Card[] = [];
      for (let i = 0; i < 5; i++) {
        if (newDeck.length > 0) {
          const card = newDeck.pop();
          if (card) {
            newHand.push(card);
          }
        }
      }
      // Log card dealing for each player
      testDebugLogger.logState(`Dealt 5 cards to ${player.name}:`, { playerName: player.name, handSize: newHand.length });
      return {
        ...player,
        hand: newHand
      };
    });

    // Create new state with dealt cards
    this.gameState = {
      ...this.gameState,
      players: newPlayers,
      deck: newDeck,
      currentPlayerIndex: 0,
      currentPlayerId: this.gameState.players[0].id,
      phase: 'playing' as const,
      updatedAt: Date.now()
    };

    this.repository.save(this.gameState);
    testDebugLogger.logState('Game started successfully', {
      phase: this.gameState.phase,
      currentPlayer: this.gameState.currentPlayerId,
      playerCount: this.gameState.players.length
    });
    // Log first turn
    testDebugLogger.logTurn(`First turn: ${this.gameState.players[0].name}`, {
      currentPlayer: this.gameState.currentPlayerId,
      playerName: this.gameState.players[0].name
    });
    return true;
  }


  /**
   * Process a move (main entry point for all game actions)
   */
  processMove(move: GameMove): MoveValidationResult {
    // Log the move attempt
    const attemptMessage = `Player ${move.playerId} attempting ${move.type} move`;
    testDebugLogger.logAction(attemptMessage, move);
    testDebugLogger.logAction('Processing move', { move });

    // Use the orchestrator to process the move
    const result = this.orchestrator.processMove(move, this.gameState);

    if (result.isValid && result.newState) {
      // Update our state with the new state from orchestrator
      this.gameState = result.newState;
      this.repository.save(this.gameState);
      const successMessage = `Move ${move.type} by ${move.playerId} succeeded`;
      testDebugLogger.logAction(successMessage);
    } else {
      const failMessage = `Move ${move.type} by ${move.playerId} failed:`;
      testDebugLogger.logAction(failMessage, { error: result.error });
    }

    // Return without newState to match the expected interface
    return { isValid: result.isValid, error: result.error, message: result.message };
  }


  /**
   * Alias for processMove (backward compatibility)
   */
  playMove(move: GameMove): MoveValidationResult {
    return this.processMove(move);
  }

  /**
   * Check if a move is valid
   */
  isValidMove(move: GameMove): MoveValidationResult {
    return this.orchestrator.validateMove(move, this.gameState);
  }

  /**
   * Validate a move (backward compatibility alias)
   */
  validateMove(move: GameMove): MoveValidationResult {
    return this.isValidMove(move);
  }

  /**
   * Get game statistics
   */
  getStats() {
    return {
      totalMoves: 0, // Would need to track this
      gameId: this.gameState.id,
      roomCode: this.gameState.roomCode
    };
  }

  /**
   * Reset the game
   */
  resetGame(): void {
    const maxPlayers = this.gameState.maxPlayers;
    this.gameState = this.createInitialGameState(maxPlayers);
    this.repository.save(this.gameState);
  }

  /**
   * Helper methods for testing and UI
   */
  getPendingKnightAttack() {
    return this.gameState.pendingKnightAttack;
  }

  getPendingPotionAttack() {
    return this.gameState.pendingPotionAttack;
  }

  canPlayerPlayDragon(playerId: string): boolean {
    if (!this.gameState.pendingKnightAttack) return false;
    if (this.gameState.pendingKnightAttack.target !== playerId) return false;
    const player = this.gameState.players.find(p => p.id === playerId);
    return player?.hand.some(c => c.type === 'dragon') || false;
  }

  canPlayerPlayWand(playerId: string): boolean {
    if (!this.gameState.pendingPotionAttack) return false;
    const player = this.gameState.players.find(p => p.id === playerId);
    return player?.hand.some(c => c.type === 'wand') || false;
  }

  removePlayer(playerId: string): boolean {
    if (this.gameState.phase !== 'waiting') {
      return false; // Can't remove players after game starts
    }

    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return false;
    }

    const newPlayers = this.gameState.players.filter(p => p.id !== playerId);
    this.gameState = {
      ...this.gameState,
      players: newPlayers,
      updatedAt: Date.now()
    };

    this.repository.save(this.gameState);
    return true;
  }

  getCurrentTurnPlayer(): Player | null {
    if (this.gameState.currentPlayerIndex < 0 ||
        this.gameState.currentPlayerIndex >= this.gameState.players.length) {
      return null;
    }
    return this.gameState.players[this.gameState.currentPlayerIndex];
  }

  /**
   * Allow a knight attack to proceed (defender chooses not to block)
   */
  allowKnightAttack(): MoveValidationResult {
    if (!this.gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    const targetId = this.gameState.pendingKnightAttack.target;
    if (!targetId) {
      return { isValid: false, error: 'No target in pending knight attack' };
    }

    const move: GameMove = {
      type: 'allow_knight_attack' as any,
      playerId: targetId,
      cards: [],
      timestamp: Date.now()
    };

    return this.processMove(move);
  }

  /**
   * Allow a potion attack to proceed (no one blocks with wand)
   */
  allowPotionAttack(): MoveValidationResult {
    if (!this.gameState.pendingPotionAttack) {
      return { isValid: false, error: 'No pending potion attack' };
    }

    const move: GameMove = {
      type: 'allow_potion_attack' as any,
      playerId: this.gameState.pendingPotionAttack.attacker,
      cards: [],
      timestamp: Date.now()
    };

    return this.processMove(move);
  }
}

// Export as default to match GameEngine export pattern
export default GameEngineAdapter;