import { GameState, Player, Card, Queen, NumberCard, GameMove, MoveValidationResult } from './types';
import { GAME_CONFIG, getCardPoints } from './cards';

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePlayerId(): string {
  // Use crypto.randomUUID if available (modern browsers), fallback to custom implementation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function generateGameId(): string {
  // Use crypto.randomUUID if available (modern browsers), fallback to custom implementation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function calculatePlayerScore(player: Player): number {
  return player.queens.reduce((total, queen) => total + getCardPoints(queen), 0);
}

export function checkWinCondition(gameState: GameState): Player | null {
  const playerCount = gameState.players.length;
  const queensRequired = GAME_CONFIG.queensToWin[playerCount];
  const pointsRequired = GAME_CONFIG.pointsToWin[playerCount];
  
  for (const player of gameState.players) {
    const score = calculatePlayerScore(player);
    
    if (player.queens.length >= queensRequired || score >= pointsRequired) {
      return player;
    }
  }
  
  return null;
}

export function getNextPlayerIndex(gameState: GameState): number {
  return (gameState.currentPlayerIndex + 1) % gameState.players.length;
}

export function getCurrentPlayer(gameState: GameState): Player | null {
  if (gameState.players.length === 0) return null;
  return gameState.players[gameState.currentPlayerIndex] || null;
}

export function getPlayerById(gameState: GameState, playerId: string): Player | null {
  return gameState.players.find(p => p.id === playerId) || null;
}

export function canPlayerDrawCards(player: Player): boolean {
  return player.hand.length < GAME_CONFIG.maxHandSize;
}

export function needsToDiscardCards(player: Player): boolean {
  return player.hand.length > GAME_CONFIG.maxHandSize;
}

export function validateKingMove(gameState: GameState, playerId: string, targetQueen: Queen): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  const hasKing = player.hand.some(card => card.type === 'king');
  if (!hasKing) {
    return { isValid: false, error: 'No king in hand' };
  }
  
  const isQueenSleeping = gameState.sleepingQueens.some(queen => 
    queen.id === targetQueen.id && !queen.isAwake
  );
  if (!isQueenSleeping) {
    return { isValid: false, error: 'Queen is not sleeping' };
  }
  
  return { isValid: true };
}

export function validateKnightMove(gameState: GameState, playerId: string, targetPlayer: Player, targetQueen: Queen): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  const hasKnight = player.hand.some(card => card.type === 'knight');
  if (!hasKnight) {
    return { isValid: false, error: 'No knight in hand' };
  }
  
  if (targetPlayer.id === playerId) {
    return { isValid: false, error: 'Cannot steal from yourself' };
  }
  
  const hasTargetQueen = targetPlayer.queens.some(queen => queen.id === targetQueen.id);
  if (!hasTargetQueen) {
    return { isValid: false, error: 'Target player does not have this queen' };
  }
  
  return { isValid: true };
}

export function validateDragonMove(gameState: GameState, playerId: string): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  const hasDragon = player.hand.some(card => card.type === 'dragon');
  if (!hasDragon) {
    return { isValid: false, error: 'No dragon in hand' };
  }
  
  return { isValid: true };
}

export function validateWandMove(gameState: GameState, playerId: string, targetPlayer: Player, targetQueen: Queen): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  const hasWand = player.hand.some(card => card.type === 'wand');
  if (!hasWand) {
    return { isValid: false, error: 'No wand in hand' };
  }
  
  if (targetPlayer.id === playerId) {
    return { isValid: false, error: 'Cannot use wand on yourself' };
  }
  
  const hasTargetQueen = targetPlayer.queens.some(queen => queen.id === targetQueen.id);
  if (!hasTargetQueen) {
    return { isValid: false, error: 'Target player does not have this queen' };
  }
  
  return { isValid: true };
}

export function validatePotionMove(gameState: GameState, playerId: string, targetQueen: Queen): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  const hasPotion = player.hand.some(card => card.type === 'potion');
  if (!hasPotion) {
    return { isValid: false, error: 'No potion in hand' };
  }
  
  const hasTargetQueen = player.queens.some(queen => queen.id === targetQueen.id);
  if (!hasTargetQueen) {
    return { isValid: false, error: 'You do not have this queen' };
  }
  
  return { isValid: true };
}

export function validateMathMove(gameState: GameState, playerId: string, cards: NumberCard[]): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  if (cards.length < 3) {
    return { isValid: false, error: 'Need at least 3 number cards for math equation' };
  }
  
  // Check if player has all the cards
  for (const card of cards) {
    const hasCard = player.hand.some(handCard => handCard.id === card.id);
    if (!hasCard) {
      return { isValid: false, error: `You don't have card ${card.name}` };
    }
  }
  
  // Validate the math equation
  const values = cards.map(c => c.value || 0);
  
  // Check for valid equations (A + B = C, A - B = C, A * B = C)
  let isValidEquation = false;
  
  for (let i = 0; i < values.length - 1; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const remaining = values.filter((_, idx) => idx !== i && idx !== j);
      
      // Addition
      if (remaining.includes(values[i] + values[j])) {
        isValidEquation = true;
        break;
      }
      
      // Multiplication
      if (remaining.includes(values[i] * values[j])) {
        isValidEquation = true;
        break;
      }
      
      // Subtraction (absolute difference)
      if (remaining.includes(Math.abs(values[i] - values[j]))) {
        isValidEquation = true;
        break;
      }
    }
    if (isValidEquation) break;
  }
  
  if (!isValidEquation) {
    return { isValid: false, error: 'Invalid math equation' };
  }
  
  return { isValid: true };
}

export function validateDiscardMove(gameState: GameState, playerId: string, cards: Card[]): MoveValidationResult {
  const player = getPlayerById(gameState, playerId);
  if (!player) {
    return { isValid: false, error: 'Player not found' };
  }
  
  if (getCurrentPlayer(gameState)?.id !== playerId) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  if (cards.length === 0) {
    return { isValid: false, error: 'Must discard at least one card' };
  }
  
  // Check if player has all the cards
  for (const card of cards) {
    const hasCard = player.hand.some(handCard => handCard.id === card.id);
    if (!hasCard) {
      return { isValid: false, error: `You don't have card ${card.name || card.type}` };
    }
  }
  
  return { isValid: true };
}

export function findMathEquations(cards: NumberCard[]): NumberCard[][] {
  const equations: NumberCard[][] = [];
  const values = cards.map((card, index) => ({ card, value: card.value || 0, index }));
  
  // Find all valid 3-card equations
  for (let i = 0; i < values.length - 2; i++) {
    for (let j = i + 1; j < values.length - 1; j++) {
      for (let k = j + 1; k < values.length; k++) {
        const [a, b, c] = [values[i], values[j], values[k]];
        
        // Check all possible equations
        if (a.value + b.value === c.value || 
            a.value + c.value === b.value || 
            b.value + c.value === a.value ||
            a.value * b.value === c.value ||
            a.value * c.value === b.value ||
            b.value * c.value === a.value ||
            Math.abs(a.value - b.value) === c.value ||
            Math.abs(a.value - c.value) === b.value ||
            Math.abs(b.value - c.value) === a.value) {
          equations.push([a.card, b.card, c.card]);
        }
      }
    }
  }
  
  return equations;
}

export function formatMathEquation(cards: NumberCard[]): string {
  if (cards.length < 3) return '';
  
  const values = cards.map(c => c.value || 0);
  
  // Try to find a valid equation
  for (let i = 0; i < values.length - 1; i++) {
    for (let j = i + 1; j < values.length; j++) {
      const remaining = values.filter((_, idx) => idx !== i && idx !== j);
      
      // Addition
      if (remaining.includes(values[i] + values[j])) {
        return `${values[i]} + ${values[j]} = ${values[i] + values[j]}`;
      }
      
      // Multiplication  
      if (remaining.includes(values[i] * values[j])) {
        return `${values[i]} × ${values[j]} = ${values[i] * values[j]}`;
      }
      
      // Subtraction
      const diff = Math.abs(values[i] - values[j]);
      if (remaining.includes(diff)) {
        return `${Math.max(values[i], values[j])} - ${Math.min(values[i], values[j])} = ${diff}`;
      }
    }
  }
  
  return cards.map(c => c.value).join(' ? ');
}