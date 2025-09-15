import { QUEENS } from './src/game/cards';

// These are the correct queen IDs that should be in NewGameBoard
const correctQueenIds = [
  'queen-cat', 'queen-dog', 'queen-cake', 'queen-pancake',
  'queen-ladybug', 'queen-strawberry', 'queen-rainbow', 'queen-heart',
  'queen-star', 'queen-moon', 'queen-sun', 'queen-rose'
];

console.log('=== QUEEN ID VERIFICATION ===\n');

// Check if all correct IDs exist in QUEENS
console.log('Checking if all hardcoded IDs exist in QUEENS array:');
correctQueenIds.forEach(id => {
  const exists = QUEENS.some(q => q.id === id);
  console.log(`  ${id}: ${exists ? '✓' : '✗ MISSING'}`);
});

console.log('\nQueens in QUEENS array:');
QUEENS.forEach(q => {
  const isIncluded = correctQueenIds.includes(q.id);
  console.log(`  ${q.id} (${q.name}): ${isIncluded ? '✓ included' : '✗ NOT INCLUDED'}`);
});

console.log('\n=== SUMMARY ===');
console.log(`Total queens in QUEENS array: ${QUEENS.length}`);
console.log(`Total queen IDs in NewGameBoard: ${correctQueenIds.length}`);

const allMatch = QUEENS.every(q => correctQueenIds.includes(q.id)) &&
                 correctQueenIds.every(id => QUEENS.some(q => q.id === id));

if (allMatch && QUEENS.length === 12 && correctQueenIds.length === 12) {
  console.log('\n✅ SUCCESS: All 12 queens are correctly configured!');
} else {
  console.log('\n❌ ERROR: Queen configuration mismatch!');
}