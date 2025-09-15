import { useState, useEffect, useCallback } from 'react';
import { Player } from '@/game/types';
import { gameApiService } from '@/services/GameApiService';
import { moveFormatter } from '@/services/MoveFormatter';

interface MoveHistoryEntry {
  message: string;
  timestamp: number;
  playerId: string;
}

interface UseMoveHistoryResult {
  moveHistory: MoveHistoryEntry[];
  addMoveToHistory: (message: string, playerId: string) => void;
  clearHistory: () => void;
}

/**
 * Custom hook to manage move history display.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function useMoveHistory(gameId: string | undefined, players: Player[]): UseMoveHistoryResult {
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);

  // Add move to history
  const addMoveToHistory = useCallback((message: string, playerId: string) => {
    const newMove = { message, timestamp: Date.now(), playerId };
    setMoveHistory(prev => [newMove, ...prev.slice(0, 4)]); // Keep last 5 moves
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setMoveHistory([]);
  }, []);

  // Fetch move history from API
  useEffect(() => {
    if (!gameId) return;

    const fetchMoveHistory = async () => {
      try {
        const gameState = await gameApiService.getGameState(gameId);
        if (!gameState?.moveHistory) return;

        const formattedHistory = moveFormatter.formatMoveHistory(gameState.moveHistory, players);
        setMoveHistory(formattedHistory);
      } catch (error) {
        console.error('Failed to fetch move history:', error);
      }
    };

    fetchMoveHistory();
  }, [gameId, players]);

  // Handle real-time move updates
  const handleRealtimeMove = useCallback((moveRecord: any) => {
    const move = moveRecord.move_data;
    const historyEntry = moveFormatter.createMoveHistoryEntry(move, players);
    
    if (historyEntry) {
      setMoveHistory(prev => [historyEntry, ...prev.slice(0, 4)]);
    }
  }, [players]);

  return {
    moveHistory,
    addMoveToHistory,
    clearHistory,
  };
}