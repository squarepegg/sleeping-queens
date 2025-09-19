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
  | 'stage_cards'
  | 'clear_staged'
  | 'allow_knight_attack'
  | 'allow_potion_attack'
  | 'rose_queen_bonus'
  | 'system';

export interface MathEquation {
  readonly cards: ReadonlyArray<NumberCard>;
  readonly equation: string;
  readonly result: number;
  readonly left?: number;
  readonly operator?: string;
  readonly right?: number;
}

export interface GameMove {
  readonly moveId: string; // Unique identifier for idempotency (required)
  readonly type: MoveType;
  readonly playerId: string;
  readonly timestamp: number;

  // Card references
  readonly cards: ReadonlyArray<Card>;
  readonly targetCard?: Card;
  readonly targetPlayer?: string; // ID of the player being targeted

  // Single card ID reference (alternative to cards array for single-card moves)
  readonly cardId?: string;

  // Target queen references
  readonly targetQueenId?: string;
  readonly targetQueen?: Card;

  // Math equation specific
  readonly mathEquation?: MathEquation;

  // System message (for system moves)
  readonly message?: string;
}

export interface MoveValidationResult {
  readonly isValid: boolean;
  readonly error?: string;
  readonly message?: string;
  readonly requiresResponse?: boolean;
}