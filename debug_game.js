// Debug script to test game mechanics
const { SleepingQueensGame } = require('./src/game/game');

const game = new SleepingQueensGame();

// Add two players
game.addPlayer({ id: 'player1', name: 'Alice', isConnected: true });
game.addPlayer({ id: 'player2', name: 'Bob', isConnected: true });

// Start the game
const startResult = game.startGame();
console.log('Game started:', startResult);

const state = game.getInternalState();
console.log('Game phase:', state.phase);
console.log('Players:', state.players.map(p => ({
    name: p.name,
    handSize: p.hand.length,
    queens: p.queens.length
})));
console.log('Sleeping queens:', state.sleepingQueens.length);
console.log('Deck size:', state.deck.length);

// Show current player's hand
const currentPlayer = state.players[state.currentPlayerIndex];
console.log(`\nCurrent player: ${currentPlayer.name}`);
console.log('Hand cards:', currentPlayer.hand.map(c => `${c.type}-${c.value || c.name}`));

// Give them a king if they don't have one
const hasKing = currentPlayer.hand.some(c => c.type === 'king');
if (!hasKing) {
    console.log('Adding a king to test...');
    currentPlayer.hand.push({ id: 'test-king', type: 'king', name: 'King' });
}

// Try to play a king
const kingCard = currentPlayer.hand.find(c => c.type === 'king');
const targetQueen = state.sleepingQueens[0];

if (kingCard && targetQueen) {
    console.log(`\nTrying to play ${kingCard.name} to wake up ${targetQueen.name}`);
    
    const move = {
        type: 'play_king',
        playerId: currentPlayer.id,
        cards: [kingCard],
        targetCard: targetQueen,
        timestamp: Date.now()
    };
    
    const result = game.playMove(move);
    console.log('Move result:', result);
    
    if (result.isValid) {
        const newState = game.getInternalState();
        const updatedPlayer = newState.players.find(p => p.id === currentPlayer.id);
        console.log('Player now has queens:', updatedPlayer.queens.map(q => q.name));
        console.log('Sleeping queens remaining:', newState.sleepingQueens.length);
        console.log('Current turn player:', newState.players[newState.currentPlayerIndex].name);
    }
} else {
    console.log('Missing king or target queen');
}