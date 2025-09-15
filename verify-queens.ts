import {createSleepingQueens, QUEENS} from '@/domain/factories/CardFactory';
import {GameEngine} from './src/game/engine/GameEngine';

console.log('QUEENS array length:', QUEENS.length);
console.log('QUEENS names:', QUEENS.map(q => q.name));

const sleepingQueens = createSleepingQueens();
console.log('\ncreateSleepingQueens() returns:', sleepingQueens.length, 'queens');
console.log('Sleeping queens names:', sleepingQueens.map(q => q.name));

// Test GameEngine initialization
const game = new GameEngine();
const state = game.getState();
console.log('\nGameEngine initial state:');
console.log('- Sleeping queens count:', state.sleepingQueens.length);
console.log('- Sleeping queens names:', state.sleepingQueens.map(q => q.name));