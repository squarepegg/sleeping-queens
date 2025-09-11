import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Card, Queen, Player, GameMove, NumberCard } from '../../game/types';
import { useGameState } from '../../lib/context/GameStateContext';
import { useAuth } from '../../lib/hooks/useAuth';
import { GAME_CONFIG } from '../../game/cards';
import { SleepingQueens } from './SleepingQueens';
import { PlayerHand } from './PlayerHand';
import {
    Crown,
    Users,
    Trophy,
    Clock,
    Target,
    Sword,
    Shield,
    Wand2,
    Beaker,
    AlertCircle,
    CheckCircle,
    X,
    PlayCircle,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// Import these if they exist, otherwise use the placeholders below
import { Button } from '../ui/Button';

// Placeholder components - replace these with actual imports when available
const Modal = ({ children, isOpen, onClose, title }: any) =>
    isOpen ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    ) : null;

// Utility function
const calculatePlayerScore = (player: Player) => {
    return player.queens?.reduce((sum, queen) => sum + (queen.points || 0), 0) || 0;
};

interface GameBoardProps {}

export function GameBoard({}: GameBoardProps) {
    const { user } = useAuth();
    const {
        state,
        playMove,
        canPlayMove,
        currentPlayer,
        isMyTurn,
        canPlayDragon,
        getPendingKnightAttack,
        blockKnightAttack,
        allowKnightAttack
    } = useGameState();

    const gameState = state.gameState;
    
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    const [selectedQueen, setSelectedQueen] = useState<Queen | null>(null);
    const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<Player | null>(null);
    const [gameAction, setGameAction] = useState<string | null>(null);
    const [stagedCard, setStagedCard] = useState<Card | null>(null);
    const [showWinModal, setShowWinModal] = useState(false);
    const [showGameInfo, setShowGameInfo] = useState(false);

    const players = gameState?.players || [];
    const sleepingQueens = gameState?.sleepingQueens || [];
    const currentGamePlayer = players.find((p: any) => p.id === user?.id);

    // Game statistics
    const gameStats = useMemo(() => {
        if (!gameState) return null;

        const playerCount = players.length;
        const queensRequired = GAME_CONFIG.queensToWin[playerCount] || 4;
        const pointsRequired = GAME_CONFIG.pointsToWin[playerCount] || 40;

        return { queensRequired, pointsRequired };
    }, [gameState, players.length]);

    // Handle card selection
    const handleCardSelect = useCallback((card: Card) => {
        setSelectedCards(prev => {
            const isSelected = prev.some(c => c.id === card.id);
            if (isSelected) {
                return prev.filter(c => c.id !== card.id);
            } else {
                return [...prev, card];
            }
        });
    }, []);

    // Handle queen selection
    const handleQueenSelect = useCallback((queen: Queen | null) => {
        setSelectedQueen(queen);

        if (!queen || selectedCards.length !== 1) return;

        // Check if we have a king selected to play (targeting sleeping queens)
        const selectedKing = selectedCards.find(card => card.type === 'king');
        if (selectedKing && !queen.isAwake) {
            (async () => {
                if (!gameState || !user || !currentGamePlayer) return;

                console.log('Playing king move:', { selectedKing, queen });

                const move: GameMove = {
                    type: 'play_king',
                    playerId: user.id,
                    cards: [selectedKing],
                    targetCard: queen,
                    timestamp: Date.now(),
                };

                const result = await playMove(move);
                console.log('King move result:', result);

                if (result.isValid) {
                    setSelectedCards([]);
                    setSelectedQueen(null);
                    setSelectedTargetPlayer(null);
                    setGameAction(null);
                    setStagedCard(null);
                } else {
                    console.error('King move failed:', result.error);
                }
            })();
        }

        // Check if we have a knight selected to play (targeting awake queens)
        const selectedKnight = selectedCards.find(card => card.type === 'knight');
        if (selectedKnight && queen.isAwake) {
            const queenOwner = players.find((p: any) => p.queens?.some((q: any) => q.id === queen.id));
            if (queenOwner && queenOwner.id !== user?.id) {
                (async () => {
                    if (!gameState || !user || !currentGamePlayer) return;

                    console.log('Playing knight move:', { selectedKnight, queen, queenOwner });

                    const move: GameMove = {
                        type: 'play_knight',
                        playerId: user.id,
                        cards: [selectedKnight],
                        targetCard: queen,
                        targetPlayer: queenOwner,
                        timestamp: Date.now(),
                    };

                    const result = await playMove(move);
                    console.log('Knight move result:', result);

                    if (result.isValid) {
                        setSelectedCards([]);
                        setSelectedQueen(null);
                        setSelectedTargetPlayer(null);
                        setGameAction(null);
                        setStagedCard(null);
                    } else {
                        console.error('Knight move failed:', result.error);
                    }
                })();
            }
        }
    }, [selectedCards, gameState, user, currentGamePlayer, players, playMove]);

    // Play cards with specific action
    const handlePlayCards = useCallback(async (cards: Card[], action: string) => {
        if (!gameState || !user || !currentGamePlayer) return;

        // Determine the correct move type based on the cards and action
        let moveType: GameMove['type'];
        
        if (action === 'play') {
            if (cards.length === 1) {
                const card = cards[0];
                if (['king', 'knight', 'dragon', 'wand', 'potion', 'jester'].includes(card.type)) {
                    moveType = `play_${card.type}` as GameMove['type'];
                } else {
                    console.error('Invalid single card type for play action:', card.type);
                    return;
                }
            } else if (cards.length >= 3 && cards.every(c => c.type === 'number')) {
                moveType = 'play_math';
            } else {
                console.error('Invalid card combination for play action');
                return;
            }
        } else {
            moveType = action as GameMove['type'];
        }

        const move: GameMove = {
            type: moveType,
            playerId: user.id,
            cards,
            timestamp: Date.now(),
        };

        const result = await playMove(move);
        if (result.isValid) {
            setSelectedCards([]);
            setSelectedQueen(null);
            setSelectedTargetPlayer(null);
            setGameAction(null);
            setStagedCard(null);
        } else {
            console.error('Play move failed:', result.error);
        }
    }, [gameState, user, currentGamePlayer, playMove]);

    // Handle discard
    const handleDiscardCards = useCallback(async (cards: Card[]) => {
        if (!user) return;

        const move: GameMove = {
            type: 'discard',
            playerId: user.id,
            cards,
            timestamp: Date.now(),
        };

        const result = await playMove(move);
        if (result.isValid) {
            setSelectedCards([]);
        }
    }, [user, playMove]);

    // Determine possible actions
    const possibleActions = useMemo(() => {
        if (!selectedCards.length || !isMyTurn) return [];

        const actions: string[] = [];

        const hasKing = selectedCards.some(c => c.type === 'king');
        const hasKnight = selectedCards.some(c => c.type === 'knight');
        const hasNumbers = selectedCards.filter(c => c.type === 'number').length;

        if (hasKing) {
            actions.push('play_king');
        }
        if (hasKnight) {
            actions.push('play_knight');
        }
        if (hasNumbers >= 3) {
            actions.push('play_math');
        }

        return actions;
    }, [selectedCards, isMyTurn]);

    const canSelectQueenForKing = possibleActions.includes('play_king');
    const canSelectQueenForKnight = possibleActions.includes('play_knight');

    if (!gameState) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white">Loading game...</p>
                </div>
            </div>
        );
    }

    if (gameState?.phase !== 'playing') {
        return null;
    }

    const winner = gameState?.winner ? players.find((p: any) => p.id === gameState.winner) : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Game Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-2xl font-bold text-white">Sleeping Queens</h1>
                            <div className="flex items-center space-x-2 px-3 py-1 bg-white/10 rounded-lg">
                                <Users className="h-4 w-4 text-gray-300" />
                                <span className="text-sm text-gray-300">{players.length} players</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowGameInfo(!showGameInfo)}
                                className="text-gray-400 hover:text-white"
                            >
                                <Info className="h-4 w-4" />
                            </Button>
                        </div>

                        {gameStats && (
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center space-x-2 px-3 py-1 bg-purple-500/20 rounded-lg">
                                    <Crown className="h-4 w-4 text-purple-300" />
                                    <span className="text-purple-200">Win: {gameStats.queensRequired} queens OR {gameStats.pointsRequired} points</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Game Info Panel */}
                    <AnimatePresence>
                        {showGameInfo && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="mb-4 overflow-hidden"
                            >
                                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                                    <h3 className="text-lg font-semibold text-white mb-3">Game Status</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <div className="flex items-center space-x-2 text-blue-300 mb-2">
                                                <Clock className="h-4 w-4" />
                                                <span className="font-medium">Current Turn</span>
                                            </div>
                                            <p className="text-gray-300">
                                                {currentPlayer?.name || 'Loading...'} 
                                                {isMyTurn && <span className="ml-2 text-green-300 font-medium">(You)</span>}
                                            </p>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 text-purple-300 mb-2">
                                                <Crown className="h-4 w-4" />
                                                <span className="font-medium">Queens Remaining</span>
                                            </div>
                                            <p className="text-gray-300">{sleepingQueens.length} sleeping</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2 text-orange-300 mb-2">
                                                <Target className="h-4 w-4" />
                                                <span className="font-medium">Discard Pile</span>
                                            </div>
                                            <p className="text-gray-300">
                                                {gameState?.discardPile?.length > 0 ? (
                                                    <span className="font-mono">
                                                        Top: {(() => {
                                                            const topCard = gameState.discardPile[gameState.discardPile.length - 1];
                                                            if (topCard.type === 'number') {
                                                                return `${topCard.value || topCard.name}`;
                                                            }
                                                            return topCard.name || topCard.type;
                                                        })()}
                                                    </span>
                                                ) : (
                                                    'None'
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Player Scores */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {players.map((player: any) => {
                            const isCurrentTurn = currentPlayer?.id === player.id;
                            const score = calculatePlayerScore(player);
                            const queensCount = player.queens?.length || 0;
                            const isUser = user?.username === player.name;

                            return (
                                <div
                                    key={player.id}
                                    className={clsx(
                                        'p-3 rounded-lg border',
                                        isCurrentTurn
                                            ? 'bg-green-500/20 border-green-400/50 ring-2 ring-green-400/30'
                                            : 'bg-white/10 border-white/20',
                                        isUser && 'ring-2 ring-blue-400/50'
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={clsx(
                                            'font-medium',
                                            isCurrentTurn ? 'text-green-300' : 'text-white',
                                            isUser && 'underline'
                                        )}>
                                            {player.name}
                                        </span>
                                        {isCurrentTurn && (
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                <span className="text-xs text-green-300">Turn</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center space-x-2">
                                            <Crown className="h-3 w-3 text-purple-300" />
                                            <span className="text-purple-200">{queensCount}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Trophy className="h-3 w-3 text-yellow-300" />
                                            <span className="text-yellow-200 font-medium">{score}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Game Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Sleeping Queens */}
                    <div className="lg:col-span-1">
                        <SleepingQueens
                            sleepingQueens={sleepingQueens}
                            selectedQueen={selectedQueen}
                            onQueenSelect={handleQueenSelect}
                            canSelectQueen={canSelectQueenForKing}
                            className="mb-6"
                        />
                    </div>

                    {/* Middle Column - Player Hands */}
                    <div className="lg:col-span-2 space-y-4">
                        {players.map((player: any) => {
                            const isCurrentTurn = currentPlayer?.id === player.id;
                            const isCurrentPlayer = user?.id === player.id;

                            return (
                                <PlayerHand
                                    key={player.id}
                                    player={player}
                                    isCurrentPlayer={isCurrentPlayer}
                                    isCurrentTurn={isCurrentTurn}
                                    selectedCards={selectedCards}
                                    onCardSelect={handleCardSelect}
                                    onPlayCards={handlePlayCards}
                                    onDiscardCards={handleDiscardCards}
                                    canSelectQueen={canSelectQueenForKnight}
                                    selectedQueen={selectedQueen}
                                    onQueenSelect={handleQueenSelect}
                                />
                            );
                        })}
                    </div>
                </div>

                {/* Dragon Blocking Modal */}
                {(() => {
                    const pendingAttack = getPendingKnightAttack();
                    const canBlock = user && canPlayDragon(user.id);
                    const showDragonModal = pendingAttack && canBlock;

                    if (!showDragonModal) return null;

                    const attacker = gameState?.players?.find((p: any) => p.id === pendingAttack.attacker);
                    const targetQueen = pendingAttack.targetQueen;

                    return (
                        <Modal
                            isOpen={true}
                            onClose={() => {}} // Can't close without choosing
                            title="Knight Attack!"
                        >
                            <div className="text-center py-4">
                                <div className="mb-4">
                                    <Sword className="h-12 w-12 text-red-500 mx-auto mb-2" />
                                    <p className="text-gray-700">
                                        <strong>{attacker?.name}</strong> is attacking your queen <strong>{targetQueen?.name}</strong> with a Knight!
                                    </p>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                    <div className="flex items-start">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                                        <div className="ml-3">
                                            <p className="text-sm text-yellow-700">
                                                <strong>You have a Dragon!</strong> You can block this attack or let it happen.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <Button
                                        onClick={async () => {
                                            if (pendingAttack) await blockKnightAttack();
                                        }}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        🐉 Play Dragon (Block Attack)
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (pendingAttack) await allowKnightAttack();
                                        }}
                                        variant="secondary"
                                        className="flex-1"
                                    >
                                        Allow Attack
                                    </Button>
                                </div>
                            </div>
                        </Modal>
                    );
                })()}

                {/* Win Modal */}
                <Modal
                    isOpen={showWinModal}
                    onClose={() => setShowWinModal(false)}
                    title="Game Over!"
                >
                    <div className="text-center py-6">
                        <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {winner?.name} Wins!
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Congratulations on collecting enough queens and points!
                        </p>

                        <Button
                            onClick={() => window.location.href = '/lobby'}
                            size="lg"
                        >
                            Back to Lobby
                        </Button>
                    </div>
                </Modal>
            </div>
        </div>
    );
}