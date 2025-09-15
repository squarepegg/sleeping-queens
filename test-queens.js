// Test queens initialization
const { GameEngine } = require('./dist/game/engine/GameEngine');
const game = new GameEngine();
const state = game.getState();

console.log('Initial sleeping queens count:', state.sleepingQueens.length);
console.log('Queens:', state.sleepingQueens.map(q => q.name));