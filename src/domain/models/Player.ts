// Pure domain model for Player
import {Card, Queen} from './Card';

export interface Player {
  readonly id: string;
  readonly name: string;
  readonly position: number;
  readonly hand: ReadonlyArray<Card>;
  readonly queens: ReadonlyArray<Queen>;
  readonly score: number;
  readonly isConnected: boolean;
}

// Domain logic for Player
export class PlayerDomain {
  static calculateScore(queens: ReadonlyArray<Queen>): number {
    return queens.reduce((total, queen) => total + queen.points, 0);
  }

  static hasCard(player: Player, cardId: string): boolean {
    return player.hand.some(card => card.id === cardId);
  }

  static hasQueen(player: Player, queenId: string): boolean {
    return player.queens.some(queen => queen.id === queenId);
  }

  static canPlayCard(player: Player): boolean {
    return player.hand.length > 0;
  }
}