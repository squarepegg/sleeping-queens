// Pure domain model for GameState
import {Player} from './Player';
import {Card, Queen} from './Card';

export type GamePhase = 'waiting' | 'playing' | 'ended';

export interface PendingAttack {
  readonly attacker: string;
  readonly target?: string;
  readonly targetQueen: Queen | any;
  readonly timestamp: number;
  readonly defenseDeadline: number;
}

export interface PotionQueenSelection {
  readonly playerId: string;
  readonly timestamp: number;
}

export interface RoseQueenBonus {
  readonly playerId: string;
  readonly pending: boolean;
  readonly timestamp: number;
}

export interface JesterReveal {
  readonly revealedCard: Card;
  readonly targetPlayerId: string;
  readonly originalPlayerId: string; // Who played the jester
  readonly waitingForQueenSelection: boolean;
  readonly powerCardRevealed?: boolean; // For message generation when power card revealed
}

export interface StagedCard {
  readonly cards: ReadonlyArray<Card>;
  readonly playerId: string;
  readonly action: string;
}

export interface GameState {
  readonly id: string;
  readonly players: ReadonlyArray<Player>;
  readonly currentPlayerIndex: number;
  readonly currentPlayerId: string | null;
  readonly sleepingQueens: ReadonlyArray<Queen>;
  readonly deck: ReadonlyArray<Card>;
  readonly discardPile: ReadonlyArray<Card>;
  readonly phase: GamePhase;
  readonly winner: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly roomCode: string;
  readonly maxPlayers: number;
  readonly version: number;

  // Optional state
  readonly lastMoveId?: string;
  readonly lastMoveBy?: string;
  readonly stagedCard?: StagedCard;
  readonly stagedCards?: Record<string, ReadonlyArray<Card>>;
  readonly jesterReveal?: JesterReveal;
  readonly pendingKnightAttack?: PendingAttack;
  readonly pendingPotionAttack?: PendingAttack;
  readonly potionQueenSelection?: PotionQueenSelection;
  readonly roseQueenBonus?: RoseQueenBonus;
  readonly gameMessage?: string;
}

// Domain logic for GameState
export class GameStateDomain {
  static getCurrentPlayer(state: GameState): Player | null {
    if (state.currentPlayerIndex < 0 || state.currentPlayerIndex >= state.players.length) {
      return null;
    }
    return state.players[state.currentPlayerIndex];
  }

  static isGameOver(state: GameState): boolean {
    return state.phase === 'ended';
  }

  static canStartGame(state: GameState): boolean {
    return state.phase === 'waiting' && state.players.length >= 2;
  }

  static getPlayerById(state: GameState, playerId: string): Player | undefined {
    return state.players.find(p => p.id === playerId);
  }
}