import { 
  GameState, 
  Player, 
  Card,
  GameMove, 
  MoveValidationResult
} from '../types';

import { 
  createDeck, 
  shuffleDeck, 
  createSleepingQueens, 
  GAME_CONFIG 
} from '../cards';

import { generateGameId, generateRoomCode } from '../utils';
import { debugLogger } from '../utils/DebugLogger';

// Import our new service classes
import { ruleEngine } from './RuleEngine';
import { turnManager } from './TurnManager';
import { scoreCalculator } from './ScoreCalculator';
import { CardManager } from './CardManager';

// Import move handlers
import { kingMoveHandler } from '../moves/KingMoveHandler';
import {KnightMoveHandler, knightMoveHandler} from '../moves/KnightMoveHandler';
import { mathMoveHandler } from '../moves/MathMoveHandler';
import { discardMoveHandler } from '../moves/DiscardMoveHandler';
import { wandMoveHandler } from '../moves/WandMoveHandler';
import {PotionMoveHandler, potionMoveHandler} from '../moves/PotionMoveHandler';
import { jesterMoveHandler } from '../moves/JesterMoveHandler';
import { stageMoveHandler } from '../moves/StageMoveHandler';

/**
 * Refactored Game Engine that orchestrates services and handlers.
 * Reduced from 1,245 lines to a focused orchestration layer.
 */
export class GameEngine {
  private gameState: GameState;
  private cardManager: CardManager;
  static readonly DEFENSE_WINDOW_MS = 5000; // 5 seconds for defense

  constructor(initialState?: Partial<GameState>) {
    this.gameState = {
      id: initialState?.id || generateGameId(),
      players: initialState?.players || [],
      currentPlayerIndex: initialState?.currentPlayerIndex || 0,
      currentPlayerId: initialState?.currentPlayerId || null,
      sleepingQueens: initialState?.sleepingQueens || createSleepingQueens(),
      deck: initialState?.deck || shuffleDeck(createDeck()),
      discardPile: initialState?.discardPile || [],
      phase: initialState?.phase || 'waiting',
      winner: initialState?.winner || null,
      gameMessage: initialState?.gameMessage || '',
      createdAt: initialState?.createdAt || Date.now(),
      updatedAt: initialState?.updatedAt || Date.now(),
      roomCode: initialState?.roomCode || generateRoomCode(),
      maxPlayers: initialState?.maxPlayers || GAME_CONFIG.maxPlayers,
      version: initialState?.version || 1,
      lastMoveId: initialState?.lastMoveId || undefined,
      lastMoveBy: initialState?.lastMoveBy || undefined,
      stagedCard: initialState?.stagedCard || undefined,
      stagedCards: initialState?.stagedCards || [],
      pendingKnightAttack: initialState?.pendingKnightAttack || undefined,
      jesterReveal: initialState?.jesterReveal || undefined
    };

    // Initialize CardManager with the deck
    this.cardManager = new CardManager({ 
      deck: this.gameState.deck, 
      discardPile: this.gameState.discardPile 
    });
  }

  /**
   * Get current game state
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Get current game state (backward compatibility alias)
   */
  getState(): GameState {
    return JSON.parse(JSON.stringify(this.gameState));
  }

  /**
   * Set/update the game state - used for syncing with server updates
   */
  setState(newState: GameState): void {
    this.gameState = JSON.parse(JSON.stringify(newState));
  }

  /**
   * Add a player to the game
   */
  addPlayer(player: Player): boolean {
    try {
      if (this.gameState.players.find(p => p.id === player.id)) {
        debugLogger.logValidation(`Cannot add player - duplicate id: ${player.id}`);
        return false; // Player already exists
      }

      if (this.gameState.phase !== 'waiting') {
        debugLogger.logValidation(`Cannot add player - game phase is ${this.gameState.phase}`);
        return false; // Game already started
      }

      if (this.gameState.players.length >= 5) { // Max players
        debugLogger.logValidation(`Cannot add player - max players (5) reached`);
        return false; // Game is full
      }

      this.gameState.players.push({
        ...player,
        position: this.gameState.players.length,
        hand: [],
        queens: [],
        score: 0
      });

      debugLogger.logPlayer(`Added player: ${player.name} (${player.id}) at position ${this.gameState.players.length - 1}`);
      debugLogger.logState(`Total players: ${this.gameState.players.length}`);

      this.gameState.updatedAt = Date.now();
      return true;
    } catch (error) {
      console.error('Error adding player:', error);
      return false;
    }
  }

  /**
   * Start the game - deal cards and set up initial state
   */
  startGame(): boolean {
    if (this.gameState.players.length < 2) {
      debugLogger.logValidation(`Cannot start game - need at least 2 players, have ${this.gameState.players.length}`);
      return false;
    }
    
    if (this.gameState.phase === 'playing') {
      debugLogger.logValidation(`Cannot start game - already in progress`);
      return false;
    }
    
    debugLogger.logState(`Starting game with ${this.gameState.players.length} players`);

    // Deal initial hands
    for (const player of this.gameState.players) {
      const dealtCards: string[] = [];
      for (let i = 0; i < GAME_CONFIG.initialHandSize; i++) {
        const card = this.drawCard();
        if (card) {
          player.hand.push(card);
          dealtCards.push(card.name || `${card.type}`);
        }
      }
      debugLogger.logCard(`Dealt ${dealtCards.length} cards to ${player.name}: ${dealtCards.join(', ')}`);
    }

    // Initialize turn system
    turnManager.initializeTurns(this.gameState);
    debugLogger.logTurn(`First turn: ${this.gameState.players[0].name}`);
    
    this.gameState.phase = 'playing';
    this.gameState.updatedAt = Date.now();
    return true;
  }

  /**
   * Main move processing entry point
   */
  processMove(move: GameMove): MoveValidationResult {
    // First validate the move using our validation service
    const validationResult = ruleEngine.validateMove(move, this.gameState);
    if (!validationResult.isValid) {
      debugLogger.logValidation(`Turn validation failed: ${validationResult.error}`);
      return validationResult;
    }

    // Execute the move using appropriate handler
    return this.executeMove(move);
  }

  /**
   * Route move to appropriate handler based on move type
   */
  private executeMove(move: GameMove): MoveValidationResult {
    console.log('[GameEngine] executeMove called with type:', move.type);

    try {
      switch (move.type) {
        case 'play_king':
          return kingMoveHandler.executeMove(move, this.gameState);

        case 'play_knight':
          console.log('[GameEngine] Executing knight move');
          return knightMoveHandler.executeMove(move, this.gameState);

        case 'play_dragon':
          return this.executeDragonMove(move);

        case 'play_wand':
          return this.executeWandMove(move);

        case 'play_potion':
          return this.executePotionMove(move);

        case 'play_jester':
          return this.executeJesterMove(move);

        case 'play_math':
          return mathMoveHandler.executeMove(move, this.gameState);

        case 'discard':
          return this.executeDiscardMove(move);

        case 'stage_card':
          return this.executeStageMove(move);

        case 'allow_knight_attack':
          console.log('[GameEngine] Executing allow_knight_attack');
          return this.allowKnightAttack();

        case 'allow_potion_attack':
          return this.allowPotionAttack();

        default:
          return { isValid: false, error: 'Unknown move type' };
      }
    } catch (error) {
      console.error('Error executing move:', error);
      return { isValid: false, error: 'Internal error processing move' };
    }
  }

  /**
   * Handle dragon defense moves
   */
  private executeDragonMove(move: GameMove): MoveValidationResult {
    return knightMoveHandler.handleDragonDefense(this.gameState, move.playerId);
  }

  /**
   * Handle wand moves
   */
  private executeWandMove(move: GameMove): MoveValidationResult {
    return wandMoveHandler.executeMove(move, this.gameState);
  }

  /**
   * Handle potion moves
   */
  private executePotionMove(move: GameMove): MoveValidationResult {
    return potionMoveHandler.executeMove(move, this.gameState);
  }

  /**
   * Handle jester moves
   */
  private executeJesterMove(move: GameMove): MoveValidationResult {
    return jesterMoveHandler.executeMove(move, this.gameState);
  }

  /**
   * Handle discard moves
   */
  private executeDiscardMove(move: GameMove): MoveValidationResult {
    return discardMoveHandler.executeMove(move, this.gameState);
  }

  /**
   * Handle stage moves
   */
  private executeStageMove(move: GameMove): MoveValidationResult {
    return stageMoveHandler.executeMove(move, this.gameState);
  }

  /**
   * Check if a move is valid
   */
  isValidMove(move: GameMove): MoveValidationResult {
    return ruleEngine.validateMove(move, this.gameState);
  }

  /**
   * Validate a move (backward compatibility alias)
   */
  validateMove(move: GameMove): MoveValidationResult {
    return this.isValidMove(move);
  }

  /**
   * Play a move (backward compatibility alias)
   */
  playMove(move: GameMove): MoveValidationResult {
    debugLogger.logAction(`Player ${move.playerId} attempting ${move.type} move`, move);
    const result = this.processMove(move);
    if (result.isValid) {
      // Increment version on successful moves
      this.gameState.version++;
      this.gameState.updatedAt = Date.now();
      debugLogger.logAction(`Move ${move.type} by ${move.playerId} succeeded`);
    } else {
      debugLogger.logValidation(`Move ${move.type} by ${move.playerId} failed: ${result.error}`);
    }
    return result;
  }

  /**
   * Get current turn player
   */
  getCurrentTurnPlayer(): Player | null {
    return turnManager.getCurrentTurnPlayer(this.gameState);
  }

  /**
   * Check if player can play dragon defense
   */
  canPlayerPlayDragon(playerId: string): boolean {
    if (!this.gameState.pendingKnightAttack) return false;
    if (this.gameState.pendingKnightAttack.target !== playerId) return false;
    
    const player = this.gameState.players.find(p => p.id === playerId);
    return player ? player.hand.some(card => card.type === 'dragon') : false;
  }

  /**
   * Get remaining defense time for knight attacks
   */
  getRemainingDefenseTime(): number {
    if (!this.gameState.pendingKnightAttack) return 0;
    return Math.max(0, this.gameState.pendingKnightAttack.defenseDeadline - Date.now());
  }

  /**
   * Complete knight attack when time expires
   */
  completeKnightAttackTimeout(): MoveValidationResult {
    return knightMoveHandler.completeKnightAttack(this.gameState);
  }

  /**
   * Complete potion attack when time expires
   */
  completePotionAttackTimeout(): MoveValidationResult {
    return potionMoveHandler.completePotionAttack(this.gameState);
  }

  /**
   * Check if player can play wand defense
   */
  canPlayerPlayWand(playerId: string): boolean {
    if (!this.gameState.pendingPotionAttack) return false;
    if (this.gameState.pendingPotionAttack.target !== playerId) return false;
    
    const player = this.gameState.players.find(p => p.id === playerId);
    return player ? player.hand.some(card => card.type === 'wand') : false;
  }

  /**
   * Get remaining defense time for potion attacks
   */
  getRemainingPotionDefenseTime(): number {
    if (!this.gameState.pendingPotionAttack) return 0;
    return Math.max(0, this.gameState.pendingPotionAttack.defenseDeadline - Date.now());
  }

  /**
   * Draw a card from the deck
   */
  private drawCard(): Card | null {
    if (this.gameState.deck.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * this.gameState.deck.length);
    const card = this.gameState.deck.splice(randomIndex, 1)[0];
    return card;
  }

  /**
   * Get game statistics
   */
  getGameStats() {
    return {
      playerCount: this.gameState.players.length,
      cardsRemaining: this.gameState.deck.length,
      queensAwakened: this.gameState.players.reduce((total, p) => total + p.queens.length, 0),
      queensSleeping: this.gameState.sleepingQueens.length,
      leaderboard: scoreCalculator.getLeaderboard(this.gameState),
      winRequirements: scoreCalculator.getWinRequirements(this.gameState)
    };
  }

  /**
   * For testing purposes - allows direct access to internal state
   */
  getInternalState(): GameState {
    return this.gameState;
  }

  removePlayer(playerId: string): boolean {
    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    // Remove player
    this.gameState.players.splice(playerIndex, 1);

    // Update positions
    this.gameState.players.forEach((player, index) => {
      player.position = index;
    });

    // Adjust current player index
    if (this.gameState.currentPlayerIndex >= this.gameState.players.length) {
      this.gameState.currentPlayerIndex = 0;
    }

    // End game if not enough players
    if (this.gameState.phase === 'playing' && this.gameState.players.length < GAME_CONFIG.minPlayers) {
      this.gameState.phase = 'ended';
    }

    return true;
  }

  getPendingKnightAttack() {
    return this.gameState.pendingKnightAttack;
  }

  getPendingPotionAttack() {
    return this.gameState.pendingPotionAttack;
  }

  allowKnightAttack(): MoveValidationResult {
    console.log('[GameEngine] allowKnightAttack called', {
      hasPendingAttack: !!this.gameState.pendingKnightAttack,
      pendingAttack: this.gameState.pendingKnightAttack
    });

    if (!this.gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    // Complete the knight attack
    const knightHandler = new KnightMoveHandler();
    const result = knightHandler.completeKnightAttack(this.gameState);
    console.log('[GameEngine] Knight attack completion result:', result);
    return result;
  }

  allowPotionAttack(): MoveValidationResult {
    if (!this.gameState.pendingPotionAttack) {
      return { isValid: false, error: 'No pending potion attack' };
    }

    // Complete the potion attack
    const potionHandler = new PotionMoveHandler();
    return potionHandler.completePotionAttack(this.gameState);
  }
}

// Export the class for use
export { GameEngine as SleepingQueensGame }; // Maintain backward compatibility