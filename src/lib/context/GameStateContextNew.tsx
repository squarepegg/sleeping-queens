// New GameStateContext.tsx - Simplified using service layer
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { GameState, GameMove, MoveValidationResult } from '@/game/types';
import { GameEngine as SleepingQueensGame } from '@/game/engine/GameEngine';
import { gameApiService } from '@/services/GameApiService';
import { realtimeService } from '@/services/RealtimeService';
import { useAuth } from '../hooks/useAuth';
import { retryWithBackoff } from '../utils/supabase-helpers';

// ============================================
// Types - Simplified
// ============================================

interface GameContextState {
    gameState: GameState | null;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastError: string | null;
    loading: boolean;
}

type GameAction =
    | { type: 'SET_GAME_STATE'; gameState: GameState }
    | { type: 'SET_CONNECTION_STATUS'; status: GameContextState['connectionStatus'] }
    | { type: 'SET_ERROR'; error: string }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'CLEAR_ERROR' }
    | { type: 'RESET' };

// ============================================
// Reducer - Simplified
// ============================================

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
    switch (action.type) {
        case 'SET_GAME_STATE':
            return {
                ...state,
                gameState: action.gameState,
                loading: false,
                lastError: null,
            };

        case 'SET_CONNECTION_STATUS':
            return { ...state, connectionStatus: action.status };

        case 'SET_ERROR':
            return { ...state, lastError: action.error, loading: false };

        case 'SET_LOADING':
            return { ...state, loading: action.loading };

        case 'CLEAR_ERROR':
            return { ...state, lastError: null };

        case 'RESET':
            return {
                gameState: null,
                connectionStatus: 'disconnected',
                lastError: null,
                loading: false,
            };

        default:
            return state;
    }
}

// ============================================
// Context
// ============================================

interface GameContextType extends GameContextState {
    // Backward compatibility: provide 'state' object for components expecting nested structure
    state: GameContextState;
    isHost: boolean; // Add host detection
    initializeGame: (gameId: string) => Promise<void>;
    createGame: (maxPlayers?: number) => Promise<string | null>;
    startGame: () => Promise<boolean>; // For backward compatibility
    playMove: (move: GameMove) => Promise<MoveValidationResult>;
    joinGame: (roomCode: string) => Promise<{ success: boolean; gameId?: string }>;
    leaveGame: () => Promise<void>;
    clearError: () => void;
    
    // Additional functions needed by GameBoard (stub implementations for now)
    canPlayMove: () => boolean;
    currentPlayer: any;
    isMyTurn: boolean;
    canPlayDragon: (playerId: string) => boolean;
    getPendingKnightAttack: () => any;
    blockKnightAttack: (playerId: string) => Promise<void>;
    allowKnightAttack: () => Promise<void>;
    getRemainingDefenseTime: () => number;
    canPlayWand: (playerId: string) => boolean;
    getPendingPotionAttack: () => any;
    blockPotionAttack: (playerId: string) => Promise<void>;
    allowPotionAttack: () => Promise<void>;
    getRemainingPotionDefenseTime: () => number;
    clearJesterReveal: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// ============================================
// Provider - Dramatically Simplified
// ============================================

interface GameStateProviderProps {
    children: React.ReactNode;
    gameId?: string;
}

export function GameStateProvider({ children, gameId }: GameStateProviderProps) {
    const { user } = useAuth();
    const [state, dispatch] = useReducer(gameReducer, {
        gameState: null,
        connectionStatus: 'disconnected',
        lastError: null,
        loading: false,
    });

    const gameEngineRef = React.useRef<SleepingQueensGame | null>(null);
    const currentGameId = React.useRef<string | null>(null);

    // Handle game state updates from realtime service
    const handleGameStateUpdate = useCallback((gameState: GameState) => {
        console.log('[GameContext] Received game state update from realtime');
        
        // Update the game engine's state
        if (gameEngineRef.current) {
            gameEngineRef.current.setState(gameState);
        } else {
            // If no engine exists yet, create one with the new state
            gameEngineRef.current = new SleepingQueensGame(gameState);
        }
        
        dispatch({ type: 'SET_GAME_STATE', gameState });
    }, []);

    // Handle connection status changes
    const handleConnectionChange = useCallback((status: GameContextState['connectionStatus']) => {
        console.log('[GameContext] Connection status changed:', status);
        dispatch({ type: 'SET_CONNECTION_STATUS', status });
    }, []);

    // Handle player joined events
    const handlePlayerJoined = useCallback((payload: any) => {
        console.log('[GameContext] Player joined event received:', payload);
        // When a player joins, we should refetch the game state
        // to ensure we have the latest player list
        if (currentGameId.current && payload.gameId === currentGameId.current && user?.id) {
            // Fetch the updated game state with player-specific view
            gameApiService.getPlayerGameView(currentGameId.current, user.id).then(gameState => {
                if (gameState) {
                    handleGameStateUpdate(gameState);
                }
            });
        }
    }, [handleGameStateUpdate, user]);

    // Initialize game and subscribe to realtime updates
    const initializeGame = useCallback(async (gameId: string) => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', error: 'User not authenticated' });
            return;
        }

        try {
            dispatch({ type: 'SET_LOADING', loading: true });
            console.log(`[GameContext] Initializing game ${gameId}`);

            // Fetch initial game state from API with player-specific view
            const gameState = await gameApiService.getPlayerGameView(gameId, user.id);
            if (!gameState) {
                throw new Error('Failed to load game state');
            }

            // Create game engine instance
            gameEngineRef.current = new SleepingQueensGame(gameState);
            currentGameId.current = gameId;

            // Subscribe to realtime updates
            realtimeService.subscribeToGame(
                gameId,
                handleGameStateUpdate,
                handlePlayerJoined,
                handleConnectionChange
            );

            // Set initial game state
            dispatch({ type: 'SET_GAME_STATE', gameState });

        } catch (error) {
            console.error('[GameContext] Failed to initialize game:', error);
            dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Failed to initialize game' });
        }
    }, [user, handleGameStateUpdate, handlePlayerJoined, handleConnectionChange]);

    // Play a move using optimistic updates
    const playMove = useCallback(async (move: GameMove): Promise<MoveValidationResult> => {
        if (!state.gameState || !gameEngineRef.current || !currentGameId.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        // Validate move locally first
        const validation = gameEngineRef.current.validateMove(move);
        if (!validation.isValid) {
            return validation;
        }

        // Create optimistic state
        const optimisticEngine = new SleepingQueensGame(state.gameState);
        const result = optimisticEngine.playMove(move);

        if (!result.isValid) {
            return result;
        }

        const optimisticState = optimisticEngine.getState();

        // Apply optimistically to UI
        dispatch({ type: 'SET_GAME_STATE', gameState: optimisticState });

        // Broadcast optimistic update to other players
        await realtimeService.broadcastGameUpdate(currentGameId.current, optimisticState);

        try {
            // Submit move to server with retry logic
            const gameId = currentGameId.current;
            if (!gameId) {
                throw new Error('No game ID available');
            }
            
            const serverResult = await retryWithBackoff(
                () => gameApiService.submitMove(gameId, move),
                2, // Only 2 retries for moves to avoid confusion
                500 // Start with 500ms delay
            );
            
            if (!serverResult.isValid) {
                // Rollback on server error
                dispatch({ type: 'SET_GAME_STATE', gameState: state.gameState });
                return serverResult;
            }

            // Server success - realtime subscription will handle the authoritative update
            return { isValid: true };

        } catch (error) {
            // Rollback on error
            console.error('[GameContext] Move failed:', error);
            dispatch({ type: 'SET_GAME_STATE', gameState: state.gameState });
            return { 
                isValid: false, 
                error: error instanceof Error ? error.message : 'Move failed' 
            };
        }
    }, [state.gameState]);

    // Join a game by room code
    const joinGame = useCallback(async (roomCode: string): Promise<{ success: boolean; gameId?: string }> => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', error: 'User not authenticated' });
            return { success: false };
        }

        try {
            dispatch({ type: 'SET_LOADING', loading: true });
            
            // Join the game using room code
            const response = await gameApiService.joinGameByRoomCode(
                roomCode, 
                user.username,
                user.id
            );
            
            if (!response || !response.gameId) {
                throw new Error('Failed to join game');
            }
            
            // Initialize the game with the returned game ID
            await initializeGame(response.gameId);
            
            dispatch({ type: 'SET_LOADING', loading: false });
            return { success: true, gameId: response.gameId };
            
        } catch (error) {
            console.error('[GameContext] Failed to join game:', error);
            dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Failed to join game' });
            return { success: false };
        }
    }, [user, initializeGame]);

    // Leave game and cleanup
    const leaveGame = useCallback(async () => {
        console.log('[GameContext] Leaving game');
        
        if (currentGameId.current) {
            await realtimeService.unsubscribeFromGame(currentGameId.current);
        }
        
        gameEngineRef.current = null;
        currentGameId.current = null;
        dispatch({ type: 'RESET' });
    }, []);

    // Create a new game (for backward compatibility with lobby)
    const createGame = useCallback(async (maxPlayers: number = 4): Promise<string | null> => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', error: 'User not authenticated' });
            return null;
        }

        try {
            dispatch({ type: 'SET_LOADING', loading: true });
            
            // Create game via API using user's username and UUID
            const response = await gameApiService.createGame(user.username, user.id, maxPlayers);
            if (!response || !response.id) {
                throw new Error('Failed to create game');
            }
            
            dispatch({ type: 'SET_LOADING', loading: false });
            return response.id;
            
        } catch (error) {
            console.error('[GameContext] Failed to create game:', error);
            dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Failed to create game' });
            return null;
        }
    }, [user]);

    // Start game (for backward compatibility)
    const startGame = useCallback(async (): Promise<boolean> => {
        if (!state.gameState || !currentGameId.current) {
            console.error('[GameContext] Cannot start game - no game state');
            return false;
        }

        try {
            // Use the game engine to start the game
            if (gameEngineRef.current) {
                // startGame() returns void but throws if there's an error
                gameEngineRef.current.startGame();
                
                // Get updated state and broadcast it
                const updatedState = gameEngineRef.current.getState();
                dispatch({ type: 'SET_GAME_STATE', gameState: updatedState });
                
                // Broadcast the game start to all players
                await realtimeService.broadcastGameUpdate(currentGameId.current, updatedState);
                
                // Also update in database
                try {
                    const response = await fetch(`/api/games/${currentGameId.current}/update-state`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ gameState: updatedState }),
                    });
                    
                    if (!response.ok) {
                        console.error('[GameContext] Failed to update game state in database');
                    }
                } catch (error) {
                    console.error('[GameContext] Error updating game state:', error);
                }
                
                console.log('[GameContext] Game started successfully and broadcast to all players');
                return true;
            }
            
            console.error('[GameContext] No game engine available');
            return false;
        } catch (error) {
            console.error('[GameContext] Error starting game:', error);
            dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Failed to start game' });
            return false;
        }
    }, [state.gameState]);

    // Clear error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    // Auto-initialize game if gameId is provided
    useEffect(() => {
        if (gameId && user && !currentGameId.current) {
            console.log('[GameContext] Auto-initializing game:', gameId);
            initializeGame(gameId);
        }
    }, [gameId, user, initializeGame]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentGameId.current) {
                realtimeService.unsubscribeFromGame(currentGameId.current);
            }
        };
    }, []);

    // Compute derived values
    const isHost = React.useMemo(() => {
        if (!user || !state.gameState) {
            return false;
        }
        
        // Simple host detection: the first player is always the host
        // Check if current user's username matches the first player
        const firstPlayer = state.gameState?.players?.[0];
        return firstPlayer?.id === user.username || firstPlayer?.name === user.username;
    }, [user, state.gameState]);
    
    // Compute current player and turn info
    const currentPlayer = React.useMemo(() => {
        if (!state.gameState || state.gameState.currentPlayerIndex === undefined) return null;
        return state.gameState.players?.[state.gameState.currentPlayerIndex] || null;
    }, [state.gameState]);
    
    const isMyTurn = React.useMemo(() => {
        if (!user || !state.gameState) return false;
        return state.gameState.currentPlayerId === user.id || 
               state.gameState.currentPlayerId === user.username ||
               currentPlayer?.id === user.id ||
               currentPlayer?.id === user.username;
    }, [user, state.gameState, currentPlayer]);

    // Game mechanics functions - properly implemented to call game engine methods
    const canPlayMove = useCallback(() => isMyTurn, [isMyTurn]);
    
    const canPlayDragon = useCallback((playerId: string) => {
        try {
            if (!gameEngineRef.current || !state.gameState) return false;
            // Check if player has a dragon card in hand - handle both id and name
            const player = state.gameState.players.find(p => 
                p.id === playerId || p.name === playerId
            );
            return player?.hand?.some(card => card.type === 'dragon') || false;
        } catch (error) {
            console.error('[GameContext] Error checking canPlayDragon:', error);
            return false;
        }
    }, [state.gameState]);
    
    const getPendingKnightAttack = useCallback(() => {
        return state.gameState?.pendingKnightAttack || null;
    }, [state.gameState]);
    
    const blockKnightAttack = useCallback(async (playerId: string) => {
        if (!state.gameState || !currentGameId.current || !gameEngineRef.current) {
            console.error('[GameContext] Cannot block attack - missing requirements');
            return;
        }

        const pendingAttack = state.gameState.pendingKnightAttack;
        if (!pendingAttack || pendingAttack.target !== playerId) {
            console.error('[GameContext] No valid attack to block');
            return;
        }

        try {
            // Play dragon card to block the attack
            const move: GameMove = {
                type: 'play_dragon',
                playerId,
                cards: [], // Dragon card will be found by the engine
                timestamp: Date.now()
            };

            const result = await playMove(move);
            if (result.isValid) {
                console.log('[GameContext] Successfully blocked knight attack with dragon');
            } else {
                console.error('[GameContext] Failed to block attack:', result.error);
            }
        } catch (error) {
            console.error('[GameContext] Error blocking knight attack:', error);
        }
    }, [state.gameState, currentGameId, playMove]);
    
    const allowKnightAttack = useCallback(async () => {
        if (!state.gameState || !currentGameId.current || !gameEngineRef.current) {
            console.error('[GameContext] Cannot allow attack - missing requirements');
            return;
        }

        const pendingAttack = state.gameState.pendingKnightAttack;
        if (!pendingAttack) {
            console.error('[GameContext] No pending attack to allow');
            return;
        }

        try {
            // Complete the knight attack by letting it timeout
            const result = gameEngineRef.current.completeKnightAttackTimeout();
            
            if (result.isValid) {
                // Update local state
                const updatedState = gameEngineRef.current.getState();
                dispatch({ type: 'SET_GAME_STATE', gameState: updatedState });
                
                // Broadcast the update
                await realtimeService.broadcastGameUpdate(currentGameId.current, updatedState);
                
                // Also update database
                try {
                    await fetch(`/api/games/${currentGameId.current}/update-state`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ gameState: updatedState })
                    });
                } catch (error) {
                    console.error('[GameContext] Failed to update database after allowing attack:', error);
                }
                
                console.log('[GameContext] Knight attack completed successfully');
            } else {
                console.error('[GameContext] Failed to complete attack:', result.error);
            }
        } catch (error) {
            console.error('[GameContext] Error allowing knight attack:', error);
        }
    }, [state.gameState, currentGameId]);
    
    const getRemainingDefenseTime = React.useMemo(() => {
        return () => {
            const attack = state.gameState?.pendingKnightAttack;
            if (!attack) return 0;
            const remaining = attack.defenseDeadline - Date.now();
            return Math.max(0, remaining);
        };
    }, [state.gameState]);
    
    const canPlayWand = useCallback((playerId: string) => {
        try {
            if (!gameEngineRef.current || !state.gameState) return false;
            // Check if player has a wand card in hand - handle both id and name
            const player = state.gameState.players.find(p => 
                p.id === playerId || p.name === playerId
            );
            return player?.hand?.some(card => card.type === 'wand') || false;
        } catch (error) {
            console.error('[GameContext] Error checking canPlayWand:', error);
            return false;
        }
    }, [state.gameState]);
    
    const getPendingPotionAttack = useCallback(() => {
        return state.gameState?.pendingPotionAttack || null;
    }, [state.gameState]);
    
    const blockPotionAttack = useCallback(async (playerId: string) => {
        // TODO: Implement actual blocking logic
        console.log('Block potion attack called for player:', playerId);
    }, []);
    
    const allowPotionAttack = useCallback(async () => {
        // TODO: Implement actual allow logic
        console.log('Allow potion attack called');
    }, []);
    
    const getRemainingPotionDefenseTime = React.useMemo(() => {
        return () => {
            const attack = state.gameState?.pendingPotionAttack;
            if (!attack) return 0;
            const remaining = attack.defenseDeadline - Date.now();
            return Math.max(0, remaining);
        };
    }, [state.gameState]);
    
    const clearJesterReveal = useCallback(() => {
        // Clear jester reveal from state
        if (gameEngineRef.current && state.gameState) {
            const newState = { ...state.gameState, jesterReveal: undefined };
            gameEngineRef.current.setState(newState);
            dispatch({ type: 'SET_GAME_STATE', gameState: newState });
        }
    }, [state.gameState]);

    // Context value - maintaining backward compatibility
    const contextValue: GameContextType = {
        ...state,
        // Backward compatibility: provide 'state' object for components expecting nested structure
        state,
        isHost,
        initializeGame,
        createGame,
        startGame,
        playMove,
        joinGame,
        leaveGame,
        clearError,
        // Game mechanics functions
        canPlayMove,
        currentPlayer,
        isMyTurn,
        canPlayDragon,
        getPendingKnightAttack,
        blockKnightAttack,
        allowKnightAttack,
        getRemainingDefenseTime,
        canPlayWand,
        getPendingPotionAttack,
        blockPotionAttack,
        allowPotionAttack,
        getRemainingPotionDefenseTime,
        clearJesterReveal,
    };

    return (
        <GameContext.Provider value={contextValue}>
            {children}
        </GameContext.Provider>
    );
}

// ============================================
// Hook
// ============================================

export function useGameState() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGameState must be used within a GameStateProvider');
    }
    return context;
}

// Export for backward compatibility during migration
export { GameContext };