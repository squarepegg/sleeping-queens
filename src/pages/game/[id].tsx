import React, {useEffect} from 'react';
import {useRouter} from 'next/router';
import Head from 'next/head';
import {useAuth} from '../../lib/hooks/useAuth';
import {GameLobby} from '../../presentation/components/lobby/GameLobby';
import {GameStateProvider, useGameState} from '../../lib/context/GameStateContext';
import {GameBoard} from '../../presentation/components/game/GameBoard';

// Component to display game state for debugging
function GameStateDisplay() {
    const { state } = useGameState();

    if (!state.gameState) return null;

    return (
        <div className="bg-black/20 rounded p-4 text-sm">
            <p>Room Code: {state.gameState.roomCode}</p>
            <p>Phase: {state.gameState.phase}</p>
            <p>Players: {state.gameState.players?.length}</p>
            <p>Current Player Index: {state.gameState.currentPlayerIndex}</p>
            <div className="mt-4">
                <p className="font-semibold mb-2">Players:</p>
                {state.gameState.players?.map((player, idx) => (
                    <div key={player.id} className={`p-2 ${idx === state.gameState?.currentPlayerIndex ? 'bg-yellow-500/20' : ''}`}>
                        {player.name} - {player.score} points - {player.queens?.length || 0} queens
                    </div>
                ))}
            </div>
        </div>
    );
}

// Game content component that handles both lobby and playing phases
function GameContent() {
    const { state } = useGameState();

    console.log('[GameContent] Current state:', {
        hasGameState: !!state.gameState,
        loading: state.loading,
        phase: state.gameState?.phase,
        playersCount: state.gameState?.players?.length,
        error: state.lastError
    });

    // Show loading only if we're actually loading and don't have game state yet
    if (state.loading && !state.gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading game state...</p>
                </div>
            </div>
        );
    }

    // Show error if we have one and no game state
    if (state.lastError && !state.gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <h1 className="text-2xl font-bold text-white mb-4">Error Loading Game</h1>
                    <p className="text-red-300 mb-6">{state.lastError}</p>
                    <button
                        onClick={() => window.location.href = '/lobby'}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700"
                    >
                        Back to Lobby
                    </button>
                </div>
            </div>
        );
    }

    // If we don't have game state yet, show a minimal loading state
    if (!state.gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Connecting to game...</p>
                </div>
            </div>
        );
    }

    // Check game phase and render appropriate component
    if (state.gameState.phase === 'waiting') {
        console.log('[GameContent] Rendering GameLobby for waiting phase');
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
                <GameLobby />
            </div>
        );
    } else if (state.gameState.phase === 'playing' || state.gameState.phase === 'ended') {
        // Show the game board even when ended - GameOverOverlay will handle the end state
        console.log('[GameContent] Rendering GameBoard for phase:', state.gameState.phase);
        return <GameBoard />;
    }

    // Fallback for unknown phase
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
            <div className="text-white">
                <h1>Unknown game phase: {state.gameState.phase}</h1>
                <GameStateDisplay />
            </div>
        </div>
    );
}

// Main page component
export default function GamePage() {
    const router = useRouter();
    const { id: gameId } = router.query;
    const { user, loading: authLoading } = useAuth();

    // Redirect if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/');
        }
    }, [authLoading, user, router]);

    // Wait for auth
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Checking authentication...</p>
                </div>
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return null;
    }

    // Wait for router
    if (!router.isReady || !gameId || typeof gameId !== 'string') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    // Game exists and user is authenticated - wrap with provider
    return (
        <>
            <Head>
                <title>Sleeping Queens Game</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            <GameStateProvider gameId={gameId}>
                <GameContent />
            </GameStateProvider>
        </>
    );
}