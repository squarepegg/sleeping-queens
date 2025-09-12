import { useState, useEffect } from 'react';
import { Copy, Crown, Users, Play, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useGameState } from '../../lib/context/GameStateContext';
import { useAuth } from '../../lib/hooks/useAuth';
import { GAME_CONFIG } from '../../game/cards';

export function GameLobby() {
    const { user } = useAuth();
    const { state, isHost, startGame, clearError } = useGameState();
    const [copied, setCopied] = useState(false);
    const [isStarting, setIsStarting] = useState(false);

    const gameState = state.gameState;
    
    console.log('[GameLobby] Rendering GameLobby component');
    console.log('[GameLobby] Game state:', gameState ? 'exists' : 'null');
    console.log('[GameLobby] Game phase:', gameState?.phase);
    console.log('[GameLobby] Players count:', gameState?.players?.length);

    const handleCopyRoomCode = async () => {
        if (!gameState?.roomCode) return;

        try {
            await navigator.clipboard.writeText(gameState.roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy room code:', error);
        }
    };

    const handleStartGame = async () => {
        if (!isHost || !gameState) return;

        setIsStarting(true);
        clearError();

        try {
            console.log('[GameLobby] Starting game...');
            const success = await startGame();

            if (success) {
                console.log('[GameLobby] Game started successfully');
                // The game state will update via realtime, triggering a re-render
            } else {
                console.error('[GameLobby] Failed to start game');
            }
        } catch (error) {
            console.error('[GameLobby] Error starting game:', error);
        } finally {
            setIsStarting(false);
        }
    };

    const canStartGame = gameState &&
        gameState.players.length >= GAME_CONFIG.minPlayers &&
        gameState.phase === 'waiting' &&
        isHost &&
        !isStarting;

    // Show loading state
    if (state.loading || !gameState) {
        return (
            <Card variant="glass" className="w-full max-w-2xl mx-auto text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Loading game...</p>
                {state.connectionStatus === 'connecting' && (
                    <p className="text-gray-400 text-sm mt-2">Establishing connection...</p>
                )}
            </Card>
        );
    }

    // Don't render lobby if game has started
    if (gameState.phase === 'playing') {
        return null;
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Connection Status Banner */}
            {state.connectionStatus !== 'connected' && (
                <div className={`rounded-lg p-3 flex items-center space-x-2 ${
                    state.connectionStatus === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                        'bg-yellow-500/10 border border-yellow-500/20'
                }`}>
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">
            {state.connectionStatus === 'error' ? 'Connection lost. Attempting to reconnect...' :
                state.connectionStatus === 'connecting' ? 'Connecting to game server...' :
                    'Disconnected from game'}
          </span>
                </div>
            )}

            {/* Room Info Card */}
            <Card variant="glass">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Game Lobby</h1>
                    <div className="flex items-center justify-center space-x-4">
                        <div className="flex items-center bg-white/10 rounded-lg px-4 py-2">
                            <span className="text-gray-300 text-sm mr-2">Room Code:</span>
                            <span className="font-mono text-lg font-bold text-white tracking-widest">
                {gameState.roomCode}
              </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopyRoomCode}
                                className="ml-2 p-1"
                            >
                                <Copy className={`h-4 w-4 ${copied ? 'text-green-400' : 'text-gray-400'}`} />
                            </Button>
                        </div>
                    </div>
                    {copied && (
                        <p className="text-green-400 text-sm mt-2">Room code copied!</p>
                    )}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Players List */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                            <Users className="h-5 w-5 mr-2" />
                            Players ({gameState.players.length}/{gameState.maxPlayers})
                        </h2>
                        <div className="space-y-3">
                            {gameState.players.map((player, index) => (
                                <div
                                    key={player.id}
                                    className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                                >
                                    <div className="flex items-center">
                                        {index === 0 && (
                                            <Crown className="h-4 w-4 text-yellow-400 mr-2" />
                                        )}
                                        <span className="font-medium text-white">{player.name}</span>
                                        {player.name === user?.username && (
                                            <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        You
                      </span>
                                        )}
                                    </div>
                                    <div className="flex items-center">
                                        {player.isConnected ? (
                                            <UserCheck className="h-4 w-4 text-green-400" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-yellow-400" />
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Empty slots */}
                            {Array.from({ length: gameState.maxPlayers - gameState.players.length }).map((_, index) => (
                                <div
                                    key={`empty-${index}`}
                                    className="flex items-center justify-center bg-white/5 rounded-lg p-3 border border-dashed border-white/20"
                                >
                                    <span className="text-gray-400 text-sm">Waiting for player...</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Game Info */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-4">Game Rules</h2>
                        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="space-y-3 text-sm text-gray-300">
                                <div className="flex items-center justify-between">
                                    <span>Players needed to start:</span>
                                    <span className="font-medium text-white">
                    {GAME_CONFIG.minPlayers}-{gameState.maxPlayers}
                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Queens to win:</span>
                                    <span className="font-medium text-white">
                    {GAME_CONFIG.queensToWin[gameState.players.length] || 4}
                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span>Points to win:</span>
                                    <span className="font-medium text-white">
                    {GAME_CONFIG.pointsToWin[gameState.players.length] || 40}
                  </span>
                                </div>
                                <div className="pt-3 border-t border-white/10">
                                    <p className="text-xs text-gray-400">
                                        Wake sleeping queens with Kings, steal with Knights,
                                        defend with Dragons, and make math equations to draw cards!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {state.lastError && (
                    <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{state.lastError}</p>
                        <button
                            onClick={clearError}
                            className="text-red-400 text-xs underline mt-1"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                <div className="mt-6 flex justify-center">
                    {isHost ? (
                        <Button
                            onClick={handleStartGame}
                            disabled={!canStartGame}
                            loading={isStarting}
                            size="lg"
                            className="px-8"
                        >
                            <Play className="h-5 w-5 mr-2" />
                            Start Game
                            {gameState.players.length < GAME_CONFIG.minPlayers && (
                                <span className="ml-2 text-sm opacity-75">
                  (Need {GAME_CONFIG.minPlayers - gameState.players.length} more)
                </span>
                            )}
                        </Button>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-300">
                                Waiting for host to start the game...
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                                {gameState.players.length >= GAME_CONFIG.minPlayers
                                    ? 'Ready to start!'
                                    : `Need ${GAME_CONFIG.minPlayers - gameState.players.length} more players`
                                }
                            </p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Instructions Card */}
            <Card variant="glass">
                <h3 className="text-lg font-semibold text-white mb-3">How to Play</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                        <h4 className="font-medium text-white mb-2">Card Types:</h4>
                        <ul className="space-y-1">
                            <li>🟣 <strong>Queens:</strong> Collect to win points</li>
                            <li>👑 <strong>Kings:</strong> Wake up sleeping queens</li>
                            <li>⚔️ <strong>Knights:</strong> Steal opponents' queens</li>
                            <li>🐉 <strong>Dragons:</strong> Block knight attacks</li>
                            <li>🪄 <strong>Wands:</strong> Put queens back to sleep</li>
                            <li>🧪 <strong>Potions:</strong> Put your own queens to sleep</li>
                            <li>🔢 <strong>Numbers:</strong> Make math equations</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-medium text-white mb-2">How to Win:</h4>
                        <ul className="space-y-1">
                            <li>• Collect the required number of queens</li>
                            <li>• OR reach the required point total</li>
                            <li>• Different queens have different point values</li>
                            <li>• Use strategy to protect your queens!</li>
                        </ul>
                    </div>
                </div>
            </Card>
        </div>
    );
}