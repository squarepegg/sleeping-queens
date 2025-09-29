import { GameState } from '@/domain/models/GameState';
import { Card, Queen } from '@/domain/models/Card';
import { Player } from '@/domain/models/Player';

export function createMockGameState(): GameState {
  const players: Player[] = [
    {
      id: 'player1',
      name: 'Player 1',
      position: 0,
      hand: [],
      queens: [],
      score: 0,
      isConnected: true
    },
    {
      id: 'player2',
      name: 'Player 2',
      position: 1,
      hand: [],
      queens: [],
      score: 0,
      isConnected: true
    },
    {
      id: 'player3',
      name: 'Player 3',
      position: 2,
      hand: [],
      queens: [],
      score: 0,
      isConnected: true
    }
  ];

  const deck: Card[] = [];
  const discardPile: Card[] = [];
  const sleepingQueens: Queen[] = [];

  return {
    id: 'test-game',
    players,
    currentPlayerIndex: 0,
    currentPlayerId: 'player1',
    sleepingQueens,
    deck,
    discardPile,
    phase: 'playing',
    winner: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    roomCode: 'TEST123',
    maxPlayers: 4,
    version: 1
  };
}