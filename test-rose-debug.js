// Debug test for Rose Queen bonus
const { GameEngineAdapter } = require('./src/application/adapters/GameEngineAdapter');

console.log('\n=== Testing Rose Queen Bonus Turn Advancement ===\n');

// Create a new game with test mode
const game = new GameEngineAdapter({ maxPlayers: 2, testMode: true });

// Add 2 players
game.addPlayer({ id: 'player1', name: 'Alice', isConnected: true });
game.addPlayer({ id: 'player2', name: 'Bob', isConnected: true });

// Start the game
game.startGame();

let state = game.getState();
console.log(`Initial turn: Player ${state.currentPlayerIndex} (${state.players[state.currentPlayerIndex].name})`);
console.log(`Sleeping Queens: ${state.sleepingQueens.map(q => q.name).join(', ')}`);

// Give player 1 a King
state.players[0].hand = [
  { id: 'king1', type: 'king', name: 'King' },
  ...state.players[0].hand.slice(1)
];
game.setState(state);

// Play the King to wake Rose Queen
const kingMove = {
  type: 'play_king',
  playerId: 'player1',
  timestamp: Date.now(),
  cards: [{ id: 'king1', type: 'king', name: 'King' }],
  targetCard: { id: 'queen-rose', name: 'Rose Queen', points: 5, isAwake: false }
};

console.log('\n1. Playing King to wake Rose Queen...');
const kingResult = game.playMove(kingMove);
console.log(`   Result: ${kingResult.isValid ? 'Valid' : 'Invalid'}`);

state = game.getState();
console.log(`   Current turn after King: Player ${state.currentPlayerIndex} (${state.players[state.currentPlayerIndex].name})`);
console.log(`   Rose Queen bonus pending: ${state.roseQueenBonus?.pending}`);

// Play the Rose Queen bonus
const bonusMove = {
  type: 'rose_queen_bonus',
  playerId: 'player1',
  timestamp: Date.now() + 1000,
  cards: [],
  targetCard: { id: 'cat-queen', name: 'Cat Queen', points: 15, isAwake: false }
};

console.log('\n2. Using Rose Queen bonus to wake Cat Queen...');
const bonusResult = game.playMove(bonusMove);
console.log(`   Result: ${bonusResult.isValid ? 'Valid' : 'Invalid'}`);

state = game.getState();
console.log(`   Current turn after bonus: Player ${state.currentPlayerIndex} (${state.players[state.currentPlayerIndex].name})`);
console.log(`   Rose Queen bonus pending: ${state.roseQueenBonus?.pending}`);
console.log(`   Player 1 queens: ${state.players[0].queens.map(q => q.name).join(', ')}`);

console.log('\n=== Test Complete ===');
console.log(`\n✓ Expected: Turn should be Player 1 (index 1) after Rose Queen bonus`);
console.log(`${state.currentPlayerIndex === 1 ? '✓' : '✗'} Actual: Turn is Player ${state.currentPlayerIndex}`);