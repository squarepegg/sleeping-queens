const { GameEngineAdapter } = require('./src/application/adapters/GameEngineAdapter');

console.log('\n=== Testing First Player Randomness ===\n');

const playerCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
const NUM_TESTS = 1000;

for (let i = 0; i < NUM_TESTS; i++) {
  const game = new GameEngineAdapter({ maxPlayers: 4 });

  // Add 4 players
  game.addPlayer({ id: 'p1', name: 'Alice', isConnected: true });
  game.addPlayer({ id: 'p2', name: 'Bob', isConnected: true });
  game.addPlayer({ id: 'p3', name: 'Charlie', isConnected: true });
  game.addPlayer({ id: 'p4', name: 'Diana', isConnected: true });

  // Start the game
  game.startGame();

  // Check which player goes first
  const state = game.getState();
  playerCounts[state.currentPlayerIndex]++;
}

console.log(`Results after ${NUM_TESTS} games:`);
console.log('========================');
for (let i = 0; i < 4; i++) {
  const percentage = (playerCounts[i] / NUM_TESTS * 100).toFixed(1);
  console.log(`Player ${i + 1}: ${playerCounts[i]} times (${percentage}%)`);
}

console.log('\nExpected: ~25% for each player');
console.log('Actual distribution:', Object.values(playerCounts).map(c => (c / NUM_TESTS * 100).toFixed(1) + '%').join(', '));

// Check if distribution is reasonably random (each should be 20-30% for fairness)
const isRandom = Object.values(playerCounts).every(count => {
  const percentage = count / NUM_TESTS * 100;
  return percentage >= 20 && percentage <= 30;
});

console.log('\n' + (isRandom ? '✅ Distribution appears random!' : '❌ Distribution seems biased!'));