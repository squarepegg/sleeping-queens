import {useState} from 'react';
import {useRouter} from 'next/router';
import {Play, Settings, Users} from 'lucide-react';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {GameStateProvider, useGameState} from '@/lib/context/GameStateContext';
import {useAuth} from '@/lib/hooks/useAuth';

function CreateGameContent() {
    const router = useRouter();
    const { user } = useAuth();
    const { state, createGame, clearError } = useGameState();
    const [maxPlayers, setMaxPlayers] = useState(2);
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateGame = async () => {
        if (!user) {
            console.error('[CreateGame] No user found');
            return;
        }

        setIsCreating(true);
        clearError(); // Clear any previous errors

        try {
            console.log('[CreateGame] Creating game with maxPlayers:', maxPlayers);
            const gameId = await createGame(maxPlayers);

            if (gameId) {
                console.log('[CreateGame] Game created successfully:', gameId);
                // Navigate to the game
                router.push(`/game/${gameId}`);
            } else {
                console.error('[CreateGame] Failed to create game');
            }
        } catch (error) {
            console.error('[CreateGame] Error:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Card variant="glass" className="w-full max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-3">
                    <Play className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Create New Game</h2>
                <p className="text-gray-300">Set up a new Sleeping Queens game</p>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                        <Users className="inline h-4 w-4 mr-2" />
                        Maximum Players
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[2, 3, 4, 5].map((num) => (
                            <button
                                key={num}
                                onClick={() => setMaxPlayers(num)}
                                className={`
                  py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all duration-200
                  ${maxPlayers === num
                                    ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                                    : 'border-gray-600 text-gray-300 hover:border-gray-500'
                                }
                `}
                            >
                                {num} {num === 1 ? 'Player' : 'Players'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center mb-2">
                        <Settings className="h-4 w-4 text-gray-300 mr-2" />
                        <span className="text-sm font-medium text-gray-200">Game Rules</span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                        <p>• Collect {maxPlayers <= 2 ? '5 queens or 50 points' : '4 queens or 40 points'} to win</p>
                        <p>• Use Kings to wake sleeping queens</p>
                        <p>• Use Knights to steal queens (can be blocked by Dragons)</p>
                        <p>• Make math equations with number cards to draw more</p>
                    </div>
                </div>

                {/* Connection Status Indicator */}
                {state.connectionStatus !== 'disconnected' && (
                    <div className="flex items-center justify-center space-x-2 text-sm">
                        <div className={`w-2 h-2 rounded-full ${
                            state.connectionStatus === 'connected' ? 'bg-green-400' :
                                state.connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                                    'bg-red-400'
                        }`} />
                        <span className="text-gray-300">
              {state.connectionStatus === 'connected' ? 'Connected' :
                  state.connectionStatus === 'connecting' ? 'Connecting...' :
                      'Connection error'}
            </span>
                    </div>
                )}

                {state.lastError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{state.lastError}</p>
                        <button
                            onClick={clearError}
                            className="text-red-400 text-xs underline mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <Button
                    onClick={handleCreateGame}
                    loading={isCreating || state.loading}
                    disabled={!user}
                    size="lg"
                    className="w-full"
                >
                    Create Game
                </Button>

                {!user && (
                    <p className="text-center text-gray-400 text-sm">
                        Please log in to create a game
                    </p>
                )}
            </div>
        </Card>
    );
}

export function CreateGame() {
    return (
        <GameStateProvider>
            <CreateGameContent />
        </GameStateProvider>
    );
}