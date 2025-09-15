# ANTI-PATTERNS - NEVER DO THESE

## 🚫 ABSOLUTE PROHIBITIONS

If you find yourself about to do ANY of these, STOP IMMEDIATELY and refactor.

## 1. Mixed Concerns in Same File

### ❌ FORBIDDEN - Business Logic in UI Components
```typescript
// NEVER DO THIS
function CardComponent({ card }) {
  // Business logic has no place in UI!
  const calculateScore = () => {
    if (card.type === 'queen') {
      if (card.name === 'Rose Queen') {
        return 5;
      }
      return card.points * 2;
    }
    return 0;
  };

  const validatePlay = () => {
    // Game rules in UI component!
    if (gameState.currentPlayer !== playerId) {
      return false;
    }
    // More validation logic...
  };

  return <div onClick={() => validatePlay() && playCard(card)}>...</div>;
}
```

### ✅ CORRECT - Separated Concerns
```typescript
// UI Component - only rendering
function CardComponent({ card, canPlay, onPlay }) {
  return (
    <div 
      className={canPlay ? 'playable' : 'disabled'}
      onClick={() => canPlay && onPlay(card)}
    >
      {card.name}
    </div>
  );
}

// Business logic in domain layer
class CardValidator {
  canPlay(card: Card, state: GameState): boolean {
    // Validation logic here
  }
}
```

## 2. Upward Dependencies

### ❌ FORBIDDEN - Domain Importing from UI
```typescript
// domain/GameEngine.ts
import { updateUIScore } from '../presentation/ScoreDisplay'; // NEVER!
import { showNotification } from '../ui/Notifications'; // NEVER!

class GameEngine {
  updateScore(points: number) {
    this.score += points;
    updateUIScore(this.score); // Domain calling UI!
    showNotification('Score updated!'); // NO!
  }
}
```

### ✅ CORRECT - Using Events or Callbacks
```typescript
// domain/GameEngine.ts
class GameEngine {
  constructor(private eventBus: EventPublisher) {}

  updateScore(points: number) {
    this.score += points;
    // Domain publishes event, doesn't know about UI
    this.eventBus.publish(new ScoreChangedEvent(this.score));
  }
}

// presentation/ScoreDisplay.ts
eventBus.subscribe(ScoreChangedEvent, (event) => {
  updateUIScore(event.score);
  showNotification('Score updated!');
});
```

## 3. God Classes/Functions

### ❌ FORBIDDEN - Class Doing Everything
```typescript
// NEVER CREATE A CLASS LIKE THIS
class GameManager {
  // UI concerns
  renderBoard() { }
  updateDisplay() { }
  handleClick() { }
  
  // Business logic
  validateMove() { }
  calculateScore() { }
  checkWinCondition() { }
  
  // Persistence
  saveGame() { }
  loadGame() { }
  
  // Networking
  sendToServer() { }
  receiveFromServer() { }
  
  // Animation
  animateCard() { }
  playSound() { }
}
```

### ✅ CORRECT - Single Responsibility
```typescript
// Each class has ONE job
class TurnManager {
  nextTurn() { }
  getCurrentPlayer() { }
}

class ScoreCalculator {
  calculate(queens: Queen[]) { }
}

class GameRepository {
  save(state: GameState) { }
  load(id: string) { }
}

class AnimationController {
  animateCardMove(from: Position, to: Position) { }
}
```

## 4. Magic Values

### ❌ FORBIDDEN - Inline Magic Numbers/Strings
```typescript
// NEVER USE MAGIC VALUES
function checkWin(player: Player) {
  if (player.queens.length >= 5) { // What is 5?
    return true;
  }
  if (player.score >= 50) { // What is 50?
    return true;
  }
  if (gameMode === 'quick') { // Magic string!
    return player.queens.length >= 3; // Another magic number!
  }
}

if (card.type === 'queen' && card.name === 'Rose Queen') { // Magic strings!
  // Special logic
}
```

### ✅ CORRECT - Named Constants
```typescript
// Define all constants
const WIN_CONDITIONS = {
  STANDARD: {
    SMALL_GAME: { QUEENS: 5, POINTS: 50 },
    LARGE_GAME: { QUEENS: 4, POINTS: 40 }
  },
  QUICK: {
    QUEENS: 3,
    POINTS: 30
  }
};

const CARD_TYPES = {
  QUEEN: 'queen',
  KING: 'king',
  KNIGHT: 'knight'
} as const;

const SPECIAL_QUEENS = {
  ROSE: 'Rose Queen',
  CAT: 'Cat Queen',
  DOG: 'Dog Queen'
} as const;

// Use constants
function checkWin(player: Player, playerCount: number) {
  const condition = playerCount <= 3 
    ? WIN_CONDITIONS.STANDARD.SMALL_GAME 
    : WIN_CONDITIONS.STANDARD.LARGE_GAME;
    
  return player.queens.length >= condition.QUEENS ||
         player.score >= condition.POINTS;
}
```

## 5. Inline Complex Logic

### ❌ FORBIDDEN - Complex Logic Without Extraction
```typescript
// NEVER WRITE THIS
function processCard(card, otherCards) {
  // Complex inline logic that's hard to understand
  if (card.type === 'number' && 
      otherCards.some(c => c.type === 'number' && c.value === card.value) ||
      (otherCards.filter(c => c.type === 'number')
        .reduce((sum, c) => sum + c.value, 0) === card.value &&
        otherCards.filter(c => c.type === 'number').length >= 2) ||
      (card.value === otherCards.filter(c => c.type === 'number')
        .sort((a, b) => a.value - b.value)
        .slice(0, Math.min(3, otherCards.length))
        .reduce((sum, c) => sum + c.value, 0))) {
    // Do something
  }
}
```

### ✅ CORRECT - Extracted and Named Functions
```typescript
function processCard(card: Card, otherCards: Card[]) {
  if (canDiscard(card, otherCards)) {
    // Do something
  }
}

function canDiscard(card: Card, otherCards: Card[]): boolean {
  if (card.type !== 'number') return false;
  
  return hasPair(card, otherCards) || 
         formsEquation(card, otherCards);
}

function hasPair(card: NumberCard, otherCards: Card[]): boolean {
  return otherCards.some(c => 
    c.type === 'number' && c.value === card.value
  );
}

function formsEquation(card: NumberCard, otherCards: Card[]): boolean {
  const numbers = otherCards.filter(isNumberCard);
  return findValidEquation(card.value, numbers) !== null;
}
```

## 6. Generic Utils with Mixed Concerns

### ❌ FORBIDDEN - Catch-all Utils File
```typescript
// utils.js - NEVER CREATE THIS
export function calculateScore() { } // Domain logic
export function formatDate() { } // Presentation
export function saveToLocalStorage() { } // Infrastructure
export function validateEmail() { } // Validation
export function shuffleArray() { } // Algorithm
export function parseJSON() { } // Data parsing
export function animateElement() { } // UI
```

### ✅ CORRECT - Organized by Concern
```typescript
// domain/services/ScoreCalculator.ts
export class ScoreCalculator { }

// presentation/formatters/DateFormatter.ts
export class DateFormatter { }

// infrastructure/storage/LocalStorage.ts
export class LocalStorageService { }

// shared/algorithms/ArrayUtils.ts
export function shuffle<T>(array: T[]): T[] { }
```

## 7. Mutating State Directly

### ❌ FORBIDDEN - Direct Mutation
```typescript
// NEVER MUTATE STATE DIRECTLY
function playCard(gameState: GameState, card: Card) {
  gameState.currentPlayer.hand.splice(cardIndex, 1); // Mutating!
  gameState.discardPile.push(card); // Mutating!
  gameState.currentPlayerIndex++; // Mutating!
  return gameState; // Returning mutated object
}
```

### ✅ CORRECT - Immutable Updates
```typescript
function playCard(gameState: GameState, card: Card): GameState {
  return {
    ...gameState,
    currentPlayer: {
      ...gameState.currentPlayer,
      hand: gameState.currentPlayer.hand.filter(c => c.id !== card.id)
    },
    discardPile: [...gameState.discardPile, card],
    currentPlayerIndex: (gameState.currentPlayerIndex + 1) % gameState.players.length
  };
}
```

## 8. Circular Dependencies

### ❌ FORBIDDEN - Circular Imports
```typescript
// FileA.ts
import { functionB } from './FileB';
export function functionA() {
  functionB();
}

// FileB.ts
import { functionA } from './FileA'; // CIRCULAR!
export function functionB() {
  functionA();
}
```

### ✅ CORRECT - Proper Dependency Structure
```typescript
// Create a third module or use dependency injection
// EventBus.ts
export class EventBus { }

// FileA.ts
export class ServiceA {
  constructor(private eventBus: EventBus) {}
}

// FileB.ts
export class ServiceB {
  constructor(private eventBus: EventBus) {}
}
```

## 9. Using 'any' Type

### ❌ FORBIDDEN - Using 'any'
```typescript
// NEVER USE 'any'
function processData(data: any) { // NO TYPE SAFETY!
  return data.someProperty; // Could crash
}

let result: any = fetchData(); // NO!
```

### ✅ CORRECT - Proper Typing
```typescript
interface GameData {
  id: string;
  players: Player[];
  state: GameState;
}

function processData(data: GameData) {
  return data.state; // Type safe
}

let result: GameData | null = await fetchData();
```

## 10. Commented-Out Code

### ❌ FORBIDDEN - Leaving Commented Code
```typescript
function calculateScore() {
  // let score = 0;
  // for (let queen of queens) {
  //   score += queen.points;
  // }
  // return score;
  
  // Trying new approach
  return queens.reduce((sum, q) => sum + q.points, 0);
  
  // Old implementation
  // return queens.length * 10;
}
```

### ✅ CORRECT - Clean Code Only
```typescript
function calculateScore() {
  return queens.reduce((sum, q) => sum + q.points, 0);
}
// Use version control for history, not comments
```

## 11. TODO Comments Without Action

### ❌ FORBIDDEN - Leaving TODOs
```typescript
function validateMove() {
  // TODO: Add validation logic
  // FIXME: This doesn't work for all cases
  // HACK: Temporary fix until we refactor
  return true;
}
```

### ✅ CORRECT - Fix It Now
```typescript
function validateMove(move: Move, state: GameState): ValidationResult {
  // Implement complete validation
  const validator = new MoveValidator();
  return validator.validate(move, state);
}
```

## 12. Nested Ternaries

### ❌ FORBIDDEN - Complex Ternaries
```typescript
const result = condition1 
  ? value1 
  : condition2 
    ? value2 
    : condition3 
      ? value3 
      : value4;
```

### ✅ CORRECT - Clear Logic
```typescript
function determineResult() {
  if (condition1) return value1;
  if (condition2) return value2;
  if (condition3) return value3;
  return value4;
}
```

## Red Flags Checklist

If you see ANY of these, stop and refactor:

- [ ] File > 200 lines
- [ ] Function > 20 lines
- [ ] Class > 100 lines
- [ ] More than 3 levels of nesting
- [ ] More than 5 parameters
- [ ] Duplicate code blocks
- [ ] Mixed abstraction levels
- [ ] Test-unfriendly code
- [ ] Hard-coded values
- [ ] Global variables
- [ ] Side effects in unexpected places

## What To Do When You See These

1. **STOP** - Don't continue with the anti-pattern
2. **IDENTIFY** - Which pattern is being violated?
3. **REFACTOR** - Fix it immediately
4. **TEST** - Ensure the refactored code works
5. **DOCUMENT** - Explain why the change was needed

Remember: Technical debt compounds. Fix it now, not later.