// Infrastructure implementation of GameRepository
import {GameRepository, GameSummary} from '../../application/ports/GameRepository';
import {GameState} from '../../domain/models/GameState';

export class InMemoryGameRepository implements GameRepository {
  private games = new Map<string, GameState>();

  async save(state: GameState): Promise<void> {
    this.games.set(state.id, { ...state, updatedAt: Date.now() });
  }

  async load(id: string): Promise<GameState | null> {
    const state = this.games.get(id);
    return state ? { ...state } : null;
  }

  async delete(id: string): Promise<void> {
    this.games.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    return this.games.has(id);
  }

  async list(): Promise<ReadonlyArray<GameSummary>> {
    const summaries: GameSummary[] = [];

    for (const [id, state] of this.games) {
      const currentPlayer = state.players[state.currentPlayerIndex];
      summaries.push({
        id,
        playerCount: state.players.length,
        currentPlayer: currentPlayer?.name || 'Unknown',
        createdAt: new Date(state.createdAt),
        updatedAt: new Date(state.updatedAt)
      });
    }

    return summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // Additional methods for testing/debugging
  clear(): void {
    this.games.clear();
  }

  count(): number {
    return this.games.size;
  }
}