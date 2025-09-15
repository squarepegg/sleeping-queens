// Application port for game persistence
import {GameState} from '@/domain/models/GameState';

export interface GameRepository {
  save(state: GameState): Promise<void>;
  load(id: string): Promise<GameState | null>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
  list(): Promise<ReadonlyArray<GameSummary>>;
}

export interface GameSummary {
  readonly id: string;
  readonly playerCount: number;
  readonly currentPlayer: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}