// Test script to verify random first player selection
const { GameEngineAdapter } = require('./src/application/adapters/GameEngineAdapter');

// Create a simple test
console.log('Testing random first player selection...\n');

const results = {};
const NUM_TESTS = 100;

for (let i = 0; i < NUM_TESTS; i++) {
  // Create a new game with 4 players
  const game = new GameEngineAdapter({ maxPlayers: 4 });

  // Add 4 players
  game.addPlayer({ id: 'player1', name: 'Alice', isConnected: true });
  game.addPlayer({ id: 'player2', name: 'Bob', isConnected: true });
  game.addPlayer({ id: 'player3', name: 'Charlie', isConnected: true });
  game.addPlayer({ id: 'player4', name: 'Diana', isConnected: true });

  // Start the game
  game.startGame();

  // Check who was selected as first player
  const state = game.getState();
  const firstPlayer = state.currentPlayerId;

  // Track results
  results[firstPlayer] = (results[firstPlayer] || 0) + 1;
}

console.log(`Results after ${NUM_TESTS} games:\n`);
console.log('Player | Times Selected | Percentage');
console.log('-------|----------------|------------');
for (const [player, count] of Object.entries(results)) {
  const percentage = ((count / NUM_TESTS) * 100).toFixed(1);
  console.log(`${player.padEnd(7)}| ${count.toString().padEnd(14)} | ${percentage}%`);
}

console.log('\n✓ If percentages are roughly equal (around 25% each), random selection is working correctly.');
console.log('✗ If one player is always or mostly selected, there\'s a problem with randomness.');