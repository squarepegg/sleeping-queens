// Test script to verify Knight attack with Dragon defense
const { GameEngineAdapter } = require('./src/application/adapters/GameEngineAdapter');

// Create a game with custom state
const game = new GameEngineAdapter();

// Start the game
game.addPlayer('alice', 'Alice');
game.addPlayer('bob', 'Bob');
game.startGame();

// Get initial state
let state = game.getState();
console.log('\n=== Initial Setup ===');
console.log('Alice hand:', state.players[0].hand.map(c => c.type));
console.log('Bob hand:', state.players[1].hand.map(c => c.type));

// Manually give Alice a Knight and Bob a Dragon + a Queen
state.players[0].hand = [
  { id: 'knight-test', type: 'knight', name: 'Knight' },
  ...state.players[0].hand.slice(1, 5)
];

state.players[1].hand = [
  { id: 'dragon-test', type: 'dragon', name: 'Dragon' },
  ...state.players[1].hand.slice(1, 5)
];

// Give Bob a Queen to steal
state.players[1].queens = [
  { id: 'queen-test', name: 'Test Queen', points: 5, isAwake: true }
];

// Update the game state
game.setState(state);
state = game.getState();

console.log('\n=== After Setup ===');
console.log('Alice hand:', state.players[0].hand.map(c => `${c.type}(${c.id})`));
console.log('Bob hand:', state.players[1].hand.map(c => `${c.type}(${c.id})`));
console.log('Bob queens:', state.players[1].queens.map(q => q.name));

// Alice plays Knight to steal Bob's queen
console.log('\n=== Alice plays Knight ===');
const result = game.playMove({
  type: 'play_knight',
  playerId: 'alice',
  cards: [{ id: 'knight-test', type: 'knight' }],
  targetPlayer: 'bob',
  targetCard: { id: 'queen-test' },
  timestamp: Date.now()
});

console.log('Move result:', result);

// Check state after move
state = game.getState();
console.log('\n=== After Knight Move ===');
console.log('Pending Knight Attack:', state.pendingKnightAttack);
console.log('Alice hand:', state.players[0].hand.map(c => c.type));
console.log('Bob hand:', state.players[1].hand.map(c => `${c.type}(${c.id})`));
console.log('Bob queens:', state.players[1].queens.map(q => q.name));

if (state.pendingKnightAttack) {
  console.log('\n✅ SUCCESS: Pending Knight attack created!');
  console.log('Target has Dragon defense opportunity');
} else {
  console.log('\n❌ FAILURE: No pending attack created despite Bob having Dragon');
}