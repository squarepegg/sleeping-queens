// GameStateContext.tsx - Using direct subscriptions without useRealtime
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, GameMove, MoveValidationResult } from '@/game/types';
import { GameEngine as SleepingQueensGame } from '@/game/engine/GameEngine';
import { supabase } from '../supabase';
import { useAuth } from '../hooks/useAuth';

// ============================================
// Types
// ============================================

interface GameContextState {
    gameState: GameState | null;
    connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastError: string | null;
    loading: boolean;
}

type GameAction =
    | { type: 'SET_GAME_STATE'; gameState: GameState; source: 'database' | 'broadcast' | 'local' }
    | { type: 'SET_CONNECTION_STATUS'; status: GameContextState['connectionStatus'] }
    | { type: 'SET_ERROR'; error: string }
    | { type: 'SET_LOADING'; loading: boolean }
    | { type: 'CLEAR_ERROR' }
    | { type: 'RESET' };

// ============================================
// Reducer
// ============================================

function gameReducer(state: GameContextState, action: GameAction): GameContextState {
    switch (action.type) {
        case 'SET_GAME_STATE': {
            const newState = action.gameState;

            return {
                ...state,
                gameState: newState,
                loading: false,  // Always set loading to false when we have game state
                lastError: null,
            };
        }

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

interface GameStateContextType {
    state: GameContextState;
    isHost: boolean;
    currentPlayer: Player | null;
    isMyTurn: boolean;
    canPlayMove: boolean;

    createGame: (maxPlayers?: number) => Promise<string | null>;
    joinGame: (roomCode: string) => Promise<{ success: boolean; gameId?: string }>;
    startGame: () => Promise<boolean>;
    playMove: (move: GameMove) => Promise<MoveValidationResult>;
    leaveGame: () => Promise<void>;
    clearError: () => void;
    
    // Dragon blocking methods
    canPlayDragon: (playerId: string) => boolean;
    getPendingKnightAttack: () => any;
    blockKnightAttack: (playerId: string) => Promise<MoveValidationResult>;
    allowKnightAttack: () => Promise<MoveValidationResult>;
    getRemainingDefenseTime: () => number;
    
    // Wand blocking methods
    canPlayWand: (playerId: string) => boolean;
    getPendingPotionAttack: () => any;
    blockPotionAttack: (playerId: string) => Promise<MoveValidationResult>;
    allowPotionAttack: () => Promise<MoveValidationResult>;
    getRemainingPotionDefenseTime: () => number;
    
    // Jester reveal methods
    clearJesterReveal: () => Promise<MoveValidationResult>;
}

const GameStateContext = createContext<GameStateContextType | null>(null);

// ============================================
// Provider
// ============================================

export function GameStateProvider({
                                      children,
                                      gameId
                                  }: {
    children: React.ReactNode;
    gameId?: string;
}) {
    const { user } = useAuth();
    const [state, dispatch] = useReducer(gameReducer, {
        gameState: null,
        connectionStatus: 'disconnected',
        lastError: null,
        loading: false,
    });

    const gameEngineRef = useRef<SleepingQueensGame | null>(null);
    const channelRef = useRef<any>(null);

    // ============================================
    // Handlers
    // ============================================

    const handleGameStateUpdate = useCallback((newState: GameState, source: 'database' | 'broadcast') => {
        console.log(`[GameContext] handleGameStateUpdate from ${source}`);
        console.log(`[GameContext] Players in update: ${newState.players?.length}`);
        console.log(`[GameContext] Game phase: ${newState.phase}`);

        if (newState) {
            gameEngineRef.current = new SleepingQueensGame(newState);
            dispatch({ type: 'SET_GAME_STATE', gameState: newState, source });
        }
    }, []);

    const handleConnectionStatusChange = useCallback((status: 'connecting' | 'connected' | 'disconnected' | 'error') => {
        dispatch({ type: 'SET_CONNECTION_STATUS', status });
    }, []);

    const handleError = useCallback((error: Error) => {
        console.error('[GameContext] Error:', error);
        dispatch({ type: 'SET_ERROR', error: error.message });
    }, []);

    // ============================================
    // Direct Broadcast Function
    // ============================================

    const broadcastGameUpdate = useCallback(async (gameState: GameState): Promise<boolean> => {
        if (!gameId || !channelRef.current) return false;

        try {
            // Use the existing channel that everyone is subscribed to
            const result = await channelRef.current.send({
                type: 'broadcast',
                event: 'game_update',
                payload: { gameState }
            });

            console.log('[GameContext] Broadcast result:', result);
            return result === 'ok';
        } catch (error) {
            console.error('[GameContext] Broadcast failed:', error);
            return false;
        }
    }, [gameId]);

    // ============================================
    // Load initial game state & Set up subscriptions
    // ============================================

    useEffect(() => {
        if (!gameId || !user) {
            console.log('[GameContext] Missing gameId or user:', { gameId, user });
            return;
        }

        let mounted = true;

        const setupGameSubscription = async () => {
            console.log('[GameContext] Starting game setup for gameId:', gameId);
            dispatch({ type: 'SET_LOADING', loading: true });
            dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' });

            // Load initial state
            try {
                console.log('[GameContext] Fetching game from Supabase...');
                const { data, error } = await supabase
                    .from('games')
                    .select('*')
                    .eq('id', gameId)
                    .single();

                if (!mounted) return;

                console.log('[GameContext] Supabase response:', {
                    hasData: !!data,
                    hasError: !!error,
                    error: error
                });

                if (error) {
                    console.error('[GameContext] Supabase error details:', error);
                    throw new Error(error.message || 'Failed to load game');
                }

                if (!data) {
                    console.error('[GameContext] No game data returned');
                    throw new Error('Game not found');
                }

                if (!(data as any).state) {
                    console.error('[GameContext] Game has no state property');
                    throw new Error('Invalid game state');
                }

                console.log('[GameContext] Game state details:', {
                    players: (data as any).state.players?.length,
                    phase: (data as any).state.phase
                });

                // Update state with loaded game
                handleGameStateUpdate((data as any).state as GameState, 'database');
                console.log('[GameContext] Initial state loaded successfully');

            } catch (error: any) {
                if (!mounted) return;
                console.error('[GameContext] Failed to load game:', error);
                dispatch({ type: 'SET_ERROR', error: error.message || 'Unknown error' });
                dispatch({ type: 'SET_LOADING', loading: false });
                return;
            }

            // Set up direct database subscription
            console.log('[GameContext] Setting up realtime subscription...');

            // Clean up any existing channel
            if (channelRef.current) {
                await channelRef.current.unsubscribe();
                channelRef.current = null;
            }

            const channel = supabase
                .channel(`direct-game-${gameId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'games',
                        filter: `id=eq.${gameId}`
                    },
                    (payload) => {
                        if (!mounted) return;

                        console.log('[GameContext] 🎯 DATABASE CHANGE:', {
                            eventType: payload.eventType,
                            hasNew: !!payload.new,
                            hasOld: !!payload.old
                        });

                        if (payload.new && (payload.new as any).state) {
                            const newState = (payload.new as any).state as GameState;
                            console.log('[GameContext] New state from DB:', {
                                players: newState.players?.length,
                                phase: newState.phase
                            });

                            handleGameStateUpdate(newState, 'database');
                        }
                    }
                )
                // Also listen to broadcasts for optimistic updates
                .on(
                    'broadcast',
                    { event: 'game_update' },
                    ({ payload }) => {
                        if (!mounted) return;

                        console.log('[GameContext] 📡 Broadcast received from other player:', {
                            currentPlayer: payload.gameState?.currentPlayerIndex,
                            players: payload.gameState?.players?.length,
                            discardPile: payload.gameState?.discardPile?.length,
                            stagedCards: payload.gameState?.stagedCards?.length,
                            gameMessage: payload.gameState?.gameMessage
                        });
                        if (payload?.gameState) {
                            console.log('[GameContext] Broadcast state:', {
                                players: payload.gameState.players?.length,
                                phase: payload.gameState.phase,
                                currentPlayer: payload.gameState.currentPlayerIndex,
                                discardPile: payload.gameState.discardPile?.length
                            });
                            // Apply broadcast updates immediately for responsiveness
                            handleGameStateUpdate(payload.gameState, 'broadcast');
                        }
                    }
                )
                .subscribe((status) => {
                    if (!mounted) return;

                    console.log('[GameContext] Subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connected' });
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('[GameContext] Subscription error');
                        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'error' });
                    } else if (status === 'TIMED_OUT') {
                        console.error('[GameContext] Subscription timed out');
                        dispatch({ type: 'SET_CONNECTION_STATUS', status: 'error' });
                    }
                });

            channelRef.current = channel;
        };

        // Run the setup
        setupGameSubscription();

        // Cleanup function
        return () => {
            mounted = false;
            console.log('[GameContext] Cleanup - unsubscribing');
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [gameId, user, handleGameStateUpdate]);

    // ============================================
    // Game actions using atomic updates
    // ============================================

    const playMove = useCallback(async (move: GameMove): Promise<MoveValidationResult> => {
        if (!state.gameState || !gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        // Validate locally first
        const validation = gameEngineRef.current.validateMove(move);
        if (!validation.isValid) {
            return validation;
        }

        // Optimistically apply the move
        const optimisticEngine = new SleepingQueensGame(state.gameState);
        const result = optimisticEngine.playMove(move);

        if (!result.isValid) {
            return result;
        }

        const optimisticState = optimisticEngine.getState();

        // Apply optimistically
        dispatch({ type: 'SET_GAME_STATE', gameState: optimisticState, source: 'broadcast' });

        // Broadcast for immediate feedback to other players
        console.log('[GameContext] 🚀 Broadcasting optimistic state:', {
            stagedCards: optimisticState.stagedCards?.length,
            gameMessage: optimisticState.gameMessage
        });
        await broadcastGameUpdate(optimisticState);

        try {
            // Use the API endpoint instead of Supabase RPC
            const response = await fetch(`/api/games/${gameId}/move`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(move),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Move failed');
            }

            const data = await response.json();

            if (!data.isValid) {
                return { isValid: false, error: data.error || 'Move failed' };
            }

            // The API endpoint already updated the database, so the realtime subscription will handle the state update
            return { isValid: true };
        } catch (error: any) {
            // Rollback on error
            console.error('[GameContext] Move failed:', error);

            // Reload correct state from database
            const { data } = await supabase
                .from('games')
                .select('*')
                .eq('id', gameId!)
                .single();

            if (data) {
                handleGameStateUpdate((data as any).state, 'database');
            }

            return { isValid: false, error: error.message };
        }
    }, [state.gameState, gameId, broadcastGameUpdate, handleGameStateUpdate]);

    const startGame = useCallback(async (): Promise<boolean> => {
        if (!gameId || !user || !state.gameState || !gameEngineRef.current) {
            console.error('[StartGame] Missing requirements:', {
                gameId,
                user: !!user,
                gameState: !!state.gameState,
                engine: !!gameEngineRef.current
            });
            return false;
        }

        // Check if host
        if (state.gameState.players[0]?.id !== user.id) {
            dispatch({ type: 'SET_ERROR', error: 'Only host can start game' });
            return false;
        }

        dispatch({ type: 'SET_LOADING', loading: true });

        try {
            // Use the game engine to start the game (THIS DEALS THE CARDS!)
            console.log('[StartGame] Calling engine.startGame()');
            const success = gameEngineRef.current.startGame();

            if (!success) {
                throw new Error('Cannot start game (need at least 2 players)');
            }

            // Get the updated state with dealt cards
            const newGameState = gameEngineRef.current.getState();

            console.log('[StartGame] Game started, players have cards:', {
                phase: newGameState.phase,
                players: newGameState.players.map(p => ({
                    name: p.name,
                    handSize: p.hand.length
                }))
            });

            // Update local state immediately
            handleGameStateUpdate(newGameState, 'database');

            // Save complete state to database (with dealt cards!)
            const { error } = await (supabase as any)
                .from('games')
                .update({
                    state: newGameState
                })
                .eq('id', gameId);

            if (error) {
                console.error('[StartGame] Database update failed:', error);
                throw error;
            }

            // Broadcast the update so other players see their cards
            await broadcastGameUpdate(newGameState);

            console.log('[StartGame] Game successfully started and saved');
            return true;
        } catch (error: any) {
            console.error('[StartGame] Error:', error);
            dispatch({ type: 'SET_ERROR', error: error.message });
            return false;
        }
    }, [gameId, user, state.gameState, handleGameStateUpdate, broadcastGameUpdate]);

    const joinGame = useCallback(async (roomCode: string): Promise<{ success: boolean; gameId?: string }> => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', error: 'Not authenticated' });
            return { success: false };
        }

        dispatch({ type: 'SET_LOADING', loading: true });

        try {
            // Get the game
            const { data: gameData, error: gameError } = await supabase
                .from('games')
                .select('*')
                .eq('room_code', roomCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (gameError || !gameData) {
                console.error('[JoinGame] Game not found:', gameError);
                dispatch({ type: 'SET_ERROR', error: 'Game not found' });
                return { success: false };
            }

            console.log('[JoinGame] Found game:', (gameData as any).id);
            console.log('[JoinGame] Current players:', (gameData as any).state.players?.length);

            const gameState = (gameData as any).state as GameState;

            // Check if already joined
            const existingPlayer = gameState.players.find(p => p.id === user.id);
            if (existingPlayer) {
                console.log('[JoinGame] Already in game');
                dispatch({ type: 'SET_LOADING', loading: false });
                return { success: true, gameId: (gameData as any).id };
            }

            // Check if full
            if (gameState.players.length >= (gameState.maxPlayers || 5)) {
                dispatch({ type: 'SET_ERROR', error: 'Game is full' });
                return { success: false };
            }

            // Check if already started
            if (gameState.phase !== 'waiting') {
                dispatch({ type: 'SET_ERROR', error: 'Game already started' });
                return { success: false };
            }

            // Add player to game state
            const newPlayer = {
                id: user.id,
                name: user.username,
                position: gameState.players.length,
                hand: [],
                queens: [],
                awakeQueens: [],
                score: 0,
                isConnected: true
            };

            const updatedState = {
                ...gameState,
                players: [...gameState.players, newPlayer]
            };

            console.log('[JoinGame] New player count:', updatedState.players.length);

            // Update the database - THIS SHOULD TRIGGER REALTIME
            const { data: updateData, error: updateError } = await (supabase as any)
                .from('games')
                .update({
                    state: updatedState
                })
                .eq('id', (gameData as any).id)
                .select()
                .single();

            if (updateError) {
                console.error('[JoinGame] Update failed:', updateError);
                throw new Error('Failed to join game');
            }

            console.log('[JoinGame] Update successful');

            // Also add to players table
            await (supabase as any).from('players').insert({
                game_id: (gameData as any).id,
                user_id: user.id,
                name: user.username,
                position: newPlayer.position,
                is_connected: true
            }).select();

            // Send a broadcast notification for immediate update
            const notifyChannel = supabase.channel(`game-notify-${(gameData as any).id}`);
            await notifyChannel.send({
                type: 'broadcast',
                event: 'player_joined',
                payload: {
                    playerId: user.id,
                    playerName: user.username,
                    gameState: updatedState
                }
            });
            await notifyChannel.unsubscribe();

            dispatch({ type: 'SET_LOADING', loading: false });

            return { success: true, gameId: (gameData as any).id };

        } catch (error: any) {
            console.error('[JoinGame] Error:', error);
            dispatch({ type: 'SET_ERROR', error: error.message });
            dispatch({ type: 'SET_LOADING', loading: false });
            return { success: false };
        }
    }, [user]);

    const createGame = useCallback(async (maxPlayers: number = 5): Promise<string | null> => {
        if (!user) {
            dispatch({ type: 'SET_ERROR', error: 'Not authenticated' });
            return null;
        }

        dispatch({ type: 'SET_LOADING', loading: true });

        try {
            // Create game with initial state
            const gameEngine = new SleepingQueensGame({ maxPlayers });
            gameEngine.addPlayer({
                id: user.id,
                name: user.username,
                position: 0,
                isConnected: true,
                hand: [],
                queens: [],
                score: 0
            });

            const initialState = gameEngine.getState();

            console.log('[GameContext] Created game with phase:', initialState.phase);
            console.log('[GameContext] Created game with players:', initialState.players.length);

            const { data, error } = await (supabase as any)
                .from('games')
                .insert({
                    id: initialState.id,
                    room_code: initialState.roomCode,
                    state: initialState,
                    max_players: maxPlayers,
                    is_active: true
                })
                .select()
                .single();

            if (error || !data) {
                throw new Error('Failed to create game');
            }

            // Add player record
            await (supabase as any).from('players').insert({
                game_id: initialState.id,
                user_id: user.id,
                name: user.username,
                position: 0,
            });

            return initialState.id;
        } catch (error: any) {
            dispatch({ type: 'SET_ERROR', error: error.message });
            return null;
        }
    }, [user]);

    const leaveGame = useCallback(async (): Promise<void> => {
        // Clean up channel subscription
        if (channelRef.current) {
            await channelRef.current.unsubscribe();
            channelRef.current = null;
        }
        dispatch({ type: 'RESET' });
    }, []);

    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, []);

    // ============================================
    // Dragon blocking methods
    // ============================================

    const canPlayDragon = useCallback((playerId: string): boolean => {
        if (!gameEngineRef.current) return false;
        return gameEngineRef.current.canPlayerPlayDragon(playerId);
    }, []);

    const getPendingKnightAttack = useCallback(() => {
        if (!gameEngineRef.current) return null;
        return gameEngineRef.current.getPendingKnightAttack();
    }, []);

    const blockKnightAttack = useCallback(async (playerId: string): Promise<MoveValidationResult> => {
        if (!gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        const result = gameEngineRef.current.allowKnightAttack();
        
        if (result.isValid && state.gameState) {
            // Update game state after blocking
            const newState = gameEngineRef.current.getState();
            
            try {
                const response = await fetch(`/api/games/${state.gameState.id}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'play_dragon',
                        playerId,
                        cards: [],
                        timestamp: Date.now()
                    })
                });

                if (!response.ok) {
                    console.error('Failed to sync dragon block to server');
                }

                // Update local state
                dispatch({ type: 'SET_GAME_STATE', gameState: newState, source: 'local' });
            } catch (error) {
                console.error('Error syncing dragon block:', error);
            }
        }

        return result;
    }, [state.gameState]);

    const allowKnightAttack = useCallback(async (): Promise<MoveValidationResult> => {
        if (!gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        const result = gameEngineRef.current.allowKnightAttack();
        
        if (result.isValid && state.gameState) {
            // Update game state after allowing attack
            const newState = gameEngineRef.current.getState();
            
            // Update local state
            dispatch({ type: 'SET_GAME_STATE', gameState: newState, source: 'local' });
        }

        return result;
    }, [state.gameState]);

    const getRemainingDefenseTime = useCallback((): number => {
        if (!gameEngineRef.current) {
            return 0;
        }
        return gameEngineRef.current.getRemainingDefenseTime();
    }, []);

    // ============================================
    // Wand blocking methods
    // ============================================

    const canPlayWand = useCallback((playerId: string): boolean => {
        if (!gameEngineRef.current) return false;
        return gameEngineRef.current.canPlayerPlayWand(playerId);
    }, []);

    const getPendingPotionAttack = useCallback(() => {
        if (!gameEngineRef.current) return null;
        return gameEngineRef.current.getPendingPotionAttack();
    }, []);

    const blockPotionAttack = useCallback(async (playerId: string): Promise<MoveValidationResult> => {
        if (!gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        const result = gameEngineRef.current.allowPotionAttack();
        
        if (result.isValid && state.gameState) {
            // Update game state after blocking
            const newState = gameEngineRef.current.getState();
            
            try {
                const response = await fetch(`/api/games/${state.gameState.id}/move`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'play_wand',
                        playerId,
                        cards: [],
                        timestamp: Date.now()
                    })
                });

                if (!response.ok) {
                    console.error('Failed to sync wand block to server');
                }

                // Update local state
                dispatch({ type: 'SET_GAME_STATE', gameState: newState, source: 'local' });
            } catch (error) {
                console.error('Error syncing wand block:', error);
            }
        }

        return result;
    }, [state.gameState]);

    const allowPotionAttack = useCallback(async (): Promise<MoveValidationResult> => {
        if (!gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        const result = gameEngineRef.current.allowPotionAttack();
        
        if (result.isValid && state.gameState) {
            // Update game state after allowing attack
            const newState = gameEngineRef.current.getState();
            
            // Update local state
            dispatch({ type: 'SET_GAME_STATE', gameState: newState, source: 'local' });
        }

        return result;
    }, [state.gameState]);

    const clearJesterReveal = useCallback(async (): Promise<MoveValidationResult> => {
        if (!gameEngineRef.current) {
            return { isValid: false, error: 'Game not initialized' };
        }

        // Clear jester reveal - no direct method, just update state
        const currentState = gameEngineRef.current.getState();
        currentState.jesterReveal = undefined;
        gameEngineRef.current.setState(currentState);
        
        if (state.gameState) {
            // Update game state after clearing jester reveal
            const newState = gameEngineRef.current.getState();
            
            // Update local state
            dispatch({ type: 'SET_GAME_STATE', gameState: newState, source: 'local' });
        }

        return { isValid: true };
    }, [state.gameState]);

    const getRemainingPotionDefenseTime = useCallback((): number => {
        if (!gameEngineRef.current) {
            return 0;
        }
        return gameEngineRef.current.getRemainingPotionDefenseTime();
    }, []);

    // ============================================
    // Computed properties
    // ============================================

    const isHost = !!(user && state.gameState?.players[0]?.id === user.id);
    // Use server-authoritative current player ID
    const currentPlayer = state.gameState?.players.find(p => p.id === state.gameState?.currentPlayerId) || null;
    const userPlayer = state.gameState?.players.find(p => p.id === user?.id) || null;
    const isMyTurn = state.gameState?.currentPlayerId === user?.id;
    const canPlayMove = isMyTurn && state.gameState?.phase === 'playing';

    const value: GameStateContextType = {
        state,
        isHost,
        currentPlayer,
        isMyTurn,
        canPlayMove,
        createGame,
        joinGame,
        startGame,
        playMove,
        leaveGame,
        clearError,
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
        <GameStateContext.Provider value={value}>
            {children}
        </GameStateContext.Provider>
    );
}

export function useGameState() {
    const context = useContext(GameStateContext);
    if (!context) {
        throw new Error('useGameState must be used within GameStateProvider');
    }
    return context;
}