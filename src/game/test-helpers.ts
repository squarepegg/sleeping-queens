import { GameState } from '../../domain/models/GameState';
import { Card } from '../../domain/models/Card';
import { Player } from '../../domain/models/Player';

export function createMockGameState(): GameState {
  const players: Player[] = [
    {
      id: 'player1',
      name: 'Player 1',
      hand: [],
      queens: [],
      isActive: true
    },
    {
      id: 'player2',
      name: 'Player 2',
      hand: [],
      queens: [],
      isActive: true
    },
    {
      id: 'player3',
      name: 'Player 3',
      hand: [],
      queens: [],
      isActive: true
    }
  ];

  const drawPile: Card[] = [];
  const discardPile: Card[] = [];
  const centerQueens: Card[] = [];

  return {
    id: 'test-game',
    players,
    currentPlayer: 'player1',
    drawPile,
    discardPile,
    centerQueens,
    phase: 'play',
    lastAction: null,
    pendingKnightAttack: null,
    pendingPotionAttack: null,
    winner: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}