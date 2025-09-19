import {useCallback, useEffect, useState} from 'react';
import {Player} from '@/domain/models/Player';
import {LastAction} from '@/domain/models/GameState';
import {realtimeService} from '@/services/RealtimeService';
import {moveFormatter} from '@/services/MoveFormatter';

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
  reloadHistory: () => void;
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

  // Reload history from database
  const reloadHistory = useCallback(() => {
    setHasLoadedHistory(false);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!gameId) return;
    console.log('[useMoveHistory] Loading history for game:', gameId);
    setIsLoading(true);
    try {
      const response = await fetch(`/api/games/${gameId}/history?limit=50`);
      if (response.ok) {
        const data = await response.json();
        console.log('[useMoveHistory] History loaded:', data);

        // Convert the API response to our format - API already returns newest first
        const historicalMoves: MoveHistoryEntry[] = (data.moves || [])
          .map((move: any) => ({
            message: move.message,
            timestamp: move.timestamp,
            playerId: move.playerId,
            playerName: move.playerName
          }));

        console.log('[useMoveHistory] Formatted moves:', historicalMoves);
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
  }, [gameId]);


  // Load initial history when game loads
  useEffect(() => {
    if (!gameId || hasLoadedHistory) return;
    loadHistory();
  }, [gameId, hasLoadedHistory, loadHistory]);

  // Subscribe to realtime updates via centralized service
  useEffect(() => {
    if (!gameId) return;

    const moveCallback = (moveData: any, playerData: any) => {
      // Process the move directly here to avoid stale closure issues
      const move = moveData.move_data;
      let message = 'Unknown action';
      let playerId = moveData.player_id;
      let playerName = playerData?.name || 'Unknown';

      if (move.type === 'system' || move.type === 'system_message') {
        message = move.message || 'System event';
        playerId = move.playerId || 'system';
        playerName = 'Game';
      } else if (move.lastAction?.message) {
        message = move.lastAction.message;
        playerName = move.lastAction?.playerName || playerData?.name || 'Unknown';
      } else if (move.type) {
        // Use centralized MoveFormatter for consistent formatting
        const formattedMessage = moveFormatter.formatMove(move, players);

        if (formattedMessage) {
          message = formattedMessage;
        } else {
          // Fallback for basic moves
          const typeMessages: Record<string, string> = {
            'play_king': `${playerName} played a King to wake up a Queen`,
            'play_knight': `${playerName} played a Knight`,
            'play_potion': `${playerName} played a Sleeping Potion`,
            'play_dragon': `${playerName} played a Dragon`,
            'play_wand': `${playerName} played a Magic Wand`,
            'play_jester': `${playerName} played a Jester`,
            'play_math': `${playerName} played a math equation`,
            'play_equation': `${playerName} played a math equation`,
            'discard': `${playerName} discarded cards`
          };
          message = typeMessages[move.type] || `${playerName} made a move`;
        }
      }

      const newEntry = {
        message,
        timestamp: new Date(moveData.created_at).getTime(),
        playerId,
        playerName
      };

      setMoveHistory(prev => {
        // Check for duplicates
        const isDuplicate = prev.some(entry =>
          Math.abs(entry.timestamp - newEntry.timestamp) < 2000 &&
          entry.message === newEntry.message &&
          entry.playerId === newEntry.playerId
        );

        if (isDuplicate) {
          return prev;
        }

        return [newEntry, ...prev.slice(0, 49)];
      });

      setLastProcessedTimestamp(newEntry.timestamp);
    };

    const statusCallback = (status: string) => {
      // Could add status handling logic here if needed
    };

    realtimeService.subscribeToGameMoves(gameId, moveCallback, statusCallback);

    return () => {
      realtimeService.unsubscribeFromGameMoves(gameId);
    };
  }, [gameId, players]); // Include players to get fresh data but still avoid constant reconnections

  // Note: Removed lastAction tracking since we now use realtime subscriptions
  // This prevents duplicate entries from both realtime and lastAction updates

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
    reloadHistory,
    isLoading
  };
}