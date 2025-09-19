// Deck composition analysis
const actionCards = {
  kings: 8,
  knights: 4,
  dragons: 3,
  wands: 3,
  potions: 4,
  jesters: 5
};

const numberCards = {
  1: 4, 2: 4, 3: 4, 4: 4, 5: 4,
  6: 4, 7: 4, 8: 4, 9: 4, 10: 4
};

const totalActionCards = Object.values(actionCards).reduce((a, b) => a + b, 0);
const totalNumberCards = Object.values(numberCards).reduce((a, b) => a + b, 0);
const totalDeck = totalActionCards + totalNumberCards;

console.log("SLEEPING QUEENS DECK COMPOSITION:");
console.log("==================================");
console.log(`Total cards in deck: ${totalDeck}`);
console.log(`Action cards: ${totalActionCards} (${(totalActionCards/totalDeck*100).toFixed(1)}%)`);
console.log(`Number cards: ${totalNumberCards} (${(totalNumberCards/totalDeck*100).toFixed(1)}%)`);
console.log("\nAction Card Breakdown:");
console.log(`- Kings: ${actionCards.kings} (${(actionCards.kings/totalDeck*100).toFixed(1)}% of deck)`);
console.log(`- Knights: ${actionCards.knights} (${(actionCards.knights/totalDeck*100).toFixed(1)}%)`);
console.log(`- Dragons: ${actionCards.dragons} (${(actionCards.dragons/totalDeck*100).toFixed(1)}%)`);
console.log(`- Wands: ${actionCards.wands} (${(actionCards.wands/totalDeck*100).toFixed(1)}%)`);
console.log(`- Potions: ${actionCards.potions} (${(actionCards.potions/totalDeck*100).toFixed(1)}%)`);
console.log(`- Jesters: ${actionCards.jesters} (${(actionCards.jesters/totalDeck*100).toFixed(1)}%)`);

console.log("\n2-PLAYER GAME ANALYSIS:");
console.log("========================");
const cardsDealt = 2 * 5; // 2 players × 5 cards
const remainingDeck = totalDeck - cardsDealt;
console.log(`Cards dealt at start: ${cardsDealt}`);
console.log(`Cards remaining in deck: ${remainingDeck}`);

// Probability analysis
console.log("\nProbability of drawing a King:");
console.log(`- From full deck: ${(8/totalDeck*100).toFixed(1)}%`);
console.log(`- In initial 5 cards: ${(1 - Math.pow((totalDeck-8)/totalDeck * (totalDeck-9)/(totalDeck-1) * (totalDeck-10)/(totalDeck-2) * (totalDeck-11)/(totalDeck-3) * (totalDeck-12)/(totalDeck-4), 1) * 100).toFixed(1)}%`);

// Expected values
const expectedKingsPerPlayer = 5 * (8/totalDeck);
console.log(`\nExpected Kings per player in initial hand: ${expectedKingsPerPlayer.toFixed(2)}`);
console.log(`Expected total Kings dealt initially: ${(expectedKingsPerPlayer * 2).toFixed(2)}`);
