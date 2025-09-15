// Pure domain model for Card
export type CardType = 'queen' | 'king' | 'knight' | 'dragon' | 'wand' | 'potion' | 'jester' | 'number';

export interface Card {
  readonly id: string;
  readonly type: CardType;
  readonly name?: string;
  readonly description?: string;
}

export interface NumberCard extends Card {
  readonly type: 'number';
  readonly value: number;
}

export interface ActionCard extends Card {
  readonly type: 'king' | 'knight' | 'dragon' | 'wand' | 'potion' | 'jester';
  readonly description: string;
}

export interface Queen extends Card {
  readonly type: 'queen';
  readonly points: number;
  readonly name: string;
  readonly isAwake: boolean;
}

// Type guards
export function isNumberCard(card: Card): card is NumberCard {
  return card.type === 'number';
}

export function isActionCard(card: Card): card is ActionCard {
  return ['king', 'knight', 'dragon', 'wand', 'potion', 'jester'].includes(card.type);
}

export function isQueen(card: Card): card is Queen {
  return card.type === 'queen';
}