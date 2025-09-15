// Pure domain model for GameMove
import {Card, NumberCard} from './Card';

export type MoveType =
  | 'play_king'
  | 'play_knight'
  | 'play_dragon'
  | 'play_wand'
  | 'play_potion'
  | 'play_jester'
  | 'play_math'
  | 'play_equation'
  | 'discard'
  | 'stage_card'
  | 'allow_knight_attack'
  | 'allow_potion_attack'
  | 'rose_queen_bonus';

export interface MathEquation {
  readonly cards: ReadonlyArray<NumberCard>;
  readonly equation: string;
  readonly result: number;
  readonly left?: number;
  readonly operator?: string;
  readonly right?: number;
}

export interface GameMove {
  readonly type: MoveType;
  readonly playerId: string;
  readonly timestamp: number;

  // Card references (modern format) - made required for backward compatibility
  readonly cards: ReadonlyArray<Card>;
  readonly targetCard?: Card;
  readonly targetPlayer?: string;

  // Legacy/alternative property names for backwards compatibility
  readonly cardId?: string;
  readonly cardIds?: ReadonlyArray<string>;
  readonly targetQueen?: string;
  readonly targetQueenId?: string;
  readonly targetPlayerId?: string;

  // Math equation specific
  readonly mathEquation?: MathEquation;
}

export interface MoveValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly message?: string;
  readonly requiresResponse?: boolean;
}