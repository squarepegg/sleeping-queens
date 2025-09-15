import { GameMove, GameState, MoveValidationResult, NumberCard, Player, Card } from '../types';
import { BaseMoveHandler } from './BaseMoveHandler';

/**
 * Handler for math equation moves - playing number cards in valid equations to draw new cards.
 */
export class MathMoveHandler extends BaseMoveHandler {
  private static instance: MathMoveHandler;

  public static getInstance(): MathMoveHandler {
    if (!MathMoveHandler.instance) {
      MathMoveHandler.instance = new MathMoveHandler();
    }
    return MathMoveHandler.instance;
  }

  executeMove(move: GameMove, gameState: GameState): MoveValidationResult {
    // Trust that RuleEngine has already validated the move
    const player = this.getPlayer(gameState, move.playerId)!;

    // Support both formats: mathEquation.cards or direct cards array
    const mathCards = move.mathEquation?.cards || move.cards || [];

    if (mathCards.length < 3) {
      return { isValid: false, error: 'Math equation requires at least 3 cards' };
    }

    // Execute the math move
    return this.executeMathEquation(move, player, gameState, mathCards);
  }

  private executeMathEquation(
    move: GameMove,
    player: Player,
    gameState: GameState,
    mathCards: Card[]
  ): MoveValidationResult {
    // Create descriptive message showing the equation
    const cardNames = mathCards.map(c => c.name || c.value).join(' + ');
    this.setGameMessage(
      `${player.name} played equation: ${cardNames} and drew ${mathCards.length} cards`,
      mathCards,
      gameState
    );

    // Remove cards from hand and add to discard pile
    if (!this.removeCardsFromHand(mathCards, player)) {
      return { isValid: false, error: 'Failed to remove equation cards from hand' };
    }
    this.discardCards(mathCards, gameState);

    // Draw replacement cards (same number as discarded)
    const cardsToReplace = mathCards.length;
    for (let i = 0; i < cardsToReplace; i++) {
      const newCard = this.drawCard(gameState);
      if (newCard) {
        player.hand.push(newCard);
      }
    }

    // Advance turn and check for game end
    this.completeMoveWithTurnAdvance(gameState);

    return { isValid: true };
  }

  /**
   * Validate that a set of number cards forms a valid addition equation
   */
  static validateEquation(cards: NumberCard[]): boolean {
    if (cards.length < 3) return false;

    const numbers = cards.map(card => card.value).sort((a, b) => a - b);

    // Check if any two numbers add up to a third number
    for (let i = 0; i < numbers.length - 2; i++) {
      for (let j = i + 1; j < numbers.length - 1; j++) {
        const sum = numbers[i] + numbers[j];
        // Look for the sum in the remaining numbers
        for (let k = j + 1; k < numbers.length; k++) {
          if (numbers[k] === sum) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

// Export singleton instance
export const mathMoveHandler = MathMoveHandler.getInstance();