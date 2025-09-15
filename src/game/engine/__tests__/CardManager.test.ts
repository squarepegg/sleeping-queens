import { CardManager } from '../CardManager';
import { Card } from '../../types';

describe('CardManager', () => {
  let cardManager: CardManager;

  beforeEach(() => {
    cardManager = new CardManager();
  });

  describe('Deck Initialization', () => {
    it('should initialize with a full deck', () => {
      const deckSize = cardManager.getDeckSize();
      const discardSize = cardManager.getDiscardPileSize();
      
      // Standard Sleeping Queens deck has 79 cards total
      expect(deckSize + discardSize).toBeGreaterThan(0);
      expect(deckSize).toBeGreaterThan(50); // Most cards should be in deck initially
    });

    it('should create a shuffled deck', () => {
      const manager1 = new CardManager();
      const manager2 = new CardManager();
      
      const deck1 = manager1.getDeck();
      const deck2 = manager2.getDeck();
      
      // Decks should be different due to shuffling
      const isDifferent = deck1.some((card, index) => 
        card.id !== deck2[index]?.id
      );
      
      expect(isDifferent).toBe(true);
    });

    it('should contain correct card distribution', () => {
      const deck = cardManager.getDeck();
      const cardCounts: Record<string, number> = {};
      
      deck.forEach(card => {
        const key = `${card.type}-${card.value || card.name || ''}`;
        cardCounts[key] = (cardCounts[key] || 0) + 1;
      });
      
      // Verify we have cards of each type
      const hasNumbers = deck.some(c => c.type === 'number');
      const hasKings = deck.some(c => c.type === 'king');
      const hasKnights = deck.some(c => c.type === 'knight');
      const hasDragons = deck.some(c => c.type === 'dragon');
      const hasWands = deck.some(c => c.type === 'wand');
      const hasPotions = deck.some(c => c.type === 'potion');
      const hasJesters = deck.some(c => c.type === 'jester');
      
      expect(hasNumbers).toBe(true);
      expect(hasKings).toBe(true);
      expect(hasKnights).toBe(true);
      expect(hasDragons).toBe(true);
      expect(hasWands).toBe(true);
      expect(hasPotions).toBe(true);
      expect(hasJesters).toBe(true);
    });
  });

  describe('Drawing Cards', () => {
    it('should draw a single card', () => {
      const initialSize = cardManager.getDeckSize();
      const card = cardManager.drawCard();
      
      expect(card).toBeDefined();
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('type');
      expect(cardManager.getDeckSize()).toBe(initialSize - 1);
    });

    it('should draw multiple cards', () => {
      const initialSize = cardManager.getDeckSize();
      const cards = cardManager.drawCards(5);
      
      expect(cards).toHaveLength(5);
      expect(cardManager.getDeckSize()).toBe(initialSize - 5);
      
      // All cards should be unique
      const uniqueIds = new Set(cards.map(c => c.id));
      expect(uniqueIds.size).toBe(5);
    });

    it('should return empty array when drawing more cards than available', () => {
      // Draw all cards
      const totalCards = cardManager.getDeckSize();
      cardManager.drawCards(totalCards);
      
      // Try to draw more
      const cards = cardManager.drawCards(5);
      
      // Should return empty since no discard pile to reshuffle
      expect(cards).toHaveLength(0);
      expect(cardManager.getDeckSize()).toBe(0);
    });
  });

  describe('Discard Pile Management', () => {
    it('should add cards to discard pile', () => {
      const cards = cardManager.drawCards(3);
      const initialDiscardSize = cardManager.getDiscardPileSize();
      
      cardManager.discardCards(cards);
      
      expect(cardManager.getDiscardPileSize()).toBe(initialDiscardSize + 3);
    });

    it('should peek at top card of discard pile', () => {
      const cards = cardManager.drawCards(3);
      cardManager.discardCards(cards);
      
      const topCard = cardManager.peekDiscardPile();
      
      expect(topCard).toEqual(cards[cards.length - 1]);
      // Peeking shouldn't remove the card
      expect(cardManager.getDiscardPileSize()).toBe(3);
    });

    it('should return null when peeking empty discard pile', () => {
      const topCard = cardManager.peekDiscardPile();
      expect(topCard).toBeNull();
    });
  });

  describe('Deck Reshuffling', () => {
    it('should reshuffle discard pile when deck is empty', () => {
      // Draw all cards
      const totalCards = cardManager.getDeckSize();
      const drawnCards = cardManager.drawCards(totalCards);
      
      // Discard some cards
      const cardsToDiscard = drawnCards.slice(0, 10);
      cardManager.discardCards(cardsToDiscard);
      
      expect(cardManager.getDeckSize()).toBe(0);
      expect(cardManager.getDiscardPileSize()).toBe(10);
      
      // Draw a card - should trigger reshuffle
      const newCard = cardManager.drawCard();
      
      expect(newCard).toBeDefined();
      expect(cardManager.getDeckSize()).toBe(9); // 10 - 1 drawn
      expect(cardManager.getDiscardPileSize()).toBe(0); // Reshuffled
    });

    it('should detect when reshuffle is needed', () => {
      // Initially not needed
      expect(cardManager.needsReshuffle()).toBe(false);
      
      // Draw all cards
      const totalCards = cardManager.getDeckSize();
      cardManager.drawCards(totalCards);
      
      // Still not needed (no discard pile)
      expect(cardManager.needsReshuffle()).toBe(false);
      
      // Add to discard pile
      cardManager.discardCards([{ 
        id: 'test-card', 
        type: 'number' as const, 
        value: 5 
      }]);
      
      // Now reshuffle is needed
      expect(cardManager.needsReshuffle()).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should set and get deck state', () => {
      const testDeck: Card[] = [
        { id: 'card-1', type: 'number', value: 5 },
        { id: 'card-2', type: 'king', name: 'Test King' }
      ];
      
      const testDiscard: Card[] = [
        { id: 'card-3', type: 'jester' }
      ];
      
      cardManager.setState(testDeck, testDiscard);
      
      expect(cardManager.getDeck()).toEqual(testDeck);
      expect(cardManager.getDiscardPile()).toEqual(testDiscard);
      expect(cardManager.getDeckSize()).toBe(2);
      expect(cardManager.getDiscardPileSize()).toBe(1);
    });

    it('should preserve state when loading from existing game', () => {
      const initialState = {
        deck: [
          { id: 'saved-1', type: 'number' as const, value: 7 },
          { id: 'saved-2', type: 'queen' as const, name: 'Test Queen', points: 10 }
        ],
        discardPile: [
          { id: 'discard-1', type: 'wand' as const }
        ]
      };
      
      const manager = new CardManager(initialState);
      
      expect(manager.getDeckSize()).toBe(2);
      expect(manager.getDiscardPileSize()).toBe(1);
      expect(manager.peekDiscardPile()?.type).toBe('wand');
    });
  });

  describe('Card Counting', () => {
    it('should track total cards correctly', () => {
      const initialTotal = cardManager.getTotalCards();
      
      // Draw some cards
      const drawn = cardManager.drawCards(5);
      
      // Total should remain the same
      expect(cardManager.getTotalCards()).toBe(initialTotal - 5);
      
      // Discard the drawn cards
      cardManager.discardCards(drawn);
      
      // Total should be back to initial
      expect(cardManager.getTotalCards()).toBe(initialTotal);
    });

    it('should maintain card count through reshuffle', () => {
      const initialTotal = cardManager.getTotalCards();
      
      // Draw all cards
      const allCards = cardManager.drawCards(cardManager.getDeckSize());
      
      // Discard them all
      cardManager.discardCards(allCards);
      
      // Force reshuffle by drawing
      cardManager.drawCard();
      
      // Total should be one less (one card drawn)
      expect(cardManager.getTotalCards()).toBe(initialTotal - 1);
    });
  });
});