import { GameEngine } from './src/game/engine/GameEngine';

// Create a new game
const game = new GameEngine();

// Add a test player
const testPlayer = {
  id: 'test-player-1',
  name: 'Test Player',
  isConnected: true,
  position: 0,
  hand: [],
  queens: [],
  score: 0
};

game.addPlayer(testPlayer);

// Get the state
const state = game.getState();

console.log('Game State after creation:');
console.log('- Game ID:', state.id);
console.log('- Room Code:', state.roomCode);
console.log('- Sleeping Queens Count:', state.sleepingQueens.length);
console.log('- Sleeping Queens:', state.sleepingQueens.map(q => ({
  id: q.id,
  name: q.name,
  points: q.points
})));

// Check if there are duplicates
const queensById = new Map();
state.sleepingQueens.forEach(q => {
  if (queensById.has(q.id)) {
    console.log('DUPLICATE QUEEN ID FOUND:', q.id);
  }
  queensById.set(q.id, q);
});

// Check if there are missing queens
const expectedQueens = [
  'Cat Queen', 'Dog Queen', 'Cake Queen', 'Pancake Queen',
  'Ladybug Queen', 'Strawberry Queen', 'Rainbow Queen', 'Heart Queen',
  'Star Queen', 'Moon Queen', 'Sun Queen', 'Rose Queen'
];

const foundQueens = state.sleepingQueens.map(q => q.name);
const missingQueens = expectedQueens.filter(name => !foundQueens.includes(name));

if (missingQueens.length > 0) {
  console.log('\nMISSING QUEENS:', missingQueens);
} else {
  console.log('\nAll 12 queens are present ✓');
}

// Simulate what would be saved to database
console.log('\n--- Data that would be saved to database ---');
console.log(JSON.stringify({ sleepingQueens: state.sleepingQueens }, null, 2));