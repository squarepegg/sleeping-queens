import { useState } from 'react';
import { useRouter } from 'next/router';
import { LogIn, Hash, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { GameStateProvider, useGameState } from '../../lib/context/GameStateContext';
import { useAuth } from '../../lib/hooks/useAuth';

function JoinGameContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { state, joinGame, clearError } = useGameState();
    const [roomCode, setRoomCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    const handleJoinGame = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !roomCode.trim()) return;

        setIsJoining(true);
        clearError(); // Clear any previous errors

        try {
            console.log('[JoinGame] Attempting to join with code:', roomCode.toUpperCase());
            const result = await joinGame(roomCode.toUpperCase());

            if (result.success && result.gameId) {
                console.log('[JoinGame] Successfully joined game:', result.gameId);


                // Navigate to the game
                router.push(`/game/${result.gameId}`);
            } else {
                console.error('[JoinGame] Failed to join game:', result);
            }
        } catch (error) {
            console.error('[JoinGame] Error:', error);
        } finally {
            setIsJoining(false);
        }
    };

    const formatRoomCode = (value: string) => {
        // Remove non-alphanumeric characters and convert to uppercase
        const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        // Limit to 6 characters
        return cleaned.slice(0, 6);
    };

    const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatRoomCode(e.target.value);
        setRoomCode(formatted);
    };

    return (
        <Card variant="glass" className="w-full max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-3">
                    <LogIn className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Join Game</h2>
                <p className="text-gray-300">Enter a room code to join an existing game</p>
            </div>

            <form onSubmit={handleJoinGame} className="space-y-6">
                <div>
                    <label htmlFor="roomCode" className="block text-sm font-medium text-gray-200 mb-2">
                        <Hash className="inline h-4 w-4 mr-2" />
                        Room Code
                    </label>
                    <input
                        id="roomCode"
                        type="text"
                        value={roomCode}
                        onChange={handleRoomCodeChange}
                        placeholder="Enter 6-character code"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm text-center text-lg font-mono tracking-widest"
                        maxLength={6}
                        disabled={!user || state.loading}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                    />
                    <p className="text-xs text-gray-400 mt-2">
                        Room codes are 6 characters (letters and numbers)
                    </p>
                </div>

                {/* Connection Status */}
                {state.connectionStatus !== 'disconnected' && state.connectionStatus !== 'connected' && (
                    <div className="flex items-center justify-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                            state.connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                                'bg-red-400'
                        }`} />
                        <span className="text-gray-300">
              {state.connectionStatus === 'connecting' ? 'Connecting...' : 'Connection error'}
            </span>
                    </div>
                )}

                {state.lastError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-red-300 text-sm">
                                    {state.lastError === 'Game not found'
                                        ? 'No game found with this room code. Please check the code and try again.'
                                        : state.lastError === 'Game is full'
                                            ? 'This game is already full.'
                                            : state.lastError === 'Game already started'
                                                ? 'This game has already started.'
                                                : state.lastError}
                                </p>
                                <button
                                    type="button"
                                    onClick={clearError}
                                    className="text-red-400 text-xs underline mt-1"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Button
                    type="submit"
                    loading={isJoining || state.loading}
                    disabled={!user || roomCode.length !== 6}
                    size="lg"
                    className="w-full"
                >
                    {isJoining ? 'Joining...' : 'Join Game'}
                </Button>

                {!user && (
                    <p className="text-center text-gray-400 text-sm">
                        Please log in to join a game
                    </p>
                )}
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-center text-gray-400 text-sm">
                    Ask your friends for the room code to join their game
                </p>
            </div>
        </Card>
    );
}

export function JoinGame() {
    return (
        <GameStateProvider>
            <JoinGameContent />
        </GameStateProvider>
    );
}