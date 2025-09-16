import {useCallback, useEffect, useState} from 'react';
import {Player} from '@/domain/models/Player';
import {LastAction} from '@/domain/models/GameState';

interface MoveHistoryEntry {
  message: string;
  timestamp: number;
  playerId: string;
  playerName: string;
}

interface UseMoveHistoryResult {
  moveHistory: MoveHistoryEntry[];
  addMoveToHistory: (message: string, playerId: string) => void;
  clearHistory: () => void;
  isLoading: boolean;
}

/**
 * Custom hook to manage move history display.
 * Loads historical moves from database and tracks new moves via lastAction.
 */
export function useMoveHistory(
  gameId: string | undefined,
  players: Player[],
  lastAction?: LastAction
): UseMoveHistoryResult {
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | undefined>(undefined);

  // Add move to history
  const addMoveToHistory = useCallback((message: string, playerId: string) => {
    const player = players.find(p => p.id === playerId);
    const newMove = {
      message,
      timestamp: Date.now(),
      playerId,
      playerName: player?.name || 'Unknown'
    };
    setMoveHistory(prev => [newMove, ...prev.slice(0, 49)]); // Keep last 50 moves
  }, [players]);

  // Clear history
  const clearHistory = useCallback(() => {
    setMoveHistory([]);
    setLastProcessedTimestamp(0);
    setHasLoadedHistory(false);
  }, []);

  // Load historical moves from database when game loads
  useEffect(() => {
    if (!gameId || hasLoadedHistory) return;

    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/games/${gameId}/history?limit=50`);
        if (response.ok) {
          const data = await response.json();

          // Convert the API response to our format - API already returns newest first
          const historicalMoves: MoveHistoryEntry[] = (data.moves || [])
            .map((move: any) => ({
              message: move.message,
              timestamp: move.timestamp,
              playerId: move.playerId,
              playerName: move.playerName
            }));

          setMoveHistory(historicalMoves);

          // Set the last processed timestamp to avoid re-processing these moves
          if (historicalMoves.length > 0) {
            const latestTimestamp = Math.max(...historicalMoves.map(m => m.timestamp));
            setLastProcessedTimestamp(latestTimestamp);
          }

          setHasLoadedHistory(true);
        }
      } catch (error) {
        console.error('Failed to load move history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [gameId, hasLoadedHistory]);

  // Track lastAction changes and add to history
  useEffect(() => {
    if (!lastAction || !hasLoadedHistory || !gameId) return;

    // Check if this is a new action we haven't processed
    if (lastAction.timestamp > lastProcessedTimestamp) {
      const newEntry: MoveHistoryEntry = {
        message: lastAction.message || 'Unknown action',
        timestamp: lastAction.timestamp,
        playerId: lastAction.playerId,
        playerName: lastAction.playerName
      };

      setMoveHistory(prev => {
        // Avoid duplicates by checking both timestamp AND message
        const isDuplicate = prev.some(entry =>
          entry.timestamp === newEntry.timestamp &&
          entry.message === newEntry.message &&
          entry.playerId === newEntry.playerId
        );

        if (isDuplicate) {
          return prev;
        }

        return [newEntry, ...prev.slice(0, 49)]; // Keep last 50 moves
      });

      setLastProcessedTimestamp(lastAction.timestamp);
    }
  }, [lastAction, lastProcessedTimestamp, hasLoadedHistory, gameId]);

  // Clear history when game changes
  useEffect(() => {
    if (gameId && gameId !== currentGameId) {
      clearHistory();
      setCurrentGameId(gameId);
    }
  }, [gameId, currentGameId]); // Don't include clearHistory to avoid infinite loop

  return {
    moveHistory,
    addMoveToHistory,
    clearHistory,
    isLoading
  };
}