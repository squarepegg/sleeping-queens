const { GameEngine } = require('./src/game/engine/GameEngine.ts');

console.log('Creating GameEngine...');
const engine = new GameEngine();

console.log('Adding players...');
const players = [
  {
    id: 'player1',
    name: 'Alice',
    hand: [],
    queens: [],
    score: 0,
    isConnected: true,
    position: 0
  },
  {
    id: 'player2', 
    name: 'Bob',
    hand: [],
    queens: [],
    score: 0,
    isConnected: true,
    position: 1
  }
];

engine.addPlayer(players[0]);
engine.addPlayer(players[1]);

console.log('Starting game...');
engine.startGame();

console.log('Setting up test scenario...');
const state = engine.getGameState();
const attacker = state.players[0];
const target = state.players[1];

// Give target a queen
const queen = state.sleepingQueens[0];
state.sleepingQueens.splice(0, 1);
target.queens.push(queen);
target.score = queen.points;

// Give attacker a knight
const knightCard = { id: 'knight1', type: 'knight', name: 'Knight' };
attacker.hand.push(knightCard);

console.log('State before move:', {
  attackerHand: attacker.hand.map(c => c.type),
  targetQueens: target.queens.map(q => q.name),
  pendingKnightAttack: state.pendingKnightAttack
});

const move = {
  type: 'play_knight',
  playerId: attacker.id,
  cards: [knightCard],
  targetPlayer: target.id,
  targetCard: queen,
  timestamp: Date.now()
};

console.log('Attempting knight move:', move);
const result = engine.playMove(move);

console.log('Move result:', result);

const newState = engine.getGameState();
console.log('State after move:', {
  pendingKnightAttack: newState.pendingKnightAttack,
  attackerHand: newState.players[0].hand.map(c => c.type),
  targetQueens: newState.players[1].queens.map(q => q.name)
});