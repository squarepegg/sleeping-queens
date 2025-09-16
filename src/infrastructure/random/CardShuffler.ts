// Infrastructure service for shuffling cards
import {Card} from '@/domain/models/Card';

export class CardShuffler {
  static shuffle<T extends Card>(cards: ReadonlyArray<T>): ReadonlyArray<T> {
    const shuffled = [...cards];

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }

  static drawCard<T extends Card>(deck: ReadonlyArray<T>): {
    card: T | null;
    remainingDeck: ReadonlyArray<T>;
  } {
    if (deck.length === 0) {
      return { card: null, remainingDeck: deck };
    }

    const card = deck[deck.length - 1];
    const remainingDeck = deck.slice(0, -1);

    return { card, remainingDeck };
  }

  static drawCards<T extends Card>(deck: ReadonlyArray<T>, count: number): {
    cards: ReadonlyArray<T>;
    remainingDeck: ReadonlyArray<T>;
  } {
    if (count <= 0) {
      return { cards: [], remainingDeck: deck };
    }

    const actualCount = Math.min(count, deck.length);
    const cards = deck.slice(-actualCount);
    const remainingDeck = deck.slice(0, -actualCount);

    return { cards, remainingDeck };
  }

  // Seeded random for testing
  static shuffleWithSeed<T extends Card>(cards: ReadonlyArray<T>, seed: number): ReadonlyArray<T> {
    const shuffled = [...cards];

    // Simple seeded random number generator (Linear Congruential Generator)
    let rng = seed;
    const random = () => {
      rng = (rng * 1664525 + 1013904223) % 4294967296;
      return rng / 4294967296;
    };

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }
}