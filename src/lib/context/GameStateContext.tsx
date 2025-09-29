// GameStateContext.tsx - Using service layer for clean architecture compliance
import React, {createContext, useCallback, useContext, useEffect, useReducer} from 'react';
import {GameMove, MoveValidationResult} from '@/domain/models/GameMove';
import {GameState} from '@/domain/models/GameState';

// Type for frontend moves where moveId is optional (will be added by playMove)
type FrontendMove = Omit<GameMove, 'moveId'> & { moveId?: string };
// MIGRATION: Using GameEngineAdapter with new clean architecture
import {GameEngineAdapter as SleepingQueensGame} from '@/application/adapters/GameEngineAdapter';
import {gameApiService} from '@/services/GameApiService';
import {realtimeService} from '@/services/RealtimeService';
import {useAuth} from '../hooks/useAuth';
import {retryWithBackoff} from '../utils/supabase-helpers';
import {filterGameStateForPlayer} from '../utils/gameStateFilter';

// ============================================
// Types - Simplified
// ============================================

interface GameContextState {
    gameState: GameState | null;
    serverState: GameState | null; // The last confirmed state from server
    optimisticState: GameState | null; // Optimistic state for pending moves
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastError: string | null;
    loading: boolean;
    drawnCards: { cards: any[]; timestamp: number } | null; // Private to current player
    pendingMoveId: string | null; // Track pending optimistic move
}

type GameAction =
    | { type: 'SET_GAME_STATE'; gameState: GameState }
    | { type: 'SET_SERVER_STATE'; gameState: GameState }
    | { type: 'SET_OPTIMISTIC_STATE'; gameState: GameState; moveId: string }
    | { type: 'CLEAR_OPTIMISTIC_STATE' }
    | { type: 'SET_CONNECTION_STATUS'; status: GameContextState['connectionStatus'] }
    | { type: 'SET_ERROR'; error: string }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'CLEAR_ERROR' }
    | { type: 'RESET' }
    | { type: 'SET_DRAWN_CARDS'; cards: any[] }
    | { type: 'CLEAR_DRAWN_CARDS' };

// ============================================
// Reducer - Simplified
// ============================================

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
    switch (action.type) {
        case 'SET_GAME_STATE':
            return {
                ...state,
                gameState: action.gameState,
                serverState: action.gameState,
                optimisticState: null,
                pendingMoveId: null,
                loading: false,
                lastError: null,
            };

        case 'SET_SERVER_STATE':
            // Only update if the new state is newer (higher version)
            if (!state.serverState || !action.gameState.version ||
                action.gameState.version >= (state.serverState.version || 0)) {
                return {
                    ...state,
                    serverState: action.gameState,
                    // If no optimistic state or server caught up, use server state
                    gameState: state.pendingMoveId ? state.optimisticState || action.gameState : action.gameState,
                    // Clear optimistic if server has caught up
                    optimisticState: state.optimisticState && state.optimisticState.version <= action.gameState.version
                        ? null : state.optimisticState,
                    pendingMoveId: state.optimisticState && state.optimisticState.version <= action.gameState.version
                        ? null : state.pendingMoveId,
                };
            }
            return state;

        case 'SET_OPTIMISTIC_STATE':
            return {
                ...state,
                gameState: action.gameState,
                optimisticState: action.gameState,
                pendingMoveId: action.moveId,
            };

        case 'CLEAR_OPTIMISTIC_STATE':
            return {
                ...state,
                gameState: state.serverState,
                optimisticState: null,
                pendingMoveId: null,
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
                serverState: null,
                optimisticState: null,
                pendingMoveId: null,
                connectionStatus: 'disconnected',
                lastError: null,
                loading: false,
                drawnCards: null,
            };

        case 'SET_DRAWN_CARDS':
            return {
                ...state,
                drawnCards: {
                    cards: action.cards,
                    timestamp: Date.now()
                }
            };

        case 'CLEAR_DRAWN_CARDS':
            return {
                ...state,
                drawnCards: null
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
    playMove: (move: FrontendMove) => Promise<MoveValidationResult>;
    joinGame: (roomCode: string) => Promise<{ success: boolean; gameId?: string }>;
    leaveGame: () => Promise<void>;
    clearError: () => void;
    clearDrawnCards: () => void; // Add function to manually clear drawn cards
    
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
        serverState: null,
        optimisticState: null,
        pendingMoveId: null,
        connectionStatus: 'disconnected',
        lastError: null,
        loading: false,
        drawnCards: null,
    });

    const gameEngineRef = React.useRef<SleepingQueensGame | null>(null);
    const currentGameId = React.useRef<string | null>(null);
    const previousGameStateRef = React.useRef<GameState | null>(null);

    // Handle game state updates from realtime service
    const handleGameStateUpdate = useCallback((gameState: GameState) => {
        console.log('[GameContext] Received game state update from realtime', {
            version: gameState.version,
            currentVersion: state.serverState?.version,
            hasPendingMove: !!state.pendingMoveId
        });
        console.log('[GameContext] lastAction in received state:', gameState.lastAction);

        // Filter the game state for the current player to preserve hand privacy
        // but maintain hand count for other players
        const filteredState = user?.id
            ? filterGameStateForPlayer(gameState, user.id)
            : gameState;

        console.log('[GameContext] lastAction after filtering:', filteredState.lastAction);

        // Check if current player drew cards using lastAction
        if (user?.id && filteredState.lastAction) {
            const lastAction = filteredState.lastAction as any;

            // Check if this action was by the current player and involved drawing cards
            // But ONLY show drawn cards if there's no pending attack (action is complete)
            const hasPendingAttack = filteredState.pendingKnightAttack || filteredState.pendingPotionAttack;

            // Also check for Jester case where original player drew a card after another player woke a queen
            const isJesterPlayerWhoDrawCard = lastAction.jesterPlayerId === user.id && lastAction.jesterPlayerDrawnCount > 0;

            if ((lastAction.playerId === user.id && lastAction.drawnCount && lastAction.drawnCount > 0 && !hasPendingAttack) ||
                isJesterPlayerWhoDrawCard) {
                const effectiveDrawnCount = isJesterPlayerWhoDrawCard ? lastAction.jesterPlayerDrawnCount : lastAction.drawnCount;

                console.log('[GameContext] Card draw detected from lastAction (action complete):', {
                    playerId: isJesterPlayerWhoDrawCard ? lastAction.jesterPlayerId : lastAction.playerId,
                    drawnCount: effectiveDrawnCount,
                    actionType: lastAction.actionType,
                    hasPendingAttack,
                    isJesterCase: isJesterPlayerWhoDrawCard
                });

                // Get the player's current hand to show the newest cards
                const currentPlayer = filteredState.players.find(p => p.id === user.id);

                if (currentPlayer && previousGameStateRef.current) {
                    const previousPlayer = previousGameStateRef.current.players.find(p => p.id === user.id);

                    // Find which cards are new by comparing IDs
                    const oldHandIds = new Set(previousPlayer?.hand.map(c => c.id) || []);
                    const drawnCards = currentPlayer.hand.filter(c => !oldHandIds.has(c.id));

                    console.log('[GameContext] Drawn cards identified:', {
                        drawnCardsCount: drawnCards.length,
                        drawnCards: drawnCards.map(c => ({ id: c.id, type: c.type, name: c.name }))
                    });

                    if (drawnCards.length > 0) {
                        // Track the drawn cards locally (private to this player)
                        dispatch({ type: 'SET_DRAWN_CARDS', cards: drawnCards });

                        // Auto-clear after 8 seconds
                        setTimeout(() => {
                            dispatch({ type: 'CLEAR_DRAWN_CARDS' });
                        }, 8000);
                    }
                } else if (currentPlayer) {
                    // If no previous state, just show the last N cards based on drawnCount
                    const drawnCards = currentPlayer.hand.slice(-effectiveDrawnCount);

                    console.log('[GameContext] Drawn cards (no previous state):', {
                        drawnCardsCount: drawnCards.length,
                        drawnCards: drawnCards.map(c => ({ id: c.id, type: c.type, name: c.name }))
                    });

                    if (drawnCards.length > 0) {
                        dispatch({ type: 'SET_DRAWN_CARDS', cards: drawnCards });

                        setTimeout(() => {
                            dispatch({ type: 'CLEAR_DRAWN_CARDS' });
                        }, 8000);
                    }
                }
            }
        }

        // Update the game engine's state with the filtered state
        if (gameEngineRef.current) {
            gameEngineRef.current.setState(filteredState);
        } else {
            // If no engine exists yet, create one with the new state
            gameEngineRef.current = new SleepingQueensGame(filteredState);
        }

        // Use SET_SERVER_STATE to properly handle version checking
        dispatch({ type: 'SET_SERVER_STATE', gameState: filteredState });

        // Update the ref for next comparison
        previousGameStateRef.current = filteredState;
    }, [user?.id, state.serverState, state.pendingMoveId]);

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

            // Initialize the previousGameStateRef for card draw detection
            previousGameStateRef.current = gameState;

        } catch (error) {
            console.error('[GameContext] Failed to initialize game:', error);
            dispatch({ type: 'SET_ERROR', error: error instanceof Error ? error.message : 'Failed to initialize game' });
        }
    }, [user, handleGameStateUpdate, handlePlayerJoined, handleConnectionChange]);

    // Play a move using optimistic updates
    const playMove = useCallback(async (move: FrontendMove): Promise<MoveValidationResult> => {
        if (!state.gameState || !gameEngineRef.current || !currentGameId.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        // Always generate a unique moveId
        const moveWithId: GameMove = {
            ...move,
            moveId: `${move.playerId}-${move.timestamp}-${Math.random().toString(36).substr(2, 9)}`
        };

        // Validate move locally first
        const validation = gameEngineRef.current.validateMove(moveWithId);
        if (!validation.isValid) {
            return validation;
        }

        // Check if this move could potentially win the game and has uncertainty
        const shouldSkipOptimistic = (() => {
            // For Knight moves, check if stealing the queen could win
            if (move.type === 'play_knight' && state.gameState) {
                const player = state.gameState.players.find(p => p.id === user?.id);
                if (player) {
                    // Check if this could be the winning move (4 queens already or close to 50 points)
                    if (player.queens.length >= 4 || player.score >= 40) {
                        // Skip optimistic update since we can't know if opponent has Dragon
                        console.log('[GameContext] Skipping optimistic update for potential winning Knight move');
                        return true;
                    }
                }
            }
            // Similar check for Potion that could win by putting opponent below win threshold
            if (move.type === 'play_potion' && move.targetPlayer && state.gameState) {
                // Skip optimistic for potion attacks on opponents (can't know if they have Wand)
                if (move.targetPlayer !== user?.id) {
                    console.log('[GameContext] Skipping optimistic update for Potion attack on opponent');
                    return true;
                }
            }
            return false;
        })();

        // Create optimistic state only if we should
        const optimisticEngine = new SleepingQueensGame(state.gameState);
        const result = optimisticEngine.playMove(moveWithId);

        if (!result.isValid) {
            return result;
        }

        const optimisticState = shouldSkipOptimistic ? null : optimisticEngine.getState();

        // Check if current player drew cards (hand size increased)
        if (user?.id && state.gameState && optimisticState) {
            const currentPlayer = state.gameState.players.find(p => p.id === user.id);
            const newPlayer = optimisticState.players.find(p => p.id === user.id);

            if (currentPlayer && newPlayer && newPlayer.hand.length > currentPlayer.hand.length) {
                // Player drew cards - determine which ones are new
                const oldHandIds = new Set(currentPlayer.hand.map(c => c.id));
                const drawnCards = newPlayer.hand.filter(c => !oldHandIds.has(c.id));

                console.log('[GameContext] Optimistic card draw detected:', {
                    oldHandSize: currentPlayer.hand.length,
                    newHandSize: newPlayer.hand.length,
                    drawnCardsCount: drawnCards.length,
                    drawnCards: drawnCards.map(c => ({ id: c.id, type: c.type, name: c.name }))
                });

                if (drawnCards.length > 0) {
                    // Track the drawn cards locally (private to this player)
                    dispatch({ type: 'SET_DRAWN_CARDS', cards: drawnCards });

                    // Auto-clear after 8 seconds
                    setTimeout(() => {
                        dispatch({ type: 'CLEAR_DRAWN_CARDS' });
                    }, 8000);
                }
            }
        }

        // Apply optimistically to UI only if we have an optimistic state
        if (optimisticState) {
            dispatch({ type: 'SET_OPTIMISTIC_STATE', gameState: optimisticState, moveId: moveWithId.moveId! });
        }

        // Don't broadcast from client - server will handle broadcasting
        // This ensures single source of truth and prevents race conditions

        try {
            // Submit move to server with retry logic
            const gameId = currentGameId.current;
            if (!gameId) {
                throw new Error('No game ID available');
            }
            
            const serverResult = await retryWithBackoff(
                () => gameApiService.submitMove(gameId, moveWithId),
                2, // Only 2 retries for moves to avoid confusion
                500 // Start with 500ms delay
            );
            
            if (!serverResult.isValid) {
                // Clear optimistic state and re-sync with server
                dispatch({ type: 'CLEAR_OPTIMISTIC_STATE' });

                // Force re-sync with server to get latest state
                if (gameId && user?.id) {
                    try {
                        const latestState = await gameApiService.getPlayerGameView(gameId, user.id);
                        if (latestState) {
                            const filteredState = filterGameStateForPlayer(latestState, user.id);
                            dispatch({ type: 'SET_GAME_STATE', gameState: filteredState });
                        }
                    } catch (syncError) {
                        console.error('[GameContext] Failed to re-sync after error:', syncError);
                    }
                }

                return serverResult;
            }

            // Server success - realtime subscription will handle the authoritative update
            // The optimistic state will be cleared when server state catches up
            return { isValid: true };

        } catch (error) {
            // Clear optimistic state and re-sync
            console.error('[GameContext] Move failed:', error);
            dispatch({ type: 'CLEAR_OPTIMISTIC_STATE' });

            // Force re-sync with server
            if (gameId && user?.id) {
                try {
                    const latestState = await gameApiService.getPlayerGameView(gameId, user.id);
                    if (latestState) {
                        const filteredState = filterGameStateForPlayer(latestState, user.id);
                        dispatch({ type: 'SET_GAME_STATE', gameState: filteredState });
                    }
                } catch (syncError) {
                    console.error('[GameContext] Failed to re-sync after error:', syncError);
                }
            }

            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Move failed'
            };
        }
    }, [state.gameState, state.serverState, state.pendingMoveId, user]);

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
                
                // Get updated state
                const updatedState = gameEngineRef.current.getState();
                dispatch({ type: 'SET_GAME_STATE', gameState: updatedState });

                // Server will broadcast the game start to all players
                // Update in database
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

    const clearDrawnCards = useCallback(() => {
        dispatch({ type: 'CLEAR_DRAWN_CARDS' });
    }, []);

    // Auto-initialize game if gameId is provided
    useEffect(() => {
        if (gameId && user && !currentGameId.current) {
            console.log('[GameContext] Auto-initializing game:', gameId);
            initializeGame(gameId);
        }
    }, [gameId, user, initializeGame]);

    // Update previousGameStateRef when state changes (for cases where page refreshes)
    useEffect(() => {
        if (state.gameState && !previousGameStateRef.current) {
            console.log('[GameContext] Initializing previousGameStateRef from existing state');
            previousGameStateRef.current = state.gameState;
        }
    }, [state.gameState]);

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
        // Only check against the official currentPlayerId
        return state.gameState.currentPlayerId === user.id ||
               state.gameState.currentPlayerId === user.username;
    }, [user, state.gameState]);

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
                moveId: `dragon-${Date.now()}-${Math.random()}`,
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
            const result = gameEngineRef.current.allowKnightAttack();
            
            if (result.isValid) {
                // Update local state
                const updatedState = gameEngineRef.current.getState();
                dispatch({ type: 'SET_GAME_STATE', gameState: updatedState });

                // Server will broadcast the update
                // Update database
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
        clearDrawnCards,
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