# 🧪 Testing Guide - Sleeping Queens

This document outlines the comprehensive testing strategy for the Sleeping Queens multiplayer card game.

## 📋 Testing Overview

Our test suite follows Clean Architecture principles with 25 test suites and 210+ tests:
- **Domain Layer**: Pure business logic, game rules, validation (no dependencies)
- **Application Layer**: Command execution, orchestration, use cases
- **Infrastructure Layer**: Persistence, logging, external services
- **Presentation Layer**: React components, UI interactions
- **Integration Tests**: Full game workflows, multiplayer scenarios
- **Architecture Compliance**: Clean architecture validation

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests (25 test suites, 210+ tests)
npm test

# Run tests in watch mode (great for development)
npm run test:watch

# Run specific test file
npm test src/domain/__tests__/cards.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="king move"

# Run tests for a specific layer
npm test src/domain
npm test src/application
npm test src/infrastructure

# Type checking
npm run type-check

# Linting
npm run lint
```

### Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see detailed coverage reports.

## 🎮 Test Categories by Layer

### Domain Layer Tests (`src/domain/__tests__/`)

Pure business logic with no external dependencies:

- **Card Tests**: Card factories, queen creation, deck integrity
- **Game Rules**: All move validations, special card effects
- **Dragon Blocking**: Knight defense mechanics
- **Named Kings**: Special king card behaviors
- **Turn Management**: Player turn logic, special situations

### Application Layer Tests (`src/application/__tests__/`)

Command execution and orchestration:

- **Command Tests**: Each move type command validation and execution
- **GameOrchestrator**: Move coordination, state transitions
- **GameEngineAdapter**: Adapter pattern implementation

### Integration Tests (`src/__tests__/`)

Full workflow testing:

- **Architecture Compliance**: Clean architecture rules validation
- **Full Integration**: Complete game scenarios
- **User Workflows**: Real multiplayer game flows

### Game-Specific Tests (`src/game/__tests__/`)

Specialized game scenarios:

- **Jester Mechanics**: Jester card reveal and queen selection
- **Rose Queen Bonus**: Bonus queen selection after Rose Queen
- **Potion/Wand Blocking**: Defense mechanics
- **Hand Management**: Card drawing and discarding
- **Special Actions**: Complex card interactions

## 🎨 Component Tests

### Card Component (`src/components/__tests__/CardComponent.test.tsx`)

Tests the interactive card display:

- **Rendering**: Different card types, face up/down
- **Interactions**: Click, double-click, drag handling
- **States**: Selected, disabled, glowing effects
- **Styling**: Size variations, type-specific styling
- **Accessibility**: Keyboard navigation, screen readers

### Sleeping Queens Display (`src/components/__tests__/SleepingQueens.test.tsx`)

Tests the central queen selection area:

- **Queen Display**: Grouping, sorting, counts
- **Selection Logic**: Click handling, visual feedback
- **Highlighting**: Special effects, animations
- **Empty States**: No queens available
- **Performance**: Large numbers of queens

## 📊 Test Coverage Goals

We maintain high test coverage across all architectural layers:

| Layer | Target Coverage | Focus Areas |
|-----------|----------------|-------------|
| Domain | 95%+ | Business rules, validation, state transitions |
| Application | 90%+ | Command execution, orchestration |
| Infrastructure | 85%+ | External integrations, persistence |
| Presentation | 80%+ | User interactions, accessibility |
| Integration | Complete flows | End-to-end scenarios, multiplayer |

## 🔧 Testing Best Practices

### Writing New Tests

1. **Descriptive Names**: Test names should clearly describe what they verify
2. **Arrange-Act-Assert**: Follow AAA pattern for clarity
3. **One Concept**: Each test should verify one specific behavior
4. **Mock External Dependencies**: Use mocks for complex dependencies
5. **Test Edge Cases**: Include boundary conditions and error scenarios

### Example Test Structure (Clean Architecture)

```typescript
// Domain layer test - pure logic, no dependencies
describe('KingRules', () => {
  test('should validate king can wake sleeping queen', () => {
    // Arrange
    const state = createInitialGameState();
    const move: GameMove = {
      type: 'play_king',
      playerId: 'player1',
      cards: [{ id: 'king1', type: 'king', name: 'King' }],
      targetCard: state.sleepingQueens[0],
      timestamp: Date.now()
    };

    // Act
    const validation = KingRules.validate(state, move);

    // Assert
    expect(validation.isValid).toBe(true);
  });
});

// Application layer test - command execution
describe('PlayKingCommand', () => {
  test('should execute king move successfully', () => {
    // Arrange
    const state = createTestGameState();
    const command = new PlayKingCommand(state, kingMove);

    // Act
    const newState = command.execute();

    // Assert
    expect(newState.players[0].queens).toHaveLength(1);
    expect(newState.sleepingQueens).toHaveLength(11);
  });
});
```

## 🐛 Debugging Tests

### Common Issues

1. **Async Operations**: Use `await` and `act()` for state updates
2. **Mock Cleanup**: Reset mocks between tests
3. **DOM Cleanup**: React Testing Library cleans up automatically
4. **Animation Issues**: Mock framer-motion for consistent behavior

### Debug Commands

```bash
# Run specific test with debug output
npm test -- --testNamePattern="specific test" --verbose

# Run tests with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Get detailed error information
npm test -- --no-coverage --verbose
```

## 📝 Test Data Helpers

### Creating Test Objects

```typescript
// Helper functions for creating test data
const createTestPlayer = (id: string, name: string): Player => ({
  id,
  name,
  position: 0,
  hand: [],
  queens: [],
  isConnected: true,
  score: 0
});

const createTestQueen = (points: number): Queen => ({
  id: `queen-${points}`,
  type: 'queen',
  name: `Test Queen ${points}`,
  points,
  isAwake: false
});
```

## 🚀 Continuous Integration

Tests run automatically on:
- Pull requests
- Push to main branch
- Release builds

### CI Configuration

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm ci
    npm run test:coverage
    npm run build
```

## 📈 Performance Testing

### Load Testing

```typescript
test('should handle multiple concurrent players', () => {
  const game = new SleepingQueensGame();
  
  // Add maximum players quickly
  for (let i = 0; i < 5; i++) {
    game.addPlayer({
      id: `player${i}`,
      name: `Player ${i}`,
      isConnected: true
    });
  }
  
  expect(game.getState().players).toHaveLength(5);
});
```

## 🔍 Test Categories

### Unit Tests
- Individual functions and methods
- Pure logic without dependencies
- Fast execution (< 1ms each)

### Integration Tests  
- Component interactions
- Game flow scenarios
- Medium execution (< 100ms each)

### End-to-End Tests
- Complete game sessions
- Real user scenarios
- Slower execution (< 1s each)

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

💡 **Pro Tip**: Run tests frequently during development with `npm run test:watch` to catch issues early!