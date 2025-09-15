import { Card, GameState } from '../types';
import { createDeck, shuffleDeck } from '../cards';

/**
 * CardManager - Manages deck, drawing, discarding, and shuffling
 * Follows Single Responsibility Principle - only manages card operations
 */
export class CardManager {
  private deck: Card[] = [];
  private discardPile: Card[] = [];

  constructor(initialState?: Partial<GameState>) {
    if (initialState?.deck && initialState?.discardPile) {
      this.deck = [...initialState.deck];
      this.discardPile = [...initialState.discardPile];
    } else {
      this.initializeDeck();
      this.discardPile = [];
    }
  }

  /**
   * Initialize and shuffle the deck
   */
  private initializeDeck(): void {
    this.deck = shuffleDeck(createDeck());
  }

  /**
   * Draw cards from the deck
   */
  public drawCards(count: number): Card[] {
    const drawn: Card[] = [];
    
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        this.reshuffleDiscardPile();
      }
      
      if (this.deck.length > 0) {
        const card = this.deck.pop();
        if (card) {
          drawn.push(card);
        }
      }
    }
    
    return drawn;
  }

  /**
   * Draw a single card
   */
  public drawCard(): Card | null {
    const cards = this.drawCards(1);
    return cards.length > 0 ? cards[0] : null;
  }

  /**
   * Add cards to the discard pile
   */
  public discardCards(cards: Card[]): void {
    this.discardPile.push(...cards);
  }

  /**
   * Reshuffle discard pile back into deck when deck is empty
   */
  private reshuffleDiscardPile(): void {
    if (this.discardPile.length === 0) {
      return;
    }
    
    // Move all cards from discard to deck
    this.deck = shuffleDeck([...this.discardPile]);
    this.discardPile = [];
  }

  /**
   * Get current deck size
   */
  public getDeckSize(): number {
    return this.deck.length;
  }

  /**
   * Get current discard pile size
   */
  public getDiscardPileSize(): number {
    return this.discardPile.length;
  }

  /**
   * Get top card of discard pile without removing it
   */
  public peekDiscardPile(): Card | null {
    if (this.discardPile.length === 0) {
      return null;
    }
    return this.discardPile[this.discardPile.length - 1];
  }

  /**
   * Get the current deck (for game state)
   */
  public getDeck(): Card[] {
    return [...this.deck];
  }

  /**
   * Get the current discard pile (for game state)
   */
  public getDiscardPile(): Card[] {
    return [...this.discardPile];
  }

  /**
   * Set deck and discard pile (for loading game state)
   */
  public setState(deck: Card[], discardPile: Card[]): void {
    this.deck = [...deck];
    this.discardPile = [...discardPile];
  }

  /**
   * Check if deck needs reshuffling
   */
  public needsReshuffle(): boolean {
    return this.deck.length === 0 && this.discardPile.length > 0;
  }

  /**
   * Get total cards in circulation (deck + discard)
   */
  public getTotalCards(): number {
    return this.deck.length + this.discardPile.length;
  }
}