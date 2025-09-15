import {Card, GameMove, GameState, MoveValidationResult, NumberCard} from '../types';
import { validateMathEquation } from '../../lib/utils/mathValidator';

/**
 * Service for validating all game moves.
 * Extracted from SleepingQueensGame for better separation of concerns.
 */
export class MoveValidator {
  private static instance: MoveValidator;

  public static getInstance(): MoveValidator {
    if (!MoveValidator.instance) {
      MoveValidator.instance = new MoveValidator();
    }
    return MoveValidator.instance;
  }

  /**
   * Main validation entry point for all move types
   */
  validateMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Basic validation
    const basicValidation = this.validateBasicRules(move, gameState);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Move-specific validation
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
      case 'play_math':
        return this.validateMathMove(move, gameState);
      case 'discard':
        return this.validateDiscardMove(move, gameState);
      case 'stage_card':
        return this.validateStageMove(move, gameState);
      default:
        return { isValid: false, error: 'Unknown move type' };
    }
  }

  /**
   * Validate basic rules that apply to all moves
   */
  private validateBasicRules(move: GameMove, gameState: GameState): MoveValidationResult {
    if (gameState.phase !== 'playing') {
      return { isValid: false, error: 'Game is not in playing phase' };
    }

    const player = gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    console.log('Server turn validation:', {
      currentPlayerId: gameState.currentPlayerId,
      movePlayerId: move.playerId,
      movePlayerName: player.name,
      isPlayerTurn: gameState.currentPlayerId === move.playerId,
      jesterReveal: gameState.jesterReveal,
      isJesterQueenSelection: move.type === 'play_jester' && gameState.jesterReveal?.waitingForQueenSelection
    });

    // Special case: Jester queen selection can be done by the target player even when it's not their turn
    const isJesterQueenSelection = move.type === 'play_jester' && 
                                  gameState.jesterReveal?.waitingForQueenSelection &&
                                  gameState.jesterReveal?.targetPlayerId === move.playerId;
    
    if (!isJesterQueenSelection && gameState.currentPlayerId !== move.playerId) {
      return { isValid: false, error: 'Not your turn' };
    }

    return { isValid: true };
  }

  /**
   * Validate that player has the cards they claim to play
   */
  private validatePlayerHasCards(cards: Card[], playerHand: Card[]): MoveValidationResult {
    for (const card of cards) {
      const hasCard = playerHand.some(handCard => handCard.id === card.id);
      if (!hasCard) {
        return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
      }
    }
    return { isValid: true };
  }

  private validateKingMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.targetCard || move.targetCard.type !== 'queen') {
      return { isValid: false, error: 'Invalid target queen for king move' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    
    // Check if player has the cards
    const cardValidation = this.validatePlayerHasCards(move.cards, player.hand);
    if (!cardValidation.isValid) return cardValidation;

    // Check if they're playing exactly one king
    if (move.cards.length !== 1 || move.cards[0].type !== 'king') {
      return { isValid: false, error: 'Must play exactly one king card' };
    }

    // Check if target queen is sleeping
    const queenExists = gameState.sleepingQueens.some(q => q.id === move.targetCard!.id);
    if (!queenExists) {
      return { isValid: false, error: 'Target queen not found in sleeping queens' };
    }

    return { isValid: true };
  }

  private validateKnightMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
      return { isValid: false, error: 'Invalid target for knight move' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    const targetPlayer = gameState.players.find(p => p.id === move.targetPlayer);
    
    if (!targetPlayer) {
      return { isValid: false, error: 'Target player not found' };
    }

    // Check if player has the cards
    const cardValidation = this.validatePlayerHasCards(move.cards, player.hand);
    if (!cardValidation.isValid) return cardValidation;

    // Check if they're playing exactly one knight
    if (move.cards.length !== 1 || move.cards[0].type !== 'knight') {
      return { isValid: false, error: 'Must play exactly one knight card' };
    }

    // Check if target player has the queen
    const hasTargetQueen = targetPlayer.queens.some(q => q.id === move.targetCard!.id);
    if (!hasTargetQueen) {
      return { isValid: false, error: 'Target player does not have this queen' };
    }

    return { isValid: true };
  }

  private validateDragonMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Can only play dragon to block knight attack
    if (!gameState.pendingKnightAttack || gameState.pendingKnightAttack.target !== move.playerId) {
      return { isValid: false, error: 'No knight attack to block' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    const hasDragon = player.hand.some(card => card.type === 'dragon');
    if (!hasDragon) {
      return { isValid: false, error: 'No dragon in hand' };
    }

    return { isValid: true };
  }

  private validateWandMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
      return { isValid: false, error: 'Invalid target for wand move' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    const wandTargetPlayer = gameState.players.find(p => p.id === move.targetPlayer);
    
    if (!wandTargetPlayer) {
      return { isValid: false, error: 'Target player not found' };
    }

    const hasWand = player.hand.some(card => card.type === 'wand');
    if (!hasWand) {
      return { isValid: false, error: 'No wand in hand' };
    }

    const wandTargetHasQueen = wandTargetPlayer.queens.some(q => q.id === move.targetCard!.id);
    if (!wandTargetHasQueen) {
      return { isValid: false, error: 'Target player does not have this queen' };
    }

    return { isValid: true };
  }

  private validatePotionMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
      return { isValid: false, error: 'Invalid target for potion move' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    const potionTargetPlayer = gameState.players.find(p => p.id === move.targetPlayer);
    
    if (!potionTargetPlayer) {
      return { isValid: false, error: 'Target player not found' };
    }

    const hasPotion = player.hand.some(card => card.type === 'potion');
    if (!hasPotion) {
      return { isValid: false, error: 'No potion in hand' };
    }

    const potionTargetHasQueen = potionTargetPlayer.queens.some(q => q.id === move.targetCard!.id);
    if (!potionTargetHasQueen) {
      return { isValid: false, error: 'Target player does not have this queen' };
    }

    return { isValid: true };
  }

  private validateJesterMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // If this is a queen selection after jester reveal, don't check for jester in hand
    if (gameState.jesterReveal?.waitingForQueenSelection && move.targetCard) {
      // The target player selecting a queen doesn't need a jester in hand
      return { isValid: true };
    }
    
    // Otherwise, this is playing a new jester card - check for jester in hand
    const player = gameState.players.find(p => p.id === move.playerId)!;
    const hasJester = player.hand.some(card => card.type === 'jester');
    if (!hasJester) {
      return { isValid: false, error: 'No jester in hand' };
    }
    return { isValid: true };
  }

  private validateMathMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.mathEquation || !move.mathEquation.cards || move.mathEquation.cards.length < 3) {
      return { isValid: false, error: 'Invalid math equation' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    
    // Check if player has all the cards
    const cardValidation = this.validatePlayerHasCards(move.mathEquation.cards, player.hand);
    if (!cardValidation.isValid) return cardValidation;

    // For now, just verify it's a valid equation format (simplified)
    return { isValid: true };
  }

  private validateDiscardMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.cards || move.cards.length === 0) {
      return { isValid: false, error: 'No cards to discard' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    
    // Check if player has all the cards they claim to discard
    const cardValidation = this.validatePlayerHasCards(move.cards, player.hand);
    if (!cardValidation.isValid) return cardValidation;

    // Validate discard rules: 1 card, 2 identical numbers, or 3+ equation
    const cardCount = move.cards.length;

    if (cardCount === 1) {
      // Rule 1: Single card discard (any card type) - always allowed
      return { isValid: true };
    } else if (cardCount === 2) {
      // Rule 2: Pair of identical number cards
      const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
      if (numberCards.length !== 2) {
        return { isValid: false, error: 'Can only discard pairs of number cards' };
      }
      if (numberCards[0].value !== numberCards[1].value) {
        return { isValid: false, error: 'Pair must be identical number cards' };
      }
      return { isValid: true };
    } else if (cardCount >= 3) {
      // Rule 3: Math equation with 3+ number cards
      const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
      if (numberCards.length !== cardCount) {
        return { isValid: false, error: 'Math equations must use only number cards' };
      }

      // Validate that the numbers form a valid addition equation using mathValidator
      const numbers = numberCards.map(card => card.value);
      const equation = validateMathEquation(numbers);

      if (!equation.isValid) {
        return { isValid: false, error: 'Cards do not form a valid equation' };
      }
      return { isValid: true };
    }

    return { isValid: false, error: 'Invalid discard' };
  }

  private validateStageMove(move: GameMove, gameState: GameState): MoveValidationResult {
    if (!move.cards || move.cards.length === 0) {
      return { isValid: false, error: 'No cards to stage' };
    }

    const player = gameState.players.find(p => p.id === move.playerId)!;
    
    // Check if player has all the cards they claim to stage
    const cardValidation = this.validatePlayerHasCards(move.cards, player.hand);
    if (!cardValidation.isValid) return cardValidation;

    return { isValid: true };
  }

  /**
   * Helper method to validate addition equations
   */

  /**
   * Validate math equation structure and correctness
   */
  private validateMathEquationStructure(cards: Card[]): MoveValidationResult {
    if (cards.length < 3) {
      return { isValid: false, error: 'Math equations need at least 3 cards' };
    }

    // All cards must be number cards
    const allNumbers = cards.every(card => card.type === 'number');
    if (!allNumbers) {
      return { isValid: false, error: 'Math equations must use only number cards' };
    }

    const numbers = cards.map(card => (card as NumberCard).value).filter(v => v !== undefined);
    const equation = validateMathEquation(numbers);
    if (!equation.isValid) {
      return { isValid: false, error: 'Numbers do not form a valid equation' };
    }

    return { isValid: true };
  }
}

// Export singleton instance
export const moveValidator = MoveValidator.getInstance();