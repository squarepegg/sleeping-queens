import { GameMove, GameState, MoveValidationResult, Player, Card } from '../types';
import { scoreCalculator } from '../engine/ScoreCalculator';
import { turnManager } from '../engine/TurnManager';
import { GAME_CONFIG } from '../cards';

/**
 * Base class for all move handlers.
 * Provides common functionality like hand refilling, card management, etc.
 */
export abstract class BaseMoveHandler {
  /**
   * Execute the move. Must be implemented by each handler.
   */
  abstract executeMove(move: GameMove, gameState: GameState): MoveValidationResult;

  /**
   * Refill a player's hand to the maximum allowed cards
   */
  protected refillHand(player: Player, gameState: GameState): void {
    while (player.hand.length < GAME_CONFIG.maxHandSize && gameState.deck.length > 0) {
      const card = this.drawCard(gameState);
      if (card) {
        player.hand.push(card);
      }
    }
  }

  /**
   * Draw a card from the deck
   */
  protected drawCard(gameState: GameState): Card | null {
    if (gameState.deck.length === 0) {
      return null;
    }
    
    // Remove random card from deck
    const randomIndex = Math.floor(Math.random() * gameState.deck.length);
    const card = gameState.deck.splice(randomIndex, 1)[0];
    return card;
  }

  /**
   * Remove specific cards from a player's hand
   */
  protected removeCardsFromHand(cards: Card[], player: Player): boolean {
    for (const card of cards) {
      const cardIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      if (cardIndex === -1) {
        return false; // Card not found in hand
      }
      player.hand.splice(cardIndex, 1);
    }
    return true;
  }

  /**
   * Add cards to the discard pile
   */
  protected discardCards(cards: Card[], gameState: GameState): void {
    for (const card of cards) {
      gameState.discardPile.push(card);
    }
  }

  /**
   * Set game message and staged cards for transparency
   */
  protected setGameMessage(message: string, stagedCards: Card[], gameState: GameState): void {
    gameState.gameMessage = message;
    gameState.stagedCards = stagedCards;
  }

  /**
   * Complete the move by advancing turn and checking for game end
   */
  protected completeMoveWithTurnAdvance(gameState: GameState): void {
    turnManager.advanceTurn(gameState);
    scoreCalculator.checkAndUpdateGameEnd(gameState);
    
    // Clear staged cards after successful move
    gameState.stagedCard = undefined;
    gameState.stagedCards = [];
  }

  /**
   * Advance turn to next player
   */
  protected advanceTurn(gameState: GameState): void {
    turnManager.advanceTurn(gameState);
  }

  /**
   * Check if game should end
   */
  protected checkGameEnd(gameState: GameState): void {
    scoreCalculator.checkAndUpdateGameEnd(gameState);
  }

  /**
   * Get player by ID with null check
   */
  protected getPlayer(gameState: GameState, playerId: string): Player | null {
    return gameState.players.find(p => p.id === playerId) || null;
  }

  /**
   * Validate that player has specific cards in their hand
   */
  protected validatePlayerHasCards(cards: Card[], player: Player): boolean {
    for (const card of cards) {
      const hasCard = player.hand.some(handCard => handCard.id === card.id);
      if (!hasCard) {
        return false;
      }
    }
    return true;
  }

  /**
   * Update player score after queen changes
   */
  protected updatePlayerScore(player: Player): void {
    player.score = scoreCalculator.calculatePlayerScore(player);
  }

  /**
   * Extract card from move (supports both cards array and cardId formats)
   * Follows DRY principle - single source for card extraction logic
   */
  protected extractCardFromMove(move: GameMove, player: Player): Card | undefined {
    if (move.cards && move.cards.length > 0) {
      return move.cards[0];
    } else if (move.cardId) {
      return player.hand.find(c => c.id === move.cardId);
    }
    return undefined;
  }

  /**
   * Extract target queen from move (supports multiple format variations)
   * Centralizes queen extraction logic to avoid duplication
   */
  protected extractTargetQueen(
    move: GameMove,
    gameState: GameState,
    targetPlayer?: Player
  ): Queen | undefined {
    // Direct target card
    if (move.targetCard) {
      return move.targetCard as Queen;
    }

    // Target queen ID variations
    const queenId = move.targetQueenId || move.targetQueen;
    if (queenId) {
      // Look in sleeping queens first
      const sleepingQueen = gameState.sleepingQueens.find(q => q.id === queenId);
      if (sleepingQueen) return sleepingQueen;

      // Then check target player's queens if provided
      if (targetPlayer) {
        return targetPlayer.queens.find(q => q.id === queenId);
      }
    }

    return undefined;
  }

  /**
   * Extract target player from move (supports multiple format variations)
   * Single source of truth for player extraction
   */
  protected extractTargetPlayer(move: GameMove, gameState: GameState): Player | undefined {
    const targetPlayerId = move.targetPlayer || move.targetPlayerId;
    if (targetPlayerId) {
      return this.getPlayer(gameState, targetPlayerId);
    }
    return undefined;
  }

  /**
   * Check and resolve Cat/Dog Queen conflict
   * Returns true if a queen was returned to center
   */
  protected checkCatDogConflict(player: Player, gameState: GameState): boolean {
    const hasCatQueen = player.queens.some(q => q.name === 'Cat Queen');
    const hasDogQueen = player.queens.some(q => q.name === 'Dog Queen');

    if (hasCatQueen && hasDogQueen) {
      // Find the most recently added queen (last in array)
      const lastQueen = player.queens[player.queens.length - 1];

      // Return the newest queen to sleeping queens
      if (lastQueen.name === 'Cat Queen' || lastQueen.name === 'Dog Queen') {
        const queenIndex = player.queens.findIndex(q => q.id === lastQueen.id);
        if (queenIndex !== -1) {
          const queen = player.queens.splice(queenIndex, 1)[0];
          queen.isAwake = false;
          gameState.sleepingQueens.push(queen);

          this.setGameMessage(
            `Cat and Dog Queens can't be together! ${lastQueen.name} returned to sleep.`,
            [],
            gameState
          );

          // Update score after queen removal
          this.updatePlayerScore(player);
          return true;
        }
      }
    }

    return false;
  }
}