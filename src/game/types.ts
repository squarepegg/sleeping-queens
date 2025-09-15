export type CardType = 'queen' | 'king' | 'knight' | 'dragon' | 'wand' | 'potion' | 'jester' | 'number';

export interface Card {
  id: string;
  type: CardType;
  value?: number;
  name?: string;
  points?: number;
  description?: string;
  imageUrl?: string;
}

export interface Queen extends Card {
  type: 'queen';
  points: number;
  name: string;
  isAwake: boolean;
}

export interface NumberCard extends Card {
  type: 'number';
  value: number;
}

export interface ActionCard extends Card {
  type: 'king' | 'knight' | 'dragon' | 'wand' | 'potion' | 'jester';
  description: string;
}

export interface Player {
  id: string;
  name: string;
  position: number;
  hand: Card[];
  queens: Queen[];
  isConnected: boolean;
  score: number;
}

export interface GameMove {
  type: 'play_king' | 'play_knight' | 'play_dragon' | 'play_wand' | 'play_potion' | 'play_jester' | 'play_math' | 'play_equation' | 'discard' | 'stage_card';
  playerId: string;
  cards: Card[];
  // Legacy/alternative property names for backwards compatibility
  cardId?: string;
  cardIds?: string[];
  targetCard?: Card;
  targetPlayer?: string;
  // Legacy/alternative property names
  targetQueen?: string;
  targetQueenId?: string;
  targetPlayerId?: string;
  mathEquation?: {
    cards: NumberCard[];
    equation: string;
    result: number;
    left?: number;
    operator?: string;
    right?: number;
  };
  timestamp: number;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  currentPlayerId: string | null;
  sleepingQueens: Queen[];
  deck: Card[];
  discardPile: Card[];
  phase: 'waiting' | 'playing' | 'ended';
  winner: string | null;
  createdAt: number;
  updatedAt: number;
  roomCode: string;
  maxPlayers: number;
  version: number; // For optimistic locking and race condition prevention
  lastMoveId?: string; // Track last move for deduplication
  lastMoveBy?: string; // Track who made the last move
  stagedCard?: {
    cards: Card[];
    playerId: string;
    action: string;
  };
  jesterReveal?: {
    revealedCard: Card;
    targetPlayerId: string;
    waitingForQueenSelection: boolean;
  };
  pendingKnightAttack?: {
    attacker: string;
    target: string;
    targetQueen: Queen;
    timestamp: number;
    defenseDeadline: number; // When defense window expires
  };
  pendingPotionAttack?: {
    attacker: string;
    target: string;
    targetQueen: Queen;
    timestamp: number;
    defenseDeadline: number; // When defense window expires
  };
  roseQueenBonus?: {
    playerId: string;
    pending: boolean;
  };
  gameMessage?: string; // Message to display about the current game state
  stagedCards?: Card[]; // Cards that are staged for the next move
  moveHistory?: { message: string; timestamp: number; playerId: string }[]; // Move history for display
}

export interface GameConfig {
  minPlayers: number;
  maxPlayers: number;
  queensToWin: { [key: number]: number };
  pointsToWin: { [key: number]: number };
  initialHandSize: number;
  maxHandSize: number;
}

export interface MoveValidationResult {
  isValid: boolean;
  error?: string;
  message?: string;
  requiredCards?: Card[];
  requiresResponse?: boolean;
}

export interface GameEvents {
  gameStateUpdate: GameState;
  playerJoined: { player: Player };
  playerLeft: { playerId: string };
  movePerformed: { move: GameMove; newState: GameState };
  gameEnded: { winner: Player; finalState: GameState };
}

export type GameEventType = keyof GameEvents;

export interface GameEventPayload<T extends GameEventType = GameEventType> {
  type: T;
  data: GameEvents[T];
  gameId: string;
  timestamp: number;
}

export type Move = GameMove;