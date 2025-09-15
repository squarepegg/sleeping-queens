import { Card, Queen, NumberCard, ActionCard } from './types';

export const QUEENS: Queen[] = [
  {
    id: 'queen-cat',
    type: 'queen',
    name: 'Cat Queen',
    points: 15,
    description: 'The feline ruler of dreams',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-dog',
    type: 'queen',
    name: 'Dog Queen',
    points: 15,
    description: 'The loyal guardian of slumber',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-cake',
    type: 'queen',
    name: 'Cake Queen',
    points: 15,
    description: 'Sweet dreams are made of cake',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-pancake',
    type: 'queen',
    name: 'Pancake Queen',
    points: 10,
    description: 'Breakfast royalty',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-ladybug',
    type: 'queen',
    name: 'Ladybug Queen',
    points: 10,
    description: 'Tiny but mighty',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-strawberry',
    type: 'queen',
    name: 'Strawberry Queen',
    points: 5,
    description: 'Berry sweet dreams',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-rainbow',
    type: 'queen',
    name: 'Rainbow Queen',
    points: 5,
    description: 'Colors of the dream world',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-heart',
    type: 'queen',
    name: 'Heart Queen',
    points: 10,
    description: 'Love conquers all dreams',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-star',
    type: 'queen',
    name: 'Star Queen',
    points: 20,
    description: 'Celestial majesty',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-moon',
    type: 'queen',
    name: 'Moon Queen',
    points: 15,
    description: 'Lunar light in darkness',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-sun',
    type: 'queen',
    name: 'Sun Queen',
    points: 20,
    description: 'Solar radiance',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
  {
    id: 'queen-rose',
    type: 'queen',
    name: 'Rose Queen',
    points: 5,
    description: 'Thorns protect beauty',
    isAwake: false,
    imageUrl: '/images/sleeping-queen.png',
  },
];

export const ACTION_CARDS: ActionCard[] = [
  // Kings (8 total) - Named like in real Sleeping Queens
  {
    id: 'king-1',
    type: 'king' as const,
    name: 'Bubble Gum King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-2',
    type: 'king' as const,
    name: 'Chess King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-3',
    type: 'king' as const,
    name: 'Cookie King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-4',
    type: 'king' as const,
    name: 'Fire King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-5',
    type: 'king' as const,
    name: 'Hat King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-6',
    type: 'king' as const,
    name: 'Puzzle King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-7',
    type: 'king' as const,
    name: 'Tie-Dye King',
    description: 'Wake up a sleeping queen',
  },
  {
    id: 'king-8',
    type: 'king' as const,
    name: 'Turtle King',
    description: 'Wake up a sleeping queen',
  },
  
  // Knights (4 total)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `knight-${i + 1}`,
    type: 'knight' as const,
    name: 'Knight',
    description: 'Steal an opponent\'s queen (can be blocked by Dragon)',
  })),
  
  // Dragons (3 total)
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `dragon-${i + 1}`,
    type: 'dragon' as const,
    name: 'Dragon',
    description: 'Block a knight attack',
  })),
  
  // Magic Wands (3 total)
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `wand-${i + 1}`,
    type: 'wand' as const,
    name: 'Magic Wand',
    description: 'Put a queen back to sleep',
  })),
  
  // Potions (4 total)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `potion-${i + 1}`,
    type: 'potion' as const,
    name: 'Sleeping Potion',
    description: 'Put a queen back to sleep',
  })),
  
  // Jesters (5 total)
  ...Array.from({ length: 5 }, (_, i) => ({
    id: `jester-${i + 1}`,
    type: 'jester' as const,
    name: 'Jester',
    description: 'Discard and draw up to 5 cards',
  })),
];

export const NUMBER_CARDS: NumberCard[] = [
  // Numbers 1-10, with different quantities
  // 1s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-1-${i + 1}`,
    type: 'number' as const,
    value: 1,
    name: '1',
  })),
  
  // 2s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-2-${i + 1}`,
    type: 'number' as const,
    value: 2,
    name: '2',
  })),
  
  // 3s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-3-${i + 1}`,
    type: 'number' as const,
    value: 3,
    name: '3',
  })),
  
  // 4s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-4-${i + 1}`,
    type: 'number' as const,
    value: 4,
    name: '4',
  })),
  
  // 5s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-5-${i + 1}`,
    type: 'number' as const,
    value: 5,
    name: '5',
  })),
  
  // 6s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-6-${i + 1}`,
    type: 'number' as const,
    value: 6,
    name: '6',
  })),
  
  // 7s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-7-${i + 1}`,
    type: 'number' as const,
    value: 7,
    name: '7',
  })),
  
  // 8s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-8-${i + 1}`,
    type: 'number' as const,
    value: 8,
    name: '8',
  })),
  
  // 9s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-9-${i + 1}`,
    type: 'number' as const,
    value: 9,
    name: '9',
  })),
  
  // 10s (4 cards)
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `number-10-${i + 1}`,
    type: 'number' as const,
    value: 10,
    name: '10',
  })),
];

export const ALL_CARDS: Card[] = [
  ...QUEENS,
  ...ACTION_CARDS,
  ...NUMBER_CARDS,
];

export const GAME_CONFIG = {
  minPlayers: 2,
  maxPlayers: 5,
  queensToWin: {
    2: 5,
    3: 5,  // Fixed: 2-3 players need 5 queens
    4: 4,
    5: 4,
  } as Record<number, number>,
  pointsToWin: {
    2: 50,
    3: 50,  // Fixed: 2-3 players need 50 points
    4: 40,
    5: 40,
  } as Record<number, number>,
  initialHandSize: 5,
  maxHandSize: 5,
};

export function createDeck(): Card[] {
  return [...ACTION_CARDS, ...NUMBER_CARDS].map(card => ({ ...card }));
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function createSleepingQueens(): Queen[] {
  return QUEENS.map(queen => ({ 
    ...queen, 
    isAwake: false 
  }));
}

export function getCardDisplayName(card: Card): string {
  switch (card.type) {
    case 'queen':
      return card.name || 'Queen';
    case 'number':
      return card.value?.toString() || '?';
    default:
      return card.name || card.type;
  }
}

export function getCardPoints(card: Card): number {
  if (card.type === 'queen') {
    return card.points || 0;
  }
  return 0;
}

export function isValidMathEquation(cards: NumberCard[]): boolean {
  if (cards.length < 3) return false; // Need at least 3 cards for an equation

  const values = cards.map(c => c.value || 0);

  // Check for valid addition equations ONLY (per official rules)
  // Try all possible combinations where some cards add up to another card
  for (let targetIdx = 0; targetIdx < values.length; targetIdx++) {
    const target = values[targetIdx];
    const others = values.filter((_, idx) => idx !== targetIdx);

    // Check if any subset of others sums to target
    // For 2 cards: a + b = target
    if (others.length >= 2) {
      for (let i = 0; i < others.length - 1; i++) {
        for (let j = i + 1; j < others.length; j++) {
          if (others[i] + others[j] === target) {
            return true; // Found valid equation like 2 + 3 = 5
          }
        }
      }
    }

    // For 3+ cards: a + b + c = target
    if (others.length >= 3) {
      for (let i = 0; i < others.length - 2; i++) {
        for (let j = i + 1; j < others.length - 1; j++) {
          for (let k = j + 1; k < others.length; k++) {
            if (others[i] + others[j] + others[k] === target) {
              return true; // Found valid equation like 2 + 3 + 4 = 9
            }
          }
        }
      }
    }

    // For all cards summing to target (when there are 4+ cards)
    if (others.length >= 4) {
      const sum = others.reduce((a, b) => a + b, 0);
      if (sum === target) {
        return true;
      }
    }
  }

  return false;
}