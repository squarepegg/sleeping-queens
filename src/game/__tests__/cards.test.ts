import {
  QUEENS,
  ACTION_CARDS,
  NUMBER_CARDS,
  ALL_CARDS,
  GAME_CONFIG,
  createDeck,
  shuffleDeck,
  createSleepingQueens,
  getCardDisplayName,
  getCardPoints,
  isValidMathEquation
} from '../cards';
import { Queen, NumberCard } from '../types';

describe('Sleeping Queens Card System', () => {
  describe('Card Collections', () => {
    test('should have exactly 12 queens', () => {
      expect(QUEENS).toHaveLength(12);
      QUEENS.forEach(queen => {
        expect(queen.type).toBe('queen');
        expect(queen.name).toBeDefined();
        expect(queen.points).toBeGreaterThan(0);
        expect(queen.isAwake).toBe(false);
      });
    });

    test('should have correct number of action cards', () => {
      const kings = ACTION_CARDS.filter(card => card.type === 'king');
      const knights = ACTION_CARDS.filter(card => card.type === 'knight');
      const dragons = ACTION_CARDS.filter(card => card.type === 'dragon');
      const wands = ACTION_CARDS.filter(card => card.type === 'wand');
      const potions = ACTION_CARDS.filter(card => card.type === 'potion');

      expect(kings).toHaveLength(8);
      expect(knights).toHaveLength(4);
      expect(dragons).toHaveLength(3);
      expect(wands).toHaveLength(3);
      expect(potions).toHaveLength(4);
    });

    test('should have correct number of number cards', () => {
      expect(NUMBER_CARDS).toHaveLength(40); // 4 cards for each number 1-10
      
      for (let i = 1; i <= 10; i++) {
        const cardsOfValue = NUMBER_CARDS.filter(card => card.value === i);
        expect(cardsOfValue).toHaveLength(4);
      }
    });

    test('should have unique card IDs', () => {
      const allIds = ALL_CARDS.map(card => card.id);
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });
  });

  describe('Queen Points Distribution', () => {
    test('should have correct queen point values', () => {
      const pointCounts: { [key: number]: number } = {};
      
      QUEENS.forEach(queen => {
        pointCounts[queen.points] = (pointCounts[queen.points] || 0) + 1;
      });

      // Verify we have a good distribution of point values
      expect(Object.keys(pointCounts).length).toBeGreaterThan(2);
      expect(Math.max(...QUEENS.map(q => q.points))).toBeGreaterThanOrEqual(15);
      expect(Math.min(...QUEENS.map(q => q.points))).toBeGreaterThanOrEqual(5);
    });

    test('should have high-value and low-value queens', () => {
      const highValueQueens = QUEENS.filter(q => q.points >= 15);
      const lowValueQueens = QUEENS.filter(q => q.points <= 10);
      
      expect(highValueQueens.length).toBeGreaterThan(0);
      expect(lowValueQueens.length).toBeGreaterThan(0);
    });
  });

  describe('Game Configuration', () => {
    test('should have correct game configuration', () => {
      expect(GAME_CONFIG.minPlayers).toBe(2);
      expect(GAME_CONFIG.maxPlayers).toBe(5);
      expect(GAME_CONFIG.initialHandSize).toBe(5);
      expect(GAME_CONFIG.maxHandSize).toBe(5);

      // Win conditions should be properly configured (per official rules)
      expect(GAME_CONFIG.queensToWin[2]).toBe(5);
      expect(GAME_CONFIG.queensToWin[3]).toBe(5); // Fixed: 2-3 players need 5 queens
      expect(GAME_CONFIG.queensToWin[4]).toBe(4);
      expect(GAME_CONFIG.queensToWin[5]).toBe(4);

      expect(GAME_CONFIG.pointsToWin[2]).toBe(50);
      expect(GAME_CONFIG.pointsToWin[3]).toBe(50); // Fixed: 2-3 players need 50 points
      expect(GAME_CONFIG.pointsToWin[4]).toBe(40);
      expect(GAME_CONFIG.pointsToWin[5]).toBe(40);
    });
  });

  describe('Deck Creation and Shuffling', () => {
    test('should create a deck without queens', () => {
      const deck = createDeck();
      
      expect(deck.every(card => card.type !== 'queen')).toBe(true);
      expect(deck.length).toBe(ACTION_CARDS.length + NUMBER_CARDS.length);
    });

    test('should shuffle deck randomly', () => {
      const originalDeck = createDeck();
      const shuffledDeck1 = shuffleDeck([...originalDeck]);
      const shuffledDeck2 = shuffleDeck([...originalDeck]);

      // Decks should have same length and cards
      expect(shuffledDeck1).toHaveLength(originalDeck.length);
      expect(shuffledDeck2).toHaveLength(originalDeck.length);

      // Should be different order (very unlikely to be same)
      const sameOrder1 = shuffledDeck1.every((card, index) => card.id === originalDeck[index].id);
      const sameOrder2 = shuffledDeck2.every((card, index) => card.id === originalDeck[index].id);
      
      expect(sameOrder1 || sameOrder2).toBe(false);
    });

    test('should create sleeping queens', () => {
      const sleepingQueens = createSleepingQueens();
      
      expect(sleepingQueens).toHaveLength(12);
      expect(sleepingQueens.every(queen => !queen.isAwake)).toBe(true);
      expect(sleepingQueens.every(queen => queen.type === 'queen')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('should get correct card display names', () => {
      const queen: Queen = {
        id: 'test-queen',
        type: 'queen' as const,
        name: 'Test Queen',
        points: 10,
        isAwake: false
      };

      const numberCard: NumberCard = {
        id: 'test-number',
        type: 'number' as const,
        value: 7
      };

      const kingCard = {
        id: 'test-king',
        type: 'king' as const,
        name: 'King'
      };

      expect(getCardDisplayName(queen)).toBe('Test Queen');
      expect(getCardDisplayName(numberCard)).toBe('7');
      expect(getCardDisplayName(kingCard)).toBe('King');
    });

    test('should get correct card points', () => {
      const queen: Queen = {
        id: 'test-queen',
        type: 'queen' as const,
        name: 'Test Queen',
        points: 15,
        isAwake: false
      };

      const kingCard = {
        id: 'test-king',
        type: 'king' as const,
        name: 'King'
      };

      expect(getCardPoints(queen)).toBe(15);
      expect(getCardPoints(kingCard)).toBe(0);
    });
  });

  describe('Math Equation Validation', () => {
    const createNumberCard = (value: number, id?: string): NumberCard => ({
      id: id || `test-${value}`,
      type: 'number' as const,
      value,
      name: value.toString()
    });

    test('should validate addition equations', () => {
      const cards = [
        createNumberCard(2, 'card1'),
        createNumberCard(3, 'card2'),
        createNumberCard(5, 'card3')
      ];

      expect(isValidMathEquation(cards)).toBe(true);
    });

    test('should validate subtraction equations', () => {
      const cards = [
        createNumberCard(8, 'card1'),
        createNumberCard(3, 'card2'),
        createNumberCard(5, 'card3')
      ];

      expect(isValidMathEquation(cards)).toBe(true);
    });

    test('should reject multiplication equations (only addition allowed per rules)', () => {
      const cards = [
        createNumberCard(2, 'card1'),
        createNumberCard(3, 'card2'),
        createNumberCard(6, 'card3')
      ];

      // Multiplication is NOT allowed per official rules - only addition
      expect(isValidMathEquation(cards)).toBe(false);
    });

    test('should reject invalid equations', () => {
      const cards = [
        createNumberCard(2, 'card1'),
        createNumberCard(3, 'card2'),
        createNumberCard(7, 'card3')
      ];

      expect(isValidMathEquation(cards)).toBe(false);
    });

    test('should require at least 2 cards', () => {
      const cards = [createNumberCard(2, 'card1')];
      expect(isValidMathEquation(cards)).toBe(false);
    });

    test('should handle complex valid equations', () => {
      // Test 4-card equation: 1 + 2 = 3, also has 4
      const cards = [
        createNumberCard(1, 'card1'),
        createNumberCard(2, 'card2'),
        createNumberCard(3, 'card3'),
        createNumberCard(4, 'card4')
      ];

      expect(isValidMathEquation(cards)).toBe(true);
    });
  });
});