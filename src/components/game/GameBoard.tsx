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
    ChevronUp,
    Menu,
    ChevronLeft
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
    const [showLeaderboard, setShowLeaderboard] = useState(false);

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 relative">
            {/* Collapsible Leaderboard Sidebar */}
            <div className={clsx(
                'fixed left-0 top-0 h-full z-40 transition-transform duration-300 ease-in-out',
                showLeaderboard ? 'translate-x-0' : '-translate-x-full'
            )}>
                <div className="h-full w-64 bg-black/80 backdrop-blur-md border-r border-white/20 flex flex-col">
                    {/* Leaderboard Header */}
                    <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-white flex items-center space-x-2">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            <span>Leaderboard</span>
                        </h3>
                        <button
                            onClick={() => setShowLeaderboard(false)}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4 text-white/60" />
                        </button>
                    </div>
                    
                    {/* Leaderboard Content */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        <div className="space-y-2">
                            {players
                                .sort((a: any, b: any) => calculatePlayerScore(b) - calculatePlayerScore(a))
                                .map((player: any, index: number) => {
                                    const isCurrentTurn = currentPlayer?.id === player.id;
                                    const score = calculatePlayerScore(player);
                                    const queensCount = player.queens?.length || 0;
                                    const isUser = user?.username === player.name;

                                    return (
                                        <div
                                            key={player.id}
                                            className={clsx(
                                                'py-2 px-3 rounded-md transition-colors',
                                                {
                                                    'bg-green-500/20 border border-green-400/30': isCurrentTurn,
                                                    'hover:bg-white/10': !isCurrentTurn,
                                                }
                                            )}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center space-x-2">
                                                    {/* Rank */}
                                                    <div className={clsx(
                                                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
                                                        index === 0 ? 'bg-yellow-500/30 text-yellow-300' :
                                                        index === 1 ? 'bg-gray-400/30 text-gray-300' :
                                                        index === 2 ? 'bg-orange-500/30 text-orange-300' :
                                                        'bg-white/20 text-white/60'
                                                    )}>
                                                        {index + 1}
                                                    </div>
                                                    
                                                    {/* Name with turn indicator */}
                                                    <div className="flex items-center space-x-1">
                                                        {isCurrentTurn && (
                                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                        )}
                                                        <span className={clsx(
                                                            'text-sm font-medium',
                                                            isCurrentTurn ? 'text-green-300' : 'text-white',
                                                            isUser && 'underline'
                                                        )}>
                                                            {player.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Stats */}
                                            <div className="flex items-center justify-between text-xs ml-7">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex items-center space-x-1">
                                                        <Crown className="h-3 w-3 text-purple-300" />
                                                        <span className="text-purple-200">{queensCount}</span>
                                                    </div>
                                                    <div className="flex items-center space-x-1">
                                                        <Trophy className="h-3 w-3 text-yellow-300" />
                                                        <span className="text-yellow-200 font-medium">{score}pt</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                    
                    {/* Win Conditions Footer */}
                    <div className="px-4 py-3 border-t border-white/20">
                        <div className="text-xs text-gray-400">
                            <div className="flex items-center space-x-1">
                                <Target className="h-3 w-3" />
                                <span>Win: {gameStats?.queensRequired} queens OR {gameStats?.pointsRequired} points</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toggle Button - Always Visible */}
            <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={clsx(
                    'fixed left-4 top-4 z-50 p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-black/80 transition-all',
                    showLeaderboard && 'left-[272px]'
                )}
            >
                <Menu className="h-5 w-5 text-white" />
            </button>

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
                                    
                                    {/* Win Conditions */}
                                    {gameStats && (
                                        <div className="mb-4 p-3 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                                            <div className="flex items-center space-x-2 text-purple-300">
                                                <Crown className="h-4 w-4" />
                                                <span className="text-sm font-medium">Win Condition: {gameStats.queensRequired} queens OR {gameStats.pointsRequired} points</span>
                                            </div>
                                        </div>
                                    )}
                                    
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
                </div>

                {/* Main Game Area Layout */}
                <div className="flex items-start justify-center gap-8">
                    {/* Left Side Players */}
                    <div className="flex flex-col space-y-4 w-64">
                        {players.filter((player: any) => player.id !== user?.id).slice(0, 2).map((player: any, index: number) => {
                            const isCurrentTurn = currentPlayer?.id === player.id;
                            
                            return (
                                <div key={player.id} className="w-full">
                                    <div className={clsx(
                                        'bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4',
                                        {
                                            'bg-green-500/10 border-green-400/30': isCurrentTurn,
                                        }
                                    )}>
                                        {/* Player Header */}
                                        <div className="flex items-center space-x-2 mb-3">
                                            {isCurrentTurn && (
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            )}
                                            <span className={clsx(
                                                'text-sm font-medium',
                                                isCurrentTurn ? 'text-green-300' : 'text-white'
                                            )}>
                                                {player.name}
                                            </span>
                                        </div>

                                        {/* Player Stats */}
                                        <div className="flex items-center space-x-4 text-xs mb-3">
                                            <div className="flex items-center space-x-1">
                                                <Crown className="h-3 w-3 text-purple-300" />
                                                <span className="text-purple-200">{player.queens?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Trophy className="h-3 w-3 text-yellow-300" />
                                                <span className="text-yellow-200">{calculatePlayerScore(player)}pt</span>
                                            </div>
                                        </div>

                                        {/* Player's Queens (for targeting with knights) - Space for up to 4 */}
                                        <div className="space-y-2">
                                            <div className="text-xs text-gray-400">Queens:</div>
                                            <div className="grid grid-cols-2 gap-2 min-h-[80px]">
                                                {player.queens && player.queens.length > 0 ? (
                                                    player.queens.map((queen: any) => {
                                                        const isTargetable = canSelectQueenForKnight;
                                                        const isSelected = selectedQueen?.id === queen.id;
                                                        
                                                        return (
                                                            <div
                                                                key={queen.id}
                                                                onClick={isTargetable ? () => handleQueenSelect(queen) : undefined}
                                                                className={clsx(
                                                                    'w-full h-16 rounded-lg border text-xs flex flex-col items-center justify-center transition-all relative',
                                                                    {
                                                                        'border-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 hover:scale-105': isTargetable,
                                                                        'border-purple-400 bg-purple-500/10': !isTargetable,
                                                                        'ring-2 ring-red-400 scale-105': isSelected,
                                                                    }
                                                                )}
                                                                title={`${queen.name} (${queen.points} points)`}
                                                            >
                                                                <Crown className="h-4 w-4 text-purple-300 mb-1" />
                                                                <span className="text-[0.6rem] text-center leading-tight">{queen.name}</span>
                                                                <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[0.5rem] px-1 rounded-full font-bold">
                                                                    {queen.points}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-2 flex items-center justify-center h-16 text-gray-500 text-xs">
                                                        No queens yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Central Play Area - Sleeping Queens */}
                    <div className="flex-shrink-0">
                        <SleepingQueens
                            sleepingQueens={sleepingQueens}
                            selectedQueen={selectedQueen}
                            onQueenSelect={handleQueenSelect}
                            canSelectQueen={canSelectQueenForKing}
                            discardPile={gameState?.discardPile || []}
                            drawPile={gameState?.drawPile || []}
                        />
                    </div>

                    {/* Right Side Players */}
                    <div className="flex flex-col space-y-4 w-64">
                        {players.filter((player: any) => player.id !== user?.id).slice(2, 4).map((player: any, index: number) => {
                            const isCurrentTurn = currentPlayer?.id === player.id;
                            
                            return (
                                <div key={player.id} className="w-full">
                                    <div className={clsx(
                                        'bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4',
                                        {
                                            'bg-green-500/10 border-green-400/30': isCurrentTurn,
                                        }
                                    )}>
                                        {/* Player Header */}
                                        <div className="flex items-center space-x-2 mb-3">
                                            {isCurrentTurn && (
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            )}
                                            <span className={clsx(
                                                'text-sm font-medium',
                                                isCurrentTurn ? 'text-green-300' : 'text-white'
                                            )}>
                                                {player.name}
                                            </span>
                                        </div>

                                        {/* Player Stats */}
                                        <div className="flex items-center space-x-4 text-xs mb-3">
                                            <div className="flex items-center space-x-1">
                                                <Crown className="h-3 w-3 text-purple-300" />
                                                <span className="text-purple-200">{player.queens?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <Trophy className="h-3 w-3 text-yellow-300" />
                                                <span className="text-yellow-200">{calculatePlayerScore(player)}pt</span>
                                            </div>
                                        </div>

                                        {/* Player's Queens (for targeting with knights) - Space for up to 4 */}
                                        <div className="space-y-2">
                                            <div className="text-xs text-gray-400">Queens:</div>
                                            <div className="grid grid-cols-2 gap-2 min-h-[80px]">
                                                {player.queens && player.queens.length > 0 ? (
                                                    player.queens.map((queen: any) => {
                                                        const isTargetable = canSelectQueenForKnight;
                                                        const isSelected = selectedQueen?.id === queen.id;
                                                        
                                                        return (
                                                            <div
                                                                key={queen.id}
                                                                onClick={isTargetable ? () => handleQueenSelect(queen) : undefined}
                                                                className={clsx(
                                                                    'w-full h-16 rounded-lg border text-xs flex flex-col items-center justify-center transition-all relative',
                                                                    {
                                                                        'border-red-400 bg-red-500/10 cursor-pointer hover:bg-red-500/20 hover:scale-105': isTargetable,
                                                                        'border-purple-400 bg-purple-500/10': !isTargetable,
                                                                        'ring-2 ring-red-400 scale-105': isSelected,
                                                                    }
                                                                )}
                                                                title={`${queen.name} (${queen.points} points)`}
                                                            >
                                                                <Crown className="h-4 w-4 text-purple-300 mb-1" />
                                                                <span className="text-[0.6rem] text-center leading-tight">{queen.name}</span>
                                                                <div className="absolute top-1 right-1 bg-yellow-500 text-black text-[0.5rem] px-1 rounded-full font-bold">
                                                                    {queen.points}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="col-span-2 flex items-center justify-center h-16 text-gray-500 text-xs">
                                                        No queens yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Your Play Area - Below the center */}
                <div className="flex justify-center mt-8">
                        {players.filter((player: any) => player.id === user?.id).map((player: any) => {
                            const isCurrentTurn = currentPlayer?.id === player.id;
                            const isCurrentPlayer = true; // This is always the current player

                            return (
                                <div key={player.id} className="w-full max-w-6xl">
                                    <div className={clsx(
                                        'bg-blue-500/5 backdrop-blur-sm rounded-lg border border-blue-400/20 p-4',
                                        {
                                            'bg-green-500/10 border-green-400/30': isCurrentTurn,
                                        }
                                    )}>
                                        {/* Compact Stats Bar */}
                                        <div className="flex items-center justify-center space-x-6 text-sm mb-4">
                                            {isCurrentTurn && (
                                                <div className="flex items-center space-x-2 px-3 py-1 bg-green-500/20 rounded-full">
                                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                    <span className="text-green-300 text-xs font-medium">Your Turn</span>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-2">
                                                <Crown className="h-4 w-4 text-purple-300" />
                                                <span className="text-purple-200">{player.queens?.length || 0}</span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Trophy className="h-4 w-4 text-yellow-300" />
                                                <span className="text-yellow-200 font-medium">{calculatePlayerScore(player)}pt</span>
                                            </div>
                                        </div>

                                        {/* Your Queens Display */}
                                        {player.queens && player.queens.length > 0 && (
                                            <div className="mb-4">
                                                <div className="text-sm text-gray-400 text-center mb-2">Your Queens:</div>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {player.queens.map((queen: any) => (
                                                        <div
                                                            key={queen.id}
                                                            className="relative"
                                                        >
                                                            <div className="w-12 h-16 rounded border-2 border-purple-400 bg-purple-500/10 flex items-center justify-center">
                                                                <Crown className="h-4 w-4 text-purple-300" />
                                                            </div>
                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                                                                <span className="text-xs font-bold text-black">{queen.points}</span>
                                                            </div>
                                                            <div className="text-xs text-center mt-1 text-purple-200 max-w-12 truncate">
                                                                {queen.name}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Your Hand */}
                                        <PlayerHand
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
                                    </div>
                                </div>
                            );
                        })}
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