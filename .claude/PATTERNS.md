# REQUIRED DESIGN PATTERNS

Every implementation MUST use these patterns. Copy the templates exactly and adapt to your specific needs.

## 1. Command Pattern (MANDATORY for all user actions)

### Why Required
- Encapsulates all information needed for an action
- Enables validation before execution
- Supports undo/redo functionality
- Ensures consistent action handling

### Template to Copy

```typescript
// Base Command Interface
export interface Command<T = void> {
  validate(): ValidationResult;
  canExecute(): boolean;
  execute(): T;
  undo?(): void;
}

// Validation Result Structure
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

// Command Implementation Template
export class [ActionName]Command implements Command<GameState> {
  constructor(
    private readonly gameState: GameState,
    private readonly playerId: PlayerId,
    // Add other required parameters
  ) {}

  validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // Check player turn
    if (this.gameState.currentPlayerId !== this.playerId) {
      errors.push({
        code: 'NOT_PLAYER_TURN',
        message: 'It is not your turn'
      });
    }

    // Add specific validation rules
    // ...

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  canExecute(): boolean {
    return this.validate().isValid;
  }

  execute(): GameState {
    const validation = this.validate();
    if (!validation.isValid) {
      throw new CommandValidationException(validation);
    }

    // Return NEW state - never mutate
    return {
      ...this.gameState,
      // Apply changes
    };
  }
}
```

### Usage Example

```typescript
// In your application layer
export class GameCommandHandler {
  handle(command: Command<GameState>): GameState {
    // Pre-execution logging
    console.log(`Executing command: ${command.constructor.name}`);
    
    // Validation
    if (!command.canExecute()) {
      const validation = command.validate();
      throw new ValidationException(validation.errors);
    }
    
    // Execution
    const newState = command.execute();
    
    // Post-execution events
    this.eventBus.publish(new GameStateChangedEvent(newState));
    
    return newState;
  }
}
```

## 2. Repository Pattern (MANDATORY for persistence)

### Why Required
- Abstracts data storage from domain logic
- Enables testing with mock implementations
- Allows switching storage mechanisms without changing domain

### Template to Copy

```typescript
// Domain Layer - Define Interface
export interface GameRepository {
  save(game: GameState): Promise<void>;
  load(gameId: GameId): Promise<GameState | null>;
  delete(gameId: GameId): Promise<void>;
  exists(gameId: GameId): Promise<boolean>;
  list(): Promise<GameSummary[]>;
}

export interface GameSummary {
  id: GameId;
  playerCount: number;
  currentPlayer: string;
  createdAt: Date;
  updatedAt: Date;
}

// Infrastructure Layer - Implement Interface
export class LocalStorageGameRepository implements GameRepository {
  private readonly storageKey = 'sleeping-queens-games';

  async save(game: GameState): Promise<void> {
    const games = await this.loadAll();
    games[game.id] = {
      ...game,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(games));
  }

  async load(gameId: GameId): Promise<GameState | null> {
    const games = await this.loadAll();
    return games[gameId] || null;
  }

  async delete(gameId: GameId): Promise<void> {
    const games = await this.loadAll();
    delete games[gameId];
    localStorage.setItem(this.storageKey, JSON.stringify(games));
  }

  async exists(gameId: GameId): Promise<boolean> {
    const games = await this.loadAll();
    return gameId in games;
  }

  async list(): Promise<GameSummary[]> {
    const games = await this.loadAll();
    return Object.values(games).map(game => ({
      id: game.id,
      playerCount: game.players.length,
      currentPlayer: game.players[game.currentPlayerIndex].name,
      createdAt: new Date(game.createdAt),
      updatedAt: new Date(game.updatedAt)
    }));
  }

  private async loadAll(): Promise<Record<string, any>> {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : {};
  }
}

// Test Implementation
export class InMemoryGameRepository implements GameRepository {
  private games = new Map<GameId, GameState>();

  async save(game: GameState): Promise<void> {
    this.games.set(game.id, game);
  }

  async load(gameId: GameId): Promise<GameState | null> {
    return this.games.get(gameId) || null;
  }

  // ... implement other methods
}
```

## 3. Factory Pattern (MANDATORY for complex object creation)

### Why Required
- Centralizes creation logic
- Ensures valid object construction
- Simplifies testing with consistent object creation

### Template to Copy

```typescript
// Card Factory
export class CardFactory {
  static createDeck(): Card[] {
    return [
      ...this.createQueens(),
      ...this.createKings(),
      ...this.createNumbers(),
      ...this.createKnights(),
      ...this.createPotions(),
      ...this.createDefenseCards(),
      ...this.createJesters()
    ];
  }

  private static createQueens(): Queen[] {
    return [
      { id: 'q1', type: 'queen', name: 'Rose Queen', points: 5, special: 'wake_another' },
      { id: 'q2', type: 'queen', name: 'Cat Queen', points: 15, special: 'conflicts_dog' },
      { id: 'q3', type: 'queen', name: 'Dog Queen', points: 15, special: 'conflicts_cat' },
      // ... other queens
    ];
  }

  private static createKings(): King[] {
    return Array.from({ length: 8 }, (_, i) => ({
      id: `king-${i}`,
      type: 'king' as const
    }));
  }

  private static createNumbers(): NumberCard[] {
    const numbers: NumberCard[] = [];
    for (let value = 1; value <= 10; value++) {
      for (let copy = 0; copy < 4; copy++) {
        numbers.push({
          id: `number-${value}-${copy}`,
          type: 'number' as const,
          value
        });
      }
    }
    return numbers;
  }

  // ... other creation methods
}

// Game State Factory
export class GameStateFactory {
  static createInitialState(config: GameConfig): GameState {
    const deck = CardFactory.createDeck();
    const { queens, otherCards } = this.separateCards(deck);
    
    return {
      id: this.generateGameId(),
      players: this.createPlayers(config.playerNames),
      sleepingQueens: this.shuffle(queens),
      drawPile: this.shuffle(otherCards),
      discardPile: [],
      currentPlayerIndex: 0,
      phase: 'setup',
      winner: null,
      createdAt: new Date().toISOString()
    };
  }

  private static generateGameId(): string {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static createPlayers(names: string[]): Player[] {
    return names.map((name, index) => ({
      id: `player-${index}`,
      name,
      hand: [],
      awakenedQueens: [],
      score: 0
    }));
  }

  private static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ... other helper methods
}
```

## 4. Strategy Pattern (for different game rules/variations)

### Why Required
- Enables different rule variations without changing core logic
- Makes rules testable in isolation
- Supports easy addition of new rules

### Template to Copy

```typescript
// Strategy Interface
export interface WinConditionStrategy {
  checkWin(state: GameState): WinResult | null;
}

export interface WinResult {
  winner: PlayerId;
  reason: 'queens' | 'points' | 'all_awakened';
}

// Concrete Strategies
export class StandardWinCondition implements WinConditionStrategy {
  checkWin(state: GameState): WinResult | null {
    const playerCount = state.players.length;
    
    for (const player of state.players) {
      // Check queen count
      const requiredQueens = playerCount <= 3 ? 5 : 4;
      if (player.awakenedQueens.length >= requiredQueens) {
        return { winner: player.id, reason: 'queens' };
      }
      
      // Check points
      const requiredPoints = playerCount <= 3 ? 50 : 40;
      if (player.score >= requiredPoints) {
        return { winner: player.id, reason: 'points' };
      }
    }
    
    // Check all queens awakened
    if (state.sleepingQueens.length === 0) {
      const winner = state.players.reduce((max, player) => 
        player.score > max.score ? player : max
      );
      return { winner: winner.id, reason: 'all_awakened' };
    }
    
    return null;
  }
}

// Context Using Strategy
export class GameEngine {
  constructor(
    private winCondition: WinConditionStrategy = new StandardWinCondition()
  ) {}

  checkForWinner(state: GameState): GameState {
    const winResult = this.winCondition.checkWin(state);
    
    if (winResult) {
      return {
        ...state,
        phase: 'ended',
        winner: winResult.winner,
        winReason: winResult.reason
      };
    }
    
    return state;
  }
}
```

## 5. Observer Pattern (Event-Driven Architecture)

### Why Required
- Decouples components that need to react to changes
- Enables UI updates without domain knowing about UI
- Supports multiple listeners for same event

### Template to Copy

```typescript
// Event Base Class
export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  abstract readonly type: string;
}

// Specific Events
export class QueenAwakenedEvent extends DomainEvent {
  readonly type = 'QUEEN_AWAKENED';
  
  constructor(
    public readonly playerId: PlayerId,
    public readonly queenId: QueenId,
    public readonly isRoseQueenBonus: boolean = false
  ) {
    super();
  }
}

export class KnightBlockedEvent extends DomainEvent {
  readonly type = 'KNIGHT_BLOCKED';
  
  constructor(
    public readonly attackerId: PlayerId,
    public readonly defenderId: PlayerId,
    public readonly queenId: QueenId
  ) {
    super();
  }
}

// Event Bus
export class EventBus {
  private listeners = new Map<string, Set<EventListener>>();

  subscribe<T extends DomainEvent>(
    eventType: string,
    listener: (event: T) => void
  ): Subscription {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    
    this.listeners.get(eventType)!.add(listener);
    
    return {
      unsubscribe: () => {
        this.listeners.get(eventType)?.delete(listener);
      }
    };
  }

  publish(event: DomainEvent): void {
    const listeners = this.listeners.get(event.type) || new Set();
    listeners.forEach(listener => listener(event));
  }
}

// Usage in Domain
export class QueenService {
  constructor(private eventBus: EventBus) {}

  awakenQueen(playerId: PlayerId, queenId: QueenId): void {
    // ... awakening logic ...
    
    this.eventBus.publish(
      new QueenAwakenedEvent(playerId, queenId)
    );
  }
}

// Usage in UI
export function GameBoard() {
  useEffect(() => {
    const subscription = eventBus.subscribe('QUEEN_AWAKENED', (event) => {
      // Update UI
      playAwakeningAnimation(event.queenId);
      updateScore(event.playerId);
    });
    
    return () => subscription.unsubscribe();
  }, []);
}
```

## 6. Builder Pattern (for complex object construction)

### Template to Copy

```typescript
export class GameConfigBuilder {
  private config: Partial<GameConfig> = {};

  withPlayers(names: string[]): this {
    this.config.playerNames = names;
    return this;
  }

  withDifficulty(difficulty: 'easy' | 'normal' | 'hard'): this {
    this.config.difficulty = difficulty;
    return this;
  }

  withTimeLimit(seconds: number): this {
    this.config.timeLimit = seconds;
    return this;
  }

  withVariant(variant: 'standard' | 'quick' | 'tournament'): this {
    this.config.variant = variant;
    return this;
  }

  build(): GameConfig {
    if (!this.config.playerNames || this.config.playerNames.length < 2) {
      throw new Error('At least 2 players required');
    }

    return {
      playerNames: this.config.playerNames,
      difficulty: this.config.difficulty || 'normal',
      timeLimit: this.config.timeLimit || 0,
      variant: this.config.variant || 'standard'
    };
  }
}

// Usage
const config = new GameConfigBuilder()
  .withPlayers(['Alice', 'Bob', 'Charlie'])
  .withDifficulty('hard')
  .withTimeLimit(300)
  .build();
```

## Pattern Usage Checklist

Before implementing any feature:

- [ ] Is this a user action? → Use Command Pattern
- [ ] Does this need persistence? → Use Repository Pattern
- [ ] Is this complex object creation? → Use Factory Pattern
- [ ] Are there rule variations? → Use Strategy Pattern
- [ ] Do components need to react? → Use Observer Pattern
- [ ] Is construction complex? → Use Builder Pattern

## Anti-Patterns to Avoid

1. **NOT using patterns** when they apply
2. **Modifying patterns** instead of following templates
3. **Mixing patterns** incorrectly
4. **Over-engineering** with unnecessary patterns
5. **Breaking pattern contracts** (e.g., Command without validate)