# 🧪 Testing Guide - Sleeping Queens

This document outlines the comprehensive testing strategy for the Sleeping Queens multiplayer card game.

## 📋 Testing Overview

Our test suite covers:
- **Game Engine Logic**: Core game rules, move validation, state management
- **Card System**: Card types, deck creation, math equations
- **Utility Functions**: Scoring, win conditions, player management
- **React Components**: UI components, interactions, accessibility
- **Integration**: End-to-end game scenarios

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (great for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- cards.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="king move"

# Run tests verbosely
npm test -- --verbose
```

### Coverage Reports

After running `npm run test:coverage`, open `coverage/lcov-report/index.html` in your browser to see detailed coverage reports.

## 🎮 Game Engine Tests

### Core Game Logic (`src/game/__tests__/game.test.ts`)

Tests the main `SleepingQueensGame` class:

- **Game Initialization**: Default state, custom configuration
- **Player Management**: Adding/removing players, turn management
- **Game Start**: Minimum players, dealing cards
- **Move Execution**: All card types and actions
- **Win Conditions**: Queen count and point thresholds
- **Edge Cases**: Empty deck, disconnections

### Card System (`src/game/__tests__/cards.test.ts`)

Tests card definitions and deck management:

- **Card Collections**: Correct quantities of each card type
- **Queen Distribution**: Point values, rarity balance
- **Deck Operations**: Creation, shuffling, dealing
- **Math Validation**: Complex equation checking
- **Utility Functions**: Display names, point calculations

### Game Utils (`src/game/__tests__/utils.test.ts`)

Tests helper functions and validators:

- **ID Generation**: Unique room codes, player IDs
- **Score Calculation**: Player points, win detection
- **Move Validation**: All card actions, error handling
- **Math Equations**: Finding valid combinations
- **State Management**: Player turns, game phases

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

We maintain high test coverage across all critical areas:

| Component | Target Coverage | Focus Areas |
|-----------|----------------|-------------|
| Game Engine | 90%+ | Rules enforcement, state consistency |
| Card System | 85%+ | Math validation, deck integrity |
| Components | 80%+ | User interactions, accessibility |
| Utilities | 90%+ | Edge cases, error handling |

## 🔧 Testing Best Practices

### Writing New Tests

1. **Descriptive Names**: Test names should clearly describe what they verify
2. **Arrange-Act-Assert**: Follow AAA pattern for clarity
3. **One Concept**: Each test should verify one specific behavior
4. **Mock External Dependencies**: Use mocks for complex dependencies
5. **Test Edge Cases**: Include boundary conditions and error scenarios

### Example Test Structure

```typescript
describe('SleepingQueensGame', () => {
  describe('King Moves', () => {
    test('should successfully wake sleeping queen with king', () => {
      // Arrange
      const game = new SleepingQueensGame();
      game.addPlayer({ id: 'player1', name: 'Test Player', isConnected: true });
      game.startGame();
      
      const state = game.getState();
      const player = state.players[0];
      player.hand.push({ id: 'king1', type: 'king', name: 'King' });
      
      // Act
      const result = game.playMove({
        type: 'play_king',
        playerId: player.id,
        cards: [player.hand[0]],
        targetCard: state.sleepingQueens[0],
        timestamp: Date.now()
      });
      
      // Assert
      expect(result.isValid).toBe(true);
      expect(player.queens).toHaveLength(1);
      expect(state.sleepingQueens).toHaveLength(11);
    });
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