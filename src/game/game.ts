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
  private static readonly DEFENSE_WINDOW_MS = 5000; // 5 seconds to decide

  constructor(initialState?: Partial<GameState>) {
    this.gameState = {
      id: initialState?.id || generateGameId(),
      players: initialState?.players || [],
      currentPlayerIndex: initialState?.currentPlayerIndex || 0,
      currentPlayerId: initialState?.currentPlayerId || null,
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

    // Set first player as current player by ID
    this.gameState.currentPlayerId = this.gameState.players[0]?.id || null;
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
      case 'stage_card':
        return this.executeStagingMove(move);
      default:
        return { isValid: false, error: 'Unknown move type' };
    }
  }

  public validateMove(move: GameMove): MoveValidationResult {
    if (this.gameState.phase !== 'playing') {
      return { isValid: false, error: 'Game is not in playing phase' };
    }

    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Check if it's the player's turn using direct ID comparison
    console.log('Server turn validation:', {
      currentPlayerId: this.gameState.currentPlayerId,
      movePlayerId: move.playerId,
      movePlayerName: player.name,
      isPlayerTurn: this.gameState.currentPlayerId === move.playerId
    });

    if (this.gameState.currentPlayerId !== move.playerId) {
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
        if (!this.gameState.pendingKnightAttack || this.gameState.pendingKnightAttack.target !== move.playerId) {
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
        const wandTargetHasQueen = wandTargetPlayer.queens.some(q => q.id === move.targetCard!.id);
        if (!wandTargetHasQueen) {
          return { isValid: false, error: 'Target player does not have this queen' };
        }
        return { isValid: true };
      
      case 'play_potion':
        if (!move.targetPlayer || !move.targetCard || move.targetCard.type !== 'queen') {
          return { isValid: false, error: 'Invalid target for potion move' };
        }
        const potionTargetPlayer = this.gameState.players.find(p => p.id === move.targetPlayer);
        if (!potionTargetPlayer) {
          return { isValid: false, error: 'Target player not found' };
        }
        const hasPotion = player.hand.some(card => card.type === 'potion');
        if (!hasPotion) {
          return { isValid: false, error: 'No potion in hand' };
        }
        const potionTargetHasQueen = potionTargetPlayer.queens.some(q => q.id === move.targetCard!.id);
        if (!potionTargetHasQueen) {
          return { isValid: false, error: 'Target player does not have this queen' };
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
      
      case 'stage_card':
        if (!move.cards || move.cards.length === 0) {
          return { isValid: false, error: 'Must stage at least one card' };
        }
        
        // Validate that player has all cards
        for (const card of move.cards) {
          const hasCard = player.hand.some(handCard => handCard.id === card.id);
          if (!hasCard) {
            return { isValid: false, error: `Card ${card.name || card.type} not found in hand` };
          }
        }
        
        // Use the same validation as discard (since staging is for discards or actions)
        if (move.cards.length === 1) {
          // Single card: action card for play or any card for discard
          return { isValid: true };
        } else if (move.cards.length === 2) {
          // Pair: must be identical number cards
          const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
          if (numberCards.length !== 2) {
            return { isValid: false, error: 'Can only stage pairs of number cards' };
          }
          if (numberCards[0].value !== numberCards[1].value) {
            return { isValid: false, error: 'Staged pair must be identical number cards' };
          }
          return { isValid: true };
        } else if (move.cards.length >= 3) {
          // Equation: must be all number cards forming valid equation
          const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
          if (numberCards.length !== move.cards.length) {
            return { isValid: false, error: 'Math equations must use only number cards' };
          }
          
          // Validate equation (reuse discard validation logic)
          const numbers = numberCards.map(c => c.value || 0).sort((a, b) => a - b);
          if (numbers.length < 3) {
            return { isValid: false, error: 'Math equations require at least 3 cards' };
          }
          
          // Check if it forms a valid addition equation (a + b = c where c is largest)
          const largest = numbers[numbers.length - 1];
          const remaining = numbers.slice(0, -1);
          const sum = remaining.reduce((acc, num) => acc + num, 0);
          
          if (sum !== largest) {
            return { isValid: false, error: `Numbers ${numbers.join(', ')} do not form a valid addition equation` };
          }
          
          return { isValid: true };
        } else {
          return { isValid: false, error: 'Invalid number of cards for staging' };
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

    // Clear staged card after successful move
    this.gameState.stagedCard = undefined;

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
    
    // Create pending attack with defense deadline
    const now = Date.now();
    this.gameState.pendingKnightAttack = {
      attacker: move.playerId,
      target: targetPlayer.id,
      targetQueen: move.targetCard as Queen,
      timestamp: now,
      defenseDeadline: now + SleepingQueensGame.DEFENSE_WINDOW_MS
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
    if (!this.gameState.pendingKnightAttack) {
      return { isValid: false, error: 'No pending knight attack' };
    }

    const attacker = this.gameState.players.find(p => p.id === this.gameState.pendingKnightAttack!.attacker);
    const target = this.gameState.players.find(p => p.id === this.gameState.pendingKnightAttack!.target);
    
    if (!attacker || !target) {
      this.gameState.pendingKnightAttack = undefined;
      return { isValid: false, error: 'Player not found' };
    }

    // Remove knight from attacker's hand
    const knightIndex = attacker.hand.findIndex(card => card.type === 'knight');
    if (knightIndex === -1) {
      this.gameState.pendingKnightAttack = undefined;
      return { isValid: false, error: 'No knight in hand' };
    }

    const knight = attacker.hand.splice(knightIndex, 1)[0];
    this.gameState.discardPile.push(knight);

    // Steal the queen
    const queenIndex = target.queens.findIndex(q => q.id === this.gameState.pendingKnightAttack!.targetQueen.id);
    if (queenIndex === -1) {
      this.gameState.pendingKnightAttack = undefined;
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

    // Clear staged card after successful move
    this.gameState.stagedCard = undefined;
    this.gameState.pendingKnightAttack = undefined;
    return { isValid: true };
  }

  private executeDragonMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Can only play dragon to block knight attack
    if (!this.gameState.pendingKnightAttack || this.gameState.pendingKnightAttack.target !== move.playerId) {
      return { isValid: false, error: 'No knight attack to block' };
    }

    // Check if defense window has expired
    const now = Date.now();
    if (now >= this.gameState.pendingKnightAttack.defenseDeadline) {
      // Defense window expired - auto-complete the attack
      this.completeKnightAttack();
      return { isValid: false, error: 'Defense window has expired' };
    }

    // Remove dragon from hand
    const dragonIndex = player.hand.findIndex(card => card.type === 'dragon');
    if (dragonIndex === -1) {
      return { isValid: false, error: 'No dragon in hand' };
    }

    const dragon = player.hand.splice(dragonIndex, 1)[0];
    this.gameState.discardPile.push(dragon);

    // Block the attack
    this.gameState.pendingKnightAttack = undefined;
    
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

    // Clear staged card after successful move
    this.gameState.stagedCard = undefined;

    return { isValid: true };
  }

  private executePotionMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    const targetPlayer = move.targetPlayer ? this.gameState.players.find(p => p.id === move.targetPlayer) : null;
    
    if (!player || !targetPlayer || !move.targetCard) {
      return { isValid: false, error: 'Invalid potion move' };
    }

    // Remove potion from hand
    const potionIndex = player.hand.findIndex(card => card.type === 'potion');
    if (potionIndex === -1) {
      return { isValid: false, error: 'No potion in hand' };
    }

    const potion = player.hand.splice(potionIndex, 1)[0];
    this.gameState.discardPile.push(potion);

    // Put target player's queen back to sleep
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

    // Clear staged card after successful move
    this.gameState.stagedCard = undefined;

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

    // Store the jester reveal info so ALL players can see the revealed card
    this.gameState.jesterReveal = {
      revealedCard,
      targetPlayerId: '', // Will be set based on card type
      waitingForQueenSelection: false
    };

    // Check what type of card was revealed
    if (revealedCard.type === 'number') {
      // Number card: Count around the table using round robin
      const numberValue = (revealedCard as NumberCard).value || 1;
      const currentPlayerIndex = this.gameState.players.findIndex(p => p.id === move.playerId);
      
      // Round robin: current player is "1", player to left is "2", etc.
      const targetPlayerIndex = (currentPlayerIndex + numberValue - 1) % this.gameState.players.length;
      const targetPlayer = this.gameState.players[targetPlayerIndex];
      
      // Update jester reveal with the target player
      this.gameState.jesterReveal.targetPlayerId = targetPlayer.id;
      
      // Discard the revealed number card
      this.gameState.discardPile.push(revealedCard);
      
      // The target player gets to wake up a queen (if there are any sleeping)
      if (this.gameState.sleepingQueens.length > 0) {
        this.gameState.jesterReveal.waitingForQueenSelection = true;
        
        // Don't advance turn yet - waiting for queen selection
        this.refillHand(player);
        return { 
          isValid: true, 
          message: `Jester revealed ${numberValue}! ${targetPlayer.name} gets to wake a queen.`
        };
      } else {
        // No sleeping queens, just complete the move
        delete this.gameState.jesterReveal;
        this.refillHand(player);
        this.advanceTurn();
        return { 
          isValid: true, 
          message: `Jester revealed ${numberValue}! But there are no sleeping queens to wake.`
        };
      }
      
    } else {
      // Action card: Player keeps it and gets another turn
      player.hand.push(revealedCard);
      
      // Clear the jester reveal since the card goes to the player's hand
      delete this.gameState.jesterReveal;
      
      // Don't advance turn - player gets to go again
      this.refillHand(player);
      return { 
        isValid: true,
        message: `Jester revealed a ${revealedCard.name || revealedCard.type}! You keep it and play again.`
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

    // Clear staged card after discard completes
    if (this.gameState.stagedCard) {
      this.gameState.stagedCard = undefined;
      this.gameState.updatedAt = Date.now();
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
    const currentPlayerIndex = this.gameState.players.findIndex(p => p.id === this.gameState.currentPlayerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % this.gameState.players.length;
    this.gameState.currentPlayerIndex = nextPlayerIndex; // Keep for backward compatibility
    this.gameState.currentPlayerId = this.gameState.players[nextPlayerIndex]?.id || null;
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
    if (!this.gameState.currentPlayerId) return null;
    return this.gameState.players.find(p => p.id === this.gameState.currentPlayerId) || null;
  }

  canPlayerPlayDragon(playerId: string): boolean {
    return this.gameState.pendingKnightAttack?.target === playerId;
  }

  getPendingKnightAttack() {
    return this.gameState.pendingKnightAttack;
  }

  // Check if defense window has expired and auto-complete attack if so
  checkDefenseWindowExpiration(): boolean {
    const attack = this.gameState.pendingKnightAttack;
    if (!attack) return false;
    
    const now = Date.now();
    if (now >= attack.defenseDeadline) {
      // Defense window expired - complete the attack
      this.completeKnightAttack();
      return true;
    }
    return false;
  }

  getRemainingDefenseTime(): number {
    const attack = this.gameState.pendingKnightAttack;
    if (!attack) return 0;
    
    const remaining = attack.defenseDeadline - Date.now();
    return Math.max(0, remaining);
  }

  blockKnightAttack(playerId: string): MoveValidationResult {
    return this.executeDragonMove({
      type: 'play_dragon',
      playerId,
      cards: [],
      timestamp: Date.now(),
    });
  }

  private executeStagingMove(move: GameMove): MoveValidationResult {
    const player = this.gameState.players.find(p => p.id === move.playerId);
    if (!player) {
      return { isValid: false, error: 'Player not found' };
    }

    // Determine action description
    let action: string;
    let message: string;
    
    if (move.cards.length === 1) {
      const card = move.cards[0];
      const isActionCard = ['king', 'knight', 'potion', 'wand', 'jester'].includes(card.type);
      if (isActionCard) {
        action = `use a ${card.name || card.type}`;
        message = `${card.name || card.type} staged and ready to play`;
      } else {
        action = `discard ${card.name || card.type}`;
        message = `${card.name || card.type} staged for discard`;
      }
    } else if (move.cards.length === 2) {
      const card = move.cards[0];
      action = `discard a pair of ${card.value}s`;
      message = `Pair of ${card.value}s staged for discard`;
    } else {
      // 3+ cards = equation
      const numberCards = move.cards.filter(c => c.type === 'number') as NumberCard[];
      const numbers = numberCards.map(c => c.value || 0).sort((a, b) => a - b);
      const equation = `${numbers.slice(0, -1).join(' + ')} = ${numbers[numbers.length - 1]}`;
      action = `discard equation ${equation}`;
      message = `Equation ${equation} staged for discard`;
    }
    
    // Set the staged cards in the game state
    this.gameState.stagedCard = {
      cards: move.cards,
      playerId: move.playerId,
      action
    };

    this.gameState.updatedAt = Date.now();
    
    return {
      isValid: true,
      message
    };
  }

  allowKnightAttack(): MoveValidationResult {
    // Check if defense window has expired before allowing
    if (this.gameState.pendingKnightAttack) {
      const now = Date.now();
      if (now >= this.gameState.pendingKnightAttack.defenseDeadline) {
        return { isValid: false, error: 'Defense window has already expired' };
      }
    }
    return this.completeKnightAttack();
  }

  // For testing purposes - allows direct access to internal state
  getInternalState(): GameState {
    return this.gameState;
  }
}