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
  type: 'play_king' | 'play_knight' | 'play_dragon' | 'play_wand' | 'play_potion' | 'play_jester' | 'play_math' | 'discard' | 'stage_card';
  playerId: string;
  cards: Card[];
  targetCard?: Card;
  targetPlayer?: string;
  mathEquation?: {
    cards: NumberCard[];
    equation: string;
    result: number;
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