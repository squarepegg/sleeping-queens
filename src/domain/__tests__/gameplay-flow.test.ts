import {GameEngineAdapter} from '../../application/adapters/GameEngineAdapter';
import {GameMove} from '../../domain/models/GameMove';
import {Card, NumberCard, Queen} from '../../domain/models/Card';

/**
 * These tests simulate the exact flow that should happen in the UI
 * to verify that all the game mechanics work as expected
 */
describe('Sleeping Queens - Complete Gameplay Flow Tests', () => {
  let game: GameEngineAdapter;

  beforeEach(() => {
    game = new GameEngineAdapter();
    
    // Add two players
    game.addPlayer({ id: 'alice', name: 'Alice', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    game.addPlayer({ id: 'bob', name: 'Bob', isConnected: true, position: 1, hand: [], queens: [], score: 0 });
    
    // Start the game
    const startResult = game.startGame();
    expect(startResult).toBe(true);
    
    const state = game.getState();
    expect(state.phase).toBe('playing');
    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(5);
    expect(state.players[1].hand).toHaveLength(5);
  });

  describe('King Card - Wake Sleeping Queen', () => {
    test('should complete king move flow successfully', () => {
      const state = game.getState();
      const alice = state.players[0];  // Current player
      
      console.log('=== KING FLOW TEST ===');
      console.log('Alice hand before:', alice.hand.map((c: Card) => `${c.type}-${c.name || c.value}`));
      console.log('Alice queens before:', alice.queens.length);
      console.log('Sleeping queens before:', state.sleepingQueens.length);
      
      // Give Alice a king (simulating what would happen in the UI)
      const kingCard: Card = { id: 'test-king', type: 'king' as const, name: 'King' };
      alice.hand.push(kingCard);
      game.setState(state);      
      const targetQueen = state.sleepingQueens[0];
      console.log('Target queen:', targetQueen.name, targetQueen.points);
      
      // Create the exact move the UI would make
      const move: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        targetCard: targetQueen,
        timestamp: Date.now()
      };
      
      // Execute the move
      const result = game.playMove(move);
      console.log('Move result:', result);
      
      expect(result.isValid).toBe(true);
      
      // Verify the state changes
      const newState = game.getState();
      const updatedAlice = newState.players[0];
      
      console.log('Alice hand after:', updatedAlice.hand.map((c: Card) => `${c.type}-${c.name || c.value}`));
      console.log('Alice queens after:', updatedAlice.queens.map((q: Queen) => q.name));
      console.log('Alice score after:', updatedAlice.score);
      console.log('Turn after:', newState.currentPlayerIndex, newState.players[newState.currentPlayerIndex].name);
      console.log('Sleeping queens after:', newState.sleepingQueens.length);
      
      // Assertions
      expect(updatedAlice.queens).toHaveLength(1);
      expect(updatedAlice.queens[0].name).toBe(targetQueen.name);
      expect(updatedAlice.score).toBe(targetQueen.points);
      expect(newState.currentPlayerIndex).toBe(1); // Turn should advance to Bob
      expect(newState.sleepingQueens.length).toBe(11); // One less sleeping queen
      expect(updatedAlice.hand).toHaveLength(5); // Hand should be refilled
    });
    
    test('should fail when trying to play king without targetCard', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      const kingCard: Card = { id: 'test-king', type: 'king' as const, name: 'King' };
      alice.hand.push(kingCard);
      game.setState(state);      
      const move: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        // Missing targetCard - this should fail
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(false);
      // Missing targetCard will result in validation error
      expect(result.error).toBeDefined();
    });
  });

  describe('Knight Card - Steal Queen', () => {
    test('should complete knight move flow successfully', () => {
      const state = game.getState();
      const alice = state.players[0];
      const bob = state.players[1];
      
      console.log('=== KNIGHT FLOW TEST ===');
      
      // First, give Bob a queen (simulate he woke one up earlier)
      const stolenQueen: Queen = {
        id: 'test-queen',
        type: 'queen' as const,
        name: 'Test Queen',
        points: 20,
        isAwake: true,
        description: 'Test'
      };
      bob.queens.push(stolenQueen);
      bob.score = stolenQueen.points;
      game.setState(state);
      
      console.log('Bob queens before:', bob.queens.map((q: Queen) => q.name));
      console.log('Bob score before:', bob.score);
      
      // Give Alice a knight
      const knightCard: Card = { id: 'test-knight', type: 'knight' as const, name: 'Knight' };
      alice.hand.push(knightCard);
      game.setState(state);      
      console.log('Alice hand:', alice.hand.map((c: Card) => `${c.type}-${c.name || c.value}`));
      
      // Create knight move
      const move: GameMove = {
        type: 'play_knight',
        playerId: 'alice',
        cards: [knightCard],
        targetCard: stolenQueen,
        targetPlayer: 'bob',
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      console.log('Knight move result:', result);
      
      expect(result.isValid).toBe(true);
      
      // Knight attack creates a pending attack that needs to be completed
      // (simulating timeout or no dragon defense by allowing the attack)
      const allowMove: GameMove = {
        type: 'allow_knight_attack',
        playerId: 'bob',
        timestamp: Date.now()
      };
      game.playMove(allowMove);
      
      // Verify the theft
      const newState = game.getState();
      const updatedAlice = newState.players.find((p: any) => p.id === 'alice');
      const updatedBob = newState.players.find((p: any) => p.id === 'bob');
      
      console.log('Alice queens after:', updatedAlice.queens.map((q: Queen) => q.name));
      console.log('Alice score after:', updatedAlice.score);
      console.log('Bob queens after:', updatedBob.queens.length);
      console.log('Bob score after:', updatedBob.score);
      
      expect(updatedAlice.queens).toHaveLength(1);
      expect(updatedAlice.queens[0].name).toBe('Test Queen');
      expect(updatedAlice.score).toBe(20);
      expect(updatedBob.queens).toHaveLength(0);
      expect(updatedBob.score).toBe(0);
    });
  });

  describe('Jester Card - Deck Reveal', () => {
    test('should reveal number card and let target player wake queen', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      console.log('=== JESTER FLOW TEST ===');
      
      // Give Alice a jester
      const jesterCard: Card = { id: 'test-jester', type: 'jester' as const, name: 'Jester' };
      alice.hand.push(jesterCard);
      game.setState(state);      
      // Force a known card to the top of the deck (deck.pop() draws from end)
      const numberCard: NumberCard = { id: 'num-2', type: 'number' as const, name: '2', value: 2 };
      state.deck.push(numberCard);
      game.setState(state);      
      console.log('Deck top card:', state.deck[state.deck.length - 1].type, (state.deck[state.deck.length - 1] as any).value || state.deck[state.deck.length - 1].name);
      console.log('Sleeping queens before:', state.sleepingQueens.length);
      
      const move: GameMove = {
        type: 'play_jester',
        playerId: 'alice',
        cards: [jesterCard],
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      console.log('Jester move result:', result);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('2!');
      expect(result.message).toContain('gets to wake a queen');
      
      const newState = game.getState();
      
      // Should be waiting for queen selection
      expect(newState.jesterReveal).toBeDefined();
      expect(newState.jesterReveal.waitingForQueenSelection).toBe(true);
      // Counting starts at 1 (yourself), so value 2 = next player
      // With 2 players: (0 + 2 - 1) % 2 = 1 (Bob)
      expect(newState.jesterReveal.targetPlayerId).toBe('bob');
      
      console.log('Jester reveal state:', newState.jesterReveal);
    });
    
    test('should reveal action card and let player keep it', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      // Give Alice a jester
      const jesterCard: Card = { id: 'test-jester', type: 'jester' as const, name: 'Jester' };
      alice.hand.push(jesterCard);
      game.setState(state);      
      // Force an action card to the top (deck.pop() draws from end)
      const kingCard: Card = { id: 'revealed-king', type: 'king' as const, name: 'King' };
      state.deck.push(kingCard);
      game.setState(state);      
      const initialHandSize = alice.hand.length;
      
      const move: GameMove = {
        type: 'play_jester',
        playerId: 'alice',
        cards: [jesterCard],
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('King');
      expect(result.message).toContain('keeps it and plays again');
      
      const newState = game.getState();
      const updatedAlice = newState.players[0];
      
      // Should have the revealed king in hand
      expect(updatedAlice.hand.some((c: Card) => c.id === 'revealed-king')).toBe(true);
      // Turn should NOT advance (player plays again)
      expect(newState.currentPlayerIndex).toBe(0);
    });
  });

  describe('Math Equation', () => {
    test('should complete math equation flow', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      console.log('=== MATH FLOW TEST ===');
      
      // Give Alice number cards for a valid equation
      const card1: NumberCard = { id: 'num1', type: 'number' as const, name: '1', value: 1 };
      const card2: NumberCard = { id: 'num2', type: 'number' as const, name: '2', value: 2 };
      const card3: NumberCard = { id: 'num3', type: 'number' as const, name: '3', value: 3 };
      
      alice.hand = [card1, card2, card3];
      game.setState(state);      
      const move: GameMove = {
        type: 'play_math',
        playerId: 'alice',
        cards: [card1, card2, card3],
        mathEquation: {
          cards: [card1, card2, card3],
          equation: '1 + 2 = 3',
          result: 3
        },
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(true);

      const newState = game.getState();
      const updatedAlice = newState.players[0];

      // Should have drawn replacement cards to maintain hand size of 5
      expect(updatedAlice.hand.length).toBe(5);
      // None of the original cards should remain
      expect(updatedAlice.hand.every((c: Card) => !['num1', 'num2', 'num3'].includes(c.id))).toBe(true);
      // Turn should advance
      expect(newState.currentPlayerIndex).toBe(1);
    });
  });

  describe('Discard Mechanics', () => {
    test('should discard single card and draw replacement', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      const originalHand = [...alice.hand];
      const cardToDiscard = [originalHand[0]]; // Just one card
      
      console.log('=== SINGLE DISCARD TEST ===');
      console.log('Original hand:', originalHand.map(c => `${c.type}-${c.name || c.value}`));
      console.log('Discarding:', cardToDiscard.map(c => `${c.type}-${c.name || c.value}`));
      
      const move: GameMove = {
        type: 'discard',
        playerId: 'alice',
        cards: cardToDiscard,
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(true);
      
      const newState = game.getState();
      const updatedAlice = newState.players[0];
      
      console.log('New hand:', updatedAlice.hand.map((c: Card) => `${c.type}-${c.name || c.value}`));
      console.log('Discard pile size:', newState.discardPile.length);
      
      // Hand should still be 5 cards
      expect(updatedAlice.hand).toHaveLength(5);
      // Discarded card should not be in hand
      expect(updatedAlice.hand.every((c: Card) => c.id !== cardToDiscard[0].id)).toBe(true);
      // Turn should advance
      expect(newState.currentPlayerIndex).toBe(1);
    });
    
    test('should discard pair of identical number cards', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      // Give Alice two identical number cards
      const pairCard1: NumberCard = { id: 'pair1', type: 'number' as const, name: '7', value: 7 };
      const pairCard2: NumberCard = { id: 'pair2', type: 'number' as const, name: '7', value: 7 };
      alice.hand = [pairCard1, pairCard2, ...alice.hand.slice(2)];
      game.setState(state);      
      console.log('=== PAIR DISCARD TEST ===');
      console.log('Discarding pair:', [pairCard1, pairCard2].map(c => `${c.type}-${c.value}`));
      
      const move: GameMove = {
        type: 'discard',
        playerId: 'alice',
        cards: [pairCard1, pairCard2],
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      if (!result.isValid) {
        console.log('Pair discard failed:', result.error);
      }
      expect(result.isValid).toBe(true);
      
      const newState = game.getState();
      const updatedAlice = newState.players[0];
      
      // Hand should still be 5 cards
      expect(updatedAlice.hand).toHaveLength(5);
      // Turn should advance
      expect(newState.currentPlayerIndex).toBe(1);
    });
    
    test('should reject invalid discard combinations', () => {
      const state = game.getState();
      const alice = state.players[0];
      
      // Try to discard 2 different action cards (should fail)
      const invalidCards = alice.hand.slice(0, 2).filter((c: Card) => c.type !== 'number');
      
      if (invalidCards.length >= 2) {
        const move: GameMove = {
          type: 'discard',
          playerId: 'alice',
          cards: invalidCards,
          timestamp: Date.now()
        };
        
        const result = game.playMove(move);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Can only discard pairs of number cards');
      }
    });
  });

  describe('Error Cases', () => {
    test('should fail when player does not have the cards they claim to play', () => {
      const fakeCard: Card = { id: 'fake', type: 'king' as const, name: 'Fake King' };
      
      const move: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [fakeCard],
        targetCard: game.getState().sleepingQueens[0],
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined(); // Will fail because card not in hand or wrong type
    });
    
    test('should fail when it is not the player turn', () => {
      const state = game.getState();
      const bob = state.players[1];
      
      // Give Bob a king but it's Alice's turn
      const kingCard: Card = { id: 'bob-king', type: 'king' as const, name: 'King' };
      bob.hand.push(kingCard);
      game.setState(state);      
      const move: GameMove = {
        type: 'play_king',
        playerId: 'bob', // Not Bob's turn!
        cards: [kingCard],
        targetCard: state.sleepingQueens[0],
        timestamp: Date.now()
      };
      
      const result = game.playMove(move);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Not your turn');
    });
  });

  describe('Game Flow Validation', () => {
    test('should maintain proper game state through multiple moves', () => {
      let state = game.getState();
      
      // Move 1: Alice plays a king
      const alice = state.players[0];
      const kingCard: Card = { id: 'king1', type: 'king' as const, name: 'King' };
      alice.hand.push(kingCard);
      game.setState(state);      
      let move: GameMove = {
        type: 'play_king',
        playerId: 'alice',
        cards: [kingCard],
        targetCard: state.sleepingQueens[0],
        timestamp: Date.now()
      };
      
      let result = game.playMove(move);
      expect(result.isValid).toBe(true);
      
      state = game.getState();
      expect(state.currentPlayerIndex).toBe(1); // Bob's turn
      
      // Move 2: Bob discards a card
      const bob = state.players[1];
      const cardToDiscard = bob.hand[0];
      
      move = {
        type: 'discard',
        playerId: 'bob',
        cards: [cardToDiscard],
        timestamp: Date.now()
      };
      
      result = game.playMove(move);
      expect(result.isValid).toBe(true);
      
      state = game.getState();
      expect(state.currentPlayerIndex).toBe(0); // Back to Alice
      
      // Verify state consistency
      expect(state.players[0].queens).toHaveLength(1); // Alice has her queen
      expect(state.players[0].hand).toHaveLength(5); // Hands are refilled
      expect(state.players[1].hand).toHaveLength(5);
      expect(state.sleepingQueens).toHaveLength(11); // One queen woken up
      expect(state.discardPile.length).toBeGreaterThan(0); // Cards have been discarded
    });
  });
});