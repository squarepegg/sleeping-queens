import { Card, GameState, GameMove, MoveValidationResult, Player, Queen, NumberCard } from '../types';
import { validateMathEquation } from '../../lib/utils/mathValidator';

/**
 * RuleEngine - Validates game moves according to Sleeping Queens rules
 * Follows Single Responsibility Principle - only validates rules
 */
export class RuleEngine {
  private static instance: RuleEngine;

  public static getInstance(): RuleEngine {
    if (!RuleEngine.instance) {
      RuleEngine.instance = new RuleEngine();
    }
    return RuleEngine.instance;
  }
  /**
   * Validate if a move is legal according to game rules
   */
  public validateMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Check basic move structure
    if (!move || !move.playerId || !move.type) {
      return { isValid: false, error: 'Invalid move structure' };
    }

    // Check if the player can act (normal turn or special action)
    if (!this.canPlayerAct(move.playerId, move, gameState)) {
      return { isValid: false, error: 'Not your turn' };
    }

    // Validate based on move type
    switch (move.type) {
      case 'play_king':
        return this.validateKingMove(move, gameState);
      case 'play_knight':
        return this.validateKnightMove(move, gameState);
      case 'play_dragon':
        return this.validateDragonMove(move, gameState);
      case 'play_wand':
        return this.validateWandMove(move, gameState);
      case 'play_potion':
        return this.validatePotionMove(move, gameState);
      case 'play_jester':
        return this.validateJesterMove(move, gameState);
      case 'discard':
        return this.validateDiscardMove(move, gameState);
      case 'play_math':
        return this.validateEquationMove(move, gameState);
      case 'stage_card':
        return this.validateStageMove(move, gameState);
      case 'allow_knight_attack':
        return this.validateAllowKnightAttack(move, gameState);
      case 'allow_potion_attack':
        return this.validateAllowPotionAttack(move, gameState);
      default:
        return { isValid: false, error: `Unknown move type: ${move.type}` };
    }
  }

  /**
   * Check if a player can currently act (either their turn or special action)
   */
  private canPlayerAct(playerId: string, move: GameMove, gameState: GameState): boolean {
    // Case 1: It's the player's normal turn
    if (gameState.currentPlayerId === playerId) {
      return true;
    }

    // Case 2: Jester revealed a number and it landed on this player
    if (move.type === 'play_jester' &&
        gameState.jesterReveal?.waitingForQueenSelection &&
        gameState.jesterReveal?.targetPlayerId === playerId) {
      return true;
    }

    // Case 3: Player is defending against Knight attack with Dragon
    if (move.type === 'play_dragon' &&
        gameState.pendingKnightAttack?.target === playerId) {
      return true;
    }

    // Case 4: Player is defending against Potion attack with Wand
    if (move.type === 'play_wand' &&
        gameState.pendingPotionAttack?.target === playerId) {
      return true;
    }

    return false;
  }

  /**
   * Check if it's the player's turn (legacy - for specific validations)
   */
  private isPlayerTurn(playerId: string, gameState: GameState): boolean {
    return gameState.currentPlayerId === playerId;
  }

  /**
   * Validate King move - can wake a sleeping queen
   */
  private validateKingMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array + targetCard) and legacy format (cardId + targetQueenId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;
    
    if (!cardId || !targetQueenId) {
      return { isValid: false, error: 'King move requires card and target queen' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'king') {
      return { isValid: false, error: 'Card is not a king' };
    }

    const queen = gameState.sleepingQueens.find(q => q.id === targetQueenId);
    if (!queen) {
      return { isValid: false, error: 'Target queen not found or already awake' };
    }

    return { isValid: true };
  }

  /**
   * Validate Knight move - can steal a queen from another player
   */
  private validateKnightMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array + targetCard) and legacy format (cardId + targetQueenId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;
    const targetPlayerId = move.targetPlayerId || move.targetPlayer;
    
    if (!cardId || !targetPlayerId || !targetQueenId) {
      return { isValid: false, error: 'Knight move requires card, target player, and target queen' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'knight') {
      return { isValid: false, error: 'Card is not a knight' };
    }

    if (targetPlayerId === move.playerId) {
      return { isValid: false, error: 'Cannot steal from yourself' };
    }

    const targetPlayer = this.getPlayer(targetPlayerId, gameState);
    if (!targetPlayer) {
      return { isValid: false, error: 'Target player not found' };
    }

    const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId);
    if (!targetQueen) {
      return { isValid: false, error: 'Target player does not have that queen' };
    }

    return { isValid: true };
  }

  /**
   * Validate Dragon move - blocks knight attacks
   */
  private validateDragonMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array) and legacy format (cardId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    
    if (!cardId) {
      return { isValid: false, error: 'Dragon move requires card' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'dragon') {
      return { isValid: false, error: 'Card is not a dragon' };
    }

    // Dragons can only be played in response to a knight attack
    // This would need to check if there's a pending knight attack
    // For now, we'll validate basic structure
    return { isValid: true };
  }

  /**
   * Validate Wand move - blocks sleeping potion attacks
   */
  private validateWandMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array) and legacy format (cardId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);

    if (!cardId) {
      return { isValid: false, error: 'Wand move requires card' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'wand') {
      return { isValid: false, error: 'Card is not a wand' };
    }

    // Wands can only be played in response to a potion attack
    // This is checked in canPlayerAct
    return { isValid: true };
  }

  /**
   * Validate Potion move - can block wand or use wand effect
   */
  private validatePotionMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array) and legacy format (cardId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    const targetQueenId = move.targetQueenId || move.targetQueen || move.targetCard?.id;
    const targetPlayerId = move.targetPlayerId || move.targetPlayer;
    
    if (!cardId) {
      return { isValid: false, error: 'Potion move requires card' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'potion') {
      return { isValid: false, error: 'Card is not a potion' };
    }

    // Potion can be used defensively or offensively
    // If used offensively, it acts like a wand
    if (targetPlayerId && targetQueenId) {
      if (targetPlayerId === move.playerId) {
        return { isValid: false, error: 'Cannot use potion on your own queens' };
      }

      const targetPlayer = this.getPlayer(targetPlayerId, gameState);
      if (!targetPlayer) {
        return { isValid: false, error: 'Target player not found' };
      }

      const targetQueen = targetPlayer.queens.find(q => q.id === targetQueenId);
      if (!targetQueen) {
        return { isValid: false, error: 'Target player does not have that queen' };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate Jester move - draw from deck and potentially take another turn
   */
  private validateJesterMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Special case: if there's a jester reveal waiting for queen selection
    if (gameState.jesterReveal?.waitingForQueenSelection) {
      // Check if this player is the one who should select
      if (move.playerId !== gameState.jesterReveal.targetPlayerId) {
        return { isValid: false, error: 'Only the target player can select a queen' };
      }
      // For queen selection, we need a targetCard
      if (!move.targetCard) {
        return { isValid: false, error: 'No queen selected' };
      }
      // Allow the queen selection without turn check
      return { isValid: true };
    }
    
    // Support both new format (cards array) and legacy format (cardId)
    const cardId = move.cardId || (move.cards && move.cards[0]?.id);
    
    if (!cardId) {
      return { isValid: false, error: 'Jester move requires card' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card || card.type !== 'jester') {
      return { isValid: false, error: 'Card is not a jester' };
    }

    return { isValid: true };
  }

  /**
   * Validate discard move - discard cards (single action card or multiple numbers forming equation)
   */
  private validateDiscardMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array) and legacy format (cardIds)
    const cardIds = move.cardIds || (move.cards && move.cards.map(c => c.id));
    
    if (!cardIds || cardIds.length === 0) {
      return { isValid: false, error: 'Discard move requires at least one card' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Build cards array from IDs
    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = player.hand.find(c => c.id === cardId);
      if (!card) {
        return { isValid: false, error: `Card ${cardId} not found in hand` };
      }
      cards.push(card);
    }

    // If discarding a single card, it can be any type (number or action)
    if (cards.length === 1) {
      return { isValid: true };
    }

    // If discarding exactly 2 cards, they must be identical number cards (a pair)
    if (cards.length === 2) {
      if (cards[0].type !== 'number' || cards[1].type !== 'number') {
        return { isValid: false, error: 'Pairs must be number cards' };
      }
      const numberCards = cards as NumberCard[];
      if (numberCards[0].value !== numberCards[1].value) {
        return { isValid: false, error: 'Pairs must have identical values' };
      }
      return { isValid: true };
    }

    // If discarding 3+ cards, they must all be numbers and form an equation
    for (const card of cards) {
      if (card.type !== 'number') {
        return { isValid: false, error: `Card ${card.id} is not a number card` };
      }
    }

    // Check they form a valid equation
    if (!this.validateEquation(cards)) {
      return { isValid: false, error: 'Cards do not form a valid equation' };
    }

    return { isValid: true };
  }

  /**
   * Validate equation move - play a valid math equation
   */
  private validateStageMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Turn check already done in main validateMove method

    if (!move.cards || move.cards.length === 0) {
      return { isValid: false, error: 'No cards to stage' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Validate all cards are in player's hand
    for (const card of move.cards) {
      const cardInHand = player.hand.find(c => c.id === card.id);
      if (!cardInHand) {
        return { isValid: false, error: `Card ${card.id} not found in hand` };
      }
    }

    return { isValid: true };
  }

  private validateEquationMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Support both new format (cards array) and legacy format (cardIds)
    const cardIds = move.cardIds || (move.cards && move.cards.map(c => c.id));
    
    if (!cardIds || cardIds.length < 3) {
      return { isValid: false, error: 'Equation requires at least 3 cards' };
    }

    const player = this.getPlayer(move.playerId, gameState);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    const cards: Card[] = [];
    for (const cardId of cardIds) {
      const card = player.hand.find(c => c.id === cardId);
      if (!card) {
        return { isValid: false, error: `Card ${cardId} not found in hand` };
      }
      if (card.type !== 'number') {
        return { isValid: false, error: 'All cards in equation must be numbers' };
      }
      cards.push(card);
    }

    if (!this.validateEquation(cards)) {
      return { isValid: false, error: 'Cards do not form a valid equation' };
    }

    return { isValid: true };
  }

  /**
   * Validate if cards form a valid equation
   */
  private validateEquation(cards: Card[]): boolean {
    if (cards.length < 3 || cards.length > 5) {
      return false;
    }

    const values = cards.map(c => c.value || 0);
    
    // Try all possible equation combinations
    // For 3 cards: a + b = c, a - b = c, a * b = c
    if (cards.length === 3) {
      const [a, b, c] = values;
      return (
        a + b === c ||
        a - b === c ||
        a * b === c ||
        b + c === a ||
        b - c === a ||
        b * c === a ||
        a + c === b ||
        a - c === b ||
        a * c === b
      );
    }

    // For 4 cards: a + b + c = d, etc.
    if (cards.length === 4) {
      const [a, b, c, d] = values;
      return (
        a + b + c === d ||
        a + b - c === d ||
        a - b + c === d ||
        a - b - c === d ||
        a * b + c === d ||
        a * b - c === d ||
        (a + b) * c === d ||
        (a - b) * c === d
      );
    }

    // For 5 cards: a + b + c + d = e, etc.
    if (cards.length === 5) {
      const [a, b, c, d, e] = values;
      return (
        a + b + c + d === e ||
        a + b + c - d === e ||
        a + b - c + d === e ||
        a - b + c + d === e ||
        (a + b) * c + d === e ||
        (a + b) * c - d === e ||
        a * b + c + d === e ||
        a * b - c + d === e ||
        a * b + c - d === e ||
        a * b - c - d === e
      );
    }

    return false;
  }

  /**
   * Get player by ID
   */
  private getPlayer(playerId: string, gameState: GameState): Player | undefined {
    return gameState.players.find(p => p.id === playerId);
  }

  /**
   * Check if game has reached win condition
   */
  public checkWinCondition(gameState: GameState): { hasWinner: boolean; winnerId?: string } {
    for (const player of gameState.players) {
      // Check for 50+ points
      const points = player.queens.reduce((sum, q) => sum + q.points, 0);
      if (points >= 50) {
        return { hasWinner: true, winnerId: player.id };
      }

      // Check for 5+ queens
      if (player.queens.length >= 5) {
        return { hasWinner: true, winnerId: player.id };
      }
    }

    // Check if all queens are awake (game ends)
    if (gameState.sleepingQueens.length === 0) {
      // Find player with most points
      let maxPoints = 0;
      let winnerId = '';
      
      for (const player of gameState.players) {
        const points = player.queens.reduce((sum, q) => sum + q.points, 0);
        if (points > maxPoints) {
          maxPoints = points;
          winnerId = player.id;
        }
      }
      
      if (winnerId) {
        return { hasWinner: true, winnerId };
      }
    }

    return { hasWinner: false };
  }

  /**
   * Validate special card combinations (e.g., matching jesters)
   */
  public validateSpecialCombination(cards: Card[]): boolean {
    // Check for matching jesters
    if (cards.length === 2 && cards.every(c => c.type === 'jester')) {
      // Both cards are jesters - this is valid
      return true;
    }

    return false;
  }
  
  /**
   * Validate allow knight attack move
   */
  private validateAllowKnightAttack(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    // Allow the target to explicitly allow the attack
    // OR allow any player to complete the attack if the defense time has expired
    const now = Date.now();
    const isDefender = move.playerId === gameState.pendingKnightAttack.target;
    const isExpired = now >= gameState.pendingKnightAttack.defenseDeadline;

    if (!isDefender && !isExpired) {
      return { isValid: false, error: 'Only the defender can allow the attack before timeout' };
    }

    return { isValid: true };
  }
  
  /**
   * Validate allow potion attack move
   */
  private validateAllowPotionAttack(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!gameState.pendingPotionAttack) {
      return { isValid: false, error: 'No pending potion attack' };
    }

    // Allow the target to explicitly allow the attack
    // OR allow any player to complete the attack if the defense time has expired
    const now = Date.now();
    const isDefender = move.playerId === gameState.pendingPotionAttack.target;
    const isExpired = now >= gameState.pendingPotionAttack.defenseDeadline;

    if (!isDefender && !isExpired) {
      return { isValid: false, error: 'Only the defender can allow the attack before timeout' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const ruleEngine = RuleEngine.getInstance();