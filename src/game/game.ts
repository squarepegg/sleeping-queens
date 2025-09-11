import { 
  GameState, 
  Player, 
  Card, 
  Queen, 
  NumberCard, 
  GameMove, 
  MoveValidationResult,
  GameConfig
} from './types';

import { 
  createDeck, 
  shuffleDeck, 
  createSleepingQueens, 
  GAME_CONFIG 
} from './cards';

import {
  generateGameId,
  generateRoomCode,
  calculatePlayerScore,
  checkWinCondition,
  getNextPlayerIndex,
  getCurrentPlayer,
  getPlayerById,
  canPlayerDrawCards,
  needsToDiscardCards,
  validateKingMove,
  validateKnightMove,
  validateDragonMove,
  validateWandMove,
  validatePotionMove,
  validateMathMove,
  validateDiscardMove,
} from './utils';

export class SleepingQueensGame {
  private gameState: GameState;
  private pendingKnightAttack: {
    attacker: string;
    target: string;
    targetQueen: Queen;
    timestamp: number;
  } | null = null;

  constructor(initialState?: Partial<GameState>) {
    this.gameState = {
      id: initialState?.id || generateGameId(),
      players: initialState?.players || [],
      currentPlayerIndex: initialState?.currentPlayerIndex || 0,
      sleepingQueens: initialState?.sleepingQueens || createSleepingQueens(),
      deck: initialState?.deck || shuffleDeck(createDeck()),
      discardPile: initialState?.discardPile || [],
      phase: initialState?.phase || 'waiting',
      winner: initialState?.winner || null,
      createdAt: initialState?.createdAt || Date.now(),
      updatedAt: Date.now(),
      roomCode: initialState?.roomCode || generateRoomCode(),
      maxPlayers: initialState?.maxPlayers || GAME_CONFIG.maxPlayers,
    };
  }

  getState(): GameState {
    return JSON.parse(JSON.stringify(this.gameState));
  }

  addPlayer(player: Omit<Player, 'hand' | 'queens' | 'score'>): boolean {
    if (this.gameState.players.length >= this.gameState.maxPlayers) {
      return false;
    }

    if (this.gameState.phase !== 'waiting') {
      return false;
    }

    const existingPlayer = this.gameState.players.find(p => p.id === player.id);
    if (existingPlayer) {
      return false;
    }

    const newPlayer: Player = {
      ...player,
      hand: [],
      queens: [],
      score: 0,
      position: this.gameState.players.length,
    };

    this.gameState.players.push(newPlayer);
    this.gameState.updatedAt = Date.now();
    
    return true;
  }

  removePlayer(playerId: string): boolean {
    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return false;

    this.gameState.players.splice(playerIndex, 1);
    
    // Adjust current player index if necessary
    if (this.gameState.currentPlayerIndex >= this.gameState.players.length) {
      this.gameState.currentPlayerIndex = 0;
    }
    
    // Update positions
    this.gameState.players.forEach((player, index) => {
      player.position = index;
    });

    this.gameState.updatedAt = Date.now();
    
    // End game if not enough players
    if (this.gameState.players.length < GAME_CONFIG.minPlayers && this.gameState.phase === 'playing') {
      this.gameState.phase = 'ended';
    }

    return true;
  }

  startGame(): boolean {
    if (this.gameState.players.length < GAME_CONFIG.minPlayers) {
      return false;
    }

    if (this.gameState.phase !== 'waiting') {
      return false;
    }

    // Deal initial hands
    for (const player of this.gameState.players) {
      for (let i = 0; i < GAME_CONFIG.initialHandSize; i++) {
        const card = this.drawCard();
        if (card) {
          player.hand.push(card);
        }
      }
    }

    this.gameState.phase = 'playing';
    this.gameState.updatedAt = Date.now();
    
    return true;
  }

  playMove(move: GameMove): MoveValidationResult {
    const validation = this.validateMove(move);
    if (!validation.isValid) {
      return validation;
    }

    switch (move.type) {
      case 'play_king':
        return this.executeKingMove(move);
      case 'play_knight':
        return this.executeKnightMove(move);
      case 'play_dragon':
        return this.executeDragonMove(move);
      case 'play_wand':
        return this.executeWandMove(move);
      case 'play_potion':
        return this.executePotionMove(move);
      case 'play_math':
        return this.executeMathMove(move);
      case 'play_jester':
        return this.executeJesterMove(move);
      case 'discard':
        return this.executeDiscardMove(move);
      default:
        return { isValid: false, error: 'Unknown move type' };
    }
  }

  private validateMove(move: GameMove): MoveValidationResult {
    if (this.gameState.phase !== 'playing') {
      return { isValid: false, error: 'Game is not in playing phase' };
    }

    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Check if it's the player's turn
    if (this.gameState.players[this.gameState.currentPlayerIndex]?.id !== move.playerId) {
      return { isValid: false, error: 'Not your turn' };
    }

    switch (move.type) {
      case 'play_king':
        if (!move.targetCard || move.targetCard.type !== 'queen') {
          return { isValid: false, error: 'Invalid target queen for king move' };
        }
        // Check if player has the specific cards they claim to play
        for (const card of move.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id);
          if (!hasCard) {
            return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
          }
        }
        // Check if they're playing exactly one king
        if (move.cards.length !== 1 || move.cards[0].type !== 'king') {
          return { isValid: false, error: 'Must play exactly one king card' };
        }
        // Check if target queen is sleeping
        const queenExists = this.gameState.sleepingQueens.some(q => q.id === move.targetCard!.id);
        if (!queenExists) {
          return { isValid: false, error: 'Target queen not found in sleeping queens' };
        }
        return { isValid: true };
      
      case 'play_knight':
        if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
          return { isValid: false, error: 'Invalid target for knight move' };
        }
        const targetPlayer = this.gameState.players.find(p => p.id === move.targetPlayer);
        if (!targetPlayer) {
          return { isValid: false, error: 'Target player not found' };
        }
        // Check if player has the specific cards they claim to play
        for (const card of move.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id);
          if (!hasCard) {
            return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
          }
        }
        // Check if they're playing exactly one knight
        if (move.cards.length !== 1 || move.cards[0].type !== 'knight') {
          return { isValid: false, error: 'Must play exactly one knight card' };
        }
        // Check if target player has the queen
        const hasTargetQueen = targetPlayer.queens.some(q => q.id === move.targetCard!.id);
        if (!hasTargetQueen) {
          return { isValid: false, error: 'Target player does not have this queen' };
        }
        return { isValid: true };
      
      case 'play_dragon':
        // Can only play dragon to block knight attack
        if (!this.pendingKnightAttack || this.pendingKnightAttack.target !== move.playerId) {
          return { isValid: false, error: 'No knight attack to block' };
        }
        const hasDragon = player.hand.some(card => card.type === 'dragon');
        if (!hasDragon) {
          return { isValid: false, error: 'No dragon in hand' };
        }
        return { isValid: true };
      
      case 'play_wand':
        if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
          return { isValid: false, error: 'Invalid target for wand move' };
        }
        const wandTargetPlayer = this.gameState.players.find(p => p.id === move.targetPlayer);
        if (!wandTargetPlayer) {
          return { isValid: false, error: 'Target player not found' };
        }
        const hasWand = player.hand.some(card => card.type === 'wand');
        if (!hasWand) {
          return { isValid: false, error: 'No wand in hand' };
        }
        const targetHasQueen = wandTargetPlayer.queens.some(q => q.id === move.targetCard!.id);
        if (!targetHasQueen) {
          return { isValid: false, error: 'Target player does not have this queen' };
        }
        return { isValid: true };
      
      case 'play_potion':
        if (!move.targetCard || move.targetCard.type !== 'queen') {
          return { isValid: false, error: 'Invalid target queen for potion move' };
        }
        const hasPotion = player.hand.some(card => card.type === 'potion');
        if (!hasPotion) {
          return { isValid: false, error: 'No potion in hand' };
        }
        const playerHasQueen = player.queens.some(q => q.id === move.targetCard!.id);
        if (!playerHasQueen) {
          return { isValid: false, error: 'You do not have this queen' };
        }
        return { isValid: true };
      
      case 'play_jester':
        // Check if player has a jester
        const hasJester = player.hand.some(card => card.type === 'jester');
        if (!hasJester) {
          return { isValid: false, error: 'No jester in hand' };
        }
        return { isValid: true };
      
      case 'play_math':
        if (!move.mathEquation || !move.mathEquation.cards || move.mathEquation.cards.length < 3) {
          return { isValid: false, error: 'Invalid math equation' };
        }
        // Check if player has all the cards
        for (const card of move.mathEquation.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id);
          if (!hasCard) {
            return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
          }
        }
        // For now, just verify it's a valid equation format (simplified)
        return { isValid: true };
      
      case 'discard':
        if (!move.cards || move.cards.length === 0) {
          return { isValid: false, error: 'No cards to discard' };
        }
        
        // Check if player has all the cards they claim to discard
        for (const card of move.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id);
          if (!hasCard) {
            return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
          }
        }
        
        // Validate discard rules: 1 card, 2 identical numbers, or 3+ equation
        const cardCount = move.cards.length;
        
        if (cardCount === 1) {
          // Rule 1: Single card discard (any card type) - always allowed
          return { isValid: true };
        } else if (cardCount === 2) {
          // Rule 2: Pair of identical number cards
          const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
          if (numberCards.length !== 2) {
            return { isValid: false, error: 'Can only discard pairs of number cards' };
          }
          if (numberCards[0].value !== numberCards[1].value) {
            return { isValid: false, error: 'Pair must be identical number cards' };
          }
          return { isValid: true };
        } else if (cardCount >= 3) {
          // Rule 3: Math equation with 3+ number cards
          const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
          if (numberCards.length !== cardCount) {
            return { isValid: false, error: 'Math equations must use only number cards' };
          }
          
          // Validate that the numbers form a valid addition equation
          const numbers = numberCards.map(card => card.value).sort((a, b) => a - b);
          
          if (!this.isValidAdditionEquation(numbers)) {
            return { isValid: false, error: `Numbers ${numbers.join(', ')} do not form a valid addition equation` };
          }
          
          return { isValid: true };
        } else {
          return { isValid: false, error: 'Invalid discard: use 1 card, 2 identical numbers, or 3+ for equation' };
        }
      
      default:
        return { isValid: false, error: 'Unknown move type' };
    }
  }

  private executeKingMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player || !move.targetCard) {
      return { isValid: false, error: 'Invalid king move' };
    }

    // Remove king from hand
    const kingIndex = player.hand.findIndex(card => card.type === 'king');
    if (kingIndex === -1) {
      return { isValid: false, error: 'No king in hand' };
    }

    const king = player.hand.splice(kingIndex, 1)[0];
    this.gameState.discardPile.push(king);

    // Wake up the queen
    const queenIndex = this.gameState.sleepingQueens.findIndex(q => q.id === move.targetCard!.id);
    if (queenIndex === -1) {
      return { isValid: false, error: 'Queen not found' };
    }

    const queen = this.gameState.sleepingQueens.splice(queenIndex, 1)[0];
    queen.isAwake = true;
    player.queens.push(queen);
    player.score = calculatePlayerScore(player);

    this.refillHand(player);
    this.advanceTurn();
    this.checkGameEnd();

    return { isValid: true };
  }

  private executeKnightMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    const targetPlayer = move.targetPlayer ? this.gameState.players.find(p => p.id === move.targetPlayer) : null;
    
    if (!player || !targetPlayer || !move.targetCard) {
      return { isValid: false, error: 'Invalid knight move' };
    }

    // Check if target queen exists
    const queenIndex = targetPlayer.queens.findIndex(q => q.id === move.targetCard!.id);
    if (queenIndex === -1) {
      return { isValid: false, error: 'Target queen not found' };
    }

    // Check if target has a dragon to potentially block
    const targetHasDragon = targetPlayer.hand.some(card => card.type === 'dragon');
    
    // Create pending attack (either to be blocked or completed immediately)
    this.pendingKnightAttack = {
      attacker: move.playerId,
      target: targetPlayer.id,
      targetQueen: move.targetCard as Queen,
      timestamp: Date.now()
    };
    
    if (targetHasDragon) {
      // Don't advance turn or complete attack yet - give target player chance to block
      return { isValid: true, requiresResponse: true };
    } else {
      // Target has no dragon, complete attack immediately
      return this.completeKnightAttack();
    }
  }

  private completeKnightAttack(): MoveValidationResult {
    if (!this.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    const attacker = this.gameState.players.find(p => p.id === this.pendingKnightAttack.attacker);
    const target = this.gameState.players.find(p => p.id === this.pendingKnightAttack.target);
    
    if (!attacker || !target) {
      this.pendingKnightAttack = null;
      return { isValid: false, error: 'Player not found' };
    }

    // Remove knight from attacker's hand
    const knightIndex = attacker.hand.findIndex(card => card.type === 'knight');
    if (knightIndex === -1) {
      this.pendingKnightAttack = null;
      return { isValid: false, error: 'No knight in hand' };
    }

    const knight = attacker.hand.splice(knightIndex, 1)[0];
    this.gameState.discardPile.push(knight);

    // Steal the queen
    const queenIndex = target.queens.findIndex(q => q.id === this.pendingKnightAttack!.targetQueen.id);
    if (queenIndex === -1) {
      this.pendingKnightAttack = null;
      return { isValid: false, error: 'Target queen not found' };
    }

    const queen = target.queens.splice(queenIndex, 1)[0];
    attacker.queens.push(queen);
    
    // Recalculate scores
    attacker.score = calculatePlayerScore(attacker);
    target.score = calculatePlayerScore(target);

    this.refillHand(attacker);
    this.advanceTurn();
    this.checkGameEnd();

    this.pendingKnightAttack = null;
    return { isValid: true };
  }

  private executeDragonMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Can only play dragon to block knight attack
    if (!this.pendingKnightAttack || this.pendingKnightAttack.target !== move.playerId) {
      return { isValid: false, error: 'No knight attack to block' };
    }

    // Remove dragon from hand
    const dragonIndex = player.hand.findIndex(card => card.type === 'dragon');
    if (dragonIndex === -1) {
      return { isValid: false, error: 'No dragon in hand' };
    }

    const dragon = player.hand.splice(dragonIndex, 1)[0];
    this.gameState.discardPile.push(dragon);

    // Block the attack
    this.pendingKnightAttack = null;
    
    this.refillHand(player);
    
    // Turn continues with the original attacker
    return { isValid: true };
  }

  private executeWandMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    const targetPlayer = move.targetPlayer ? this.gameState.players.find(p => p.id === move.targetPlayer) : null;
    
    if (!player || !targetPlayer || !move.targetCard) {
      return { isValid: false, error: 'Invalid wand move' };
    }

    // Remove wand from hand
    const wandIndex = player.hand.findIndex(card => card.type === 'wand');
    if (wandIndex === -1) {
      return { isValid: false, error: 'No wand in hand' };
    }

    const wand = player.hand.splice(wandIndex, 1)[0];
    this.gameState.discardPile.push(wand);

    // Put queen back to sleep
    const queenIndex = targetPlayer.queens.findIndex(q => q.id === move.targetCard!.id);
    if (queenIndex === -1) {
      return { isValid: false, error: 'Target queen not found' };
    }

    const queen = targetPlayer.queens.splice(queenIndex, 1)[0];
    queen.isAwake = false;
    this.gameState.sleepingQueens.push(queen);
    
    targetPlayer.score = calculatePlayerScore(targetPlayer);

    this.refillHand(player);
    this.advanceTurn();
    this.checkGameEnd();

    return { isValid: true };
  }

  private executePotionMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player || !move.targetCard) {
      return { isValid: false, error: 'Invalid potion move' };
    }

    // Remove potion from hand
    const potionIndex = player.hand.findIndex(card => card.type === 'potion');
    if (potionIndex === -1) {
      return { isValid: false, error: 'No potion in hand' };
    }

    const potion = player.hand.splice(potionIndex, 1)[0];
    this.gameState.discardPile.push(potion);

    // Put own queen back to sleep
    const queenIndex = player.queens.findIndex(q => q.id === move.targetCard!.id);
    if (queenIndex === -1) {
      return { isValid: false, error: 'Target queen not found' };
    }

    const queen = player.queens.splice(queenIndex, 1)[0];
    queen.isAwake = false;
    this.gameState.sleepingQueens.push(queen);
    
    player.score = calculatePlayerScore(player);

    this.refillHand(player);
    this.advanceTurn();
    this.checkGameEnd();

    return { isValid: true };
  }

  private executeMathMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player || !move.mathEquation) {
      return { isValid: false, error: 'Invalid math move' };
    }

    // Remove cards from hand
    for (const card of move.mathEquation.cards) {
      const cardIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      if (cardIndex === -1) {
        return { isValid: false, error: `Card ${card.name} not found in hand` };
      }
      const removedCard = player.hand.splice(cardIndex, 1)[0];
      this.gameState.discardPile.push(removedCard);
    }

    // Draw replacement cards (same number as discarded)
    const cardsToReplace = move.mathEquation.cards.length;
    for (let i = 0; i < cardsToReplace; i++) {
      const newCard = this.drawCard();
      if (newCard) {
        player.hand.push(newCard);
      }
    }

    this.advanceTurn();
    return { isValid: true };
  }

  private executeJesterMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // If this is a queen selection after jester reveal
    if (this.gameState.jesterReveal && move.targetCard) {
      return this.completeJesterQueenSelection(move);
    }

    // Remove jester from hand
    const jesterIndex = player.hand.findIndex(card => card.type === 'jester');
    if (jesterIndex === -1) {
      return { isValid: false, error: 'No jester in hand' };
    }

    const jester = player.hand.splice(jesterIndex, 1)[0];
    this.gameState.discardPile.push(jester);

    // Draw a card to reveal
    const revealedCard = this.drawCard();
    if (!revealedCard) {
      return { isValid: false, error: 'No cards left in deck' };
    }

    // Check what type of card was revealed
    if (revealedCard.type === 'number') {
      // Number card: Count around the table
      const numberValue = (revealedCard as NumberCard).value || 1;
      const currentPlayerIndex = this.gameState.players.findIndex(p => p.id === move.playerId);
      
      // Count starting from current player (count includes the current player)
      const targetPlayerIndex = (currentPlayerIndex + numberValue - 1) % this.gameState.players.length;
      const targetPlayer = this.gameState.players[targetPlayerIndex];
      
      // Discard the revealed number card
      this.gameState.discardPile.push(revealedCard);
      
      // The target player gets to wake up a queen (if there are any sleeping)
      if (this.gameState.sleepingQueens.length > 0) {
        // Store the jester reveal info for the target player to select a queen
        this.gameState.jesterReveal = {
          revealedCard,
          targetPlayerId: targetPlayer.id,
          waitingForQueenSelection: true
        };
        
        // Don't advance turn yet - waiting for queen selection
        this.refillHand(player);
        return { 
          isValid: true, 
          message: `Jester revealed ${numberValue}! ${targetPlayer.name} gets to wake a queen.`
        };
      }
      
    } else {
      // Picture/Action card: Player keeps it and gets another turn
      player.hand.push(revealedCard);
      
      // Don't advance turn - player gets to go again
      this.refillHand(player);
      return { 
        isValid: true,
        message: `Jester revealed a ${revealedCard.type}! You keep it and play again.`
      };
    }

    // Refill hand and advance turn
    this.refillHand(player);
    this.advanceTurn();
    return { isValid: true };
  }

  private completeJesterQueenSelection(move: GameMove): MoveValidationResult {
    if (!this.gameState.jesterReveal || !move.targetCard) {
      return { isValid: false, error: 'No jester queen selection pending' };
    }

    // Verify it's the correct player's turn to select
    if (move.playerId !== this.gameState.jesterReveal.targetPlayerId) {
      return { isValid: false, error: 'Not your turn to select a queen' };
    }

    // Find and wake the selected queen
    const queenIndex = this.gameState.sleepingQueens.findIndex(q => q.id === move.targetCard!.id);
    if (queenIndex === -1) {
      return { isValid: false, error: 'Selected queen not found' };
    }

    const queen = this.gameState.sleepingQueens.splice(queenIndex, 1)[0];
    const targetPlayer = this.gameState.players.find(p => p.id === move.playerId);
    
    if (!targetPlayer) {
      return { isValid: false, error: 'Player not found' };
    }

    queen.isAwake = true;
    targetPlayer.queens.push(queen);
    targetPlayer.score = calculatePlayerScore(targetPlayer);

    // Clear jester reveal state
    delete this.gameState.jesterReveal;

    // Now advance the turn
    this.advanceTurn();
    this.checkGameEnd();

    return { isValid: true };
  }

  private executeDiscardMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Remove cards from hand
    for (const card of move.cards) {
      const cardIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      if (cardIndex === -1) {
        return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
      }
      const removedCard = player.hand.splice(cardIndex, 1)[0];
      this.gameState.discardPile.push(removedCard);
    }

    // Draw replacement cards
    for (let i = 0; i < move.cards.length; i++) {
      const newCard = this.drawCard();
      if (newCard) {
        player.hand.push(newCard);
      }
    }

    this.advanceTurn();
    return { isValid: true };
  }

  private isValidAdditionEquation(numbers: number[]): boolean {
    if (numbers.length < 3) return false;
    
    // For each potential result number, check if other numbers can add up to it
    // Example: [2, 3, 5] -> check if 2+3=5 ✓, or 2+5=3 ✗, or 3+5=2 ✗
    
    for (let i = 0; i < numbers.length; i++) {
      const target = numbers[i];
      const otherNumbers = numbers.filter((_, index) => index !== i);
      
      // Check if the sum of other numbers equals the target
      const sum = otherNumbers.reduce((acc, num) => acc + num, 0);
      if (sum === target) {
        return true;
      }
    }
    
    return false;
  }

  private drawCard(): Card | null {
    if (this.gameState.deck.length === 0) {
      // Shuffle discard pile back into deck (keep one card in discard)
      if (this.gameState.discardPile.length <= 1) {
        return null;
      }
      
      const lastCard = this.gameState.discardPile.pop()!;
      this.gameState.deck = shuffleDeck([...this.gameState.discardPile]);
      this.gameState.discardPile = [lastCard];
    }
    
    return this.gameState.deck.pop() || null;
  }

  private refillHand(player: Player): void {
    while (player.hand.length < GAME_CONFIG.maxHandSize) {
      const card = this.drawCard();
      if (!card) break;
      player.hand.push(card);
    }
  }

  private advanceTurn(): void {
    this.gameState.currentPlayerIndex = getNextPlayerIndex(this.gameState);
    this.gameState.updatedAt = Date.now();
  }

  private checkGameEnd(): void {
    const winner = checkWinCondition(this.gameState);
    if (winner) {
      this.gameState.winner = winner.id;
      this.gameState.phase = 'ended';
    }
  }

  isValidMove(move: GameMove): MoveValidationResult {
    return this.validateMove(move);
  }

  getCurrentTurnPlayer(): Player | null {
    if (this.gameState.players.length === 0) return null;
    return this.gameState.players[this.gameState.currentPlayerIndex] || null;
  }

  canPlayerPlayDragon(playerId: string): boolean {
    return this.pendingKnightAttack?.target === playerId;
  }

  getPendingKnightAttack() {
    return this.pendingKnightAttack;
  }

  blockKnightAttack(playerId: string): MoveValidationResult {
    return this.executeDragonMove({
      type: 'play_dragon',
      playerId,
      cards: [],
      timestamp: Date.now(),
    });
  }

  allowKnightAttack(): MoveValidationResult {
    return this.completeKnightAttack();
  }

  // For testing purposes - allows direct access to internal state
  getInternalState(): GameState {
    return this.gameState;
  }
}