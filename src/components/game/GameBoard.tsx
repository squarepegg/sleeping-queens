import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Card, Queen, Player, GameMove, NumberCard } from '../../game/types';
import { useGameState } from '../../lib/context/GameStateContext';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { GAME_CONFIG, createSleepingQueens } from '../../game/cards';
import { findMathEquations, formatMathEquation } from '../../game/utils';
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
    Zap,
    AlertCircle,
    CheckCircle,
    X,
    PlayCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Menu,
    ChevronLeft,
    ChevronRight
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

// Defense Countdown Timer Component
function DefenseCountdown({ getRemainingDefenseTime }: { getRemainingDefenseTime: () => number }) {
    const [remainingTime, setRemainingTime] = useState(getRemainingDefenseTime());
    
    useEffect(() => {
        const interval = setInterval(() => {
            const remaining = getRemainingDefenseTime();
            setRemainingTime(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 100); // Update every 100ms for smooth countdown
        
        return () => clearInterval(interval);
    }, [getRemainingDefenseTime]);
    
    const seconds = Math.ceil(remainingTime / 1000);
    const percentage = Math.max(0, (remainingTime / 5000) * 100);
    
    return (
        <div className="mb-4">
            <div className="text-center mb-2">
                <span className="text-lg font-bold text-red-600">
                    {seconds}s remaining
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

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
        allowKnightAttack,
        getRemainingDefenseTime
    } = useGameState();

    const gameState = state.gameState;
    
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    const [selectedQueen, setSelectedQueen] = useState<Queen | null>(null);
    const [selectedTargetPlayer, setSelectedTargetPlayer] = useState<Player | null>(null);
    const [gameAction, setGameAction] = useState<string | null>(null);
    
    // Will define staged card logic after players is defined
    
    // Local staging for immediate feedback before server processing
    const [localStagedCards, setLocalStagedCards] = useState<{cards: Card[], action: string} | null>(null);
    
    // Move history for displaying recent actions
    const [moveHistory, setMoveHistory] = useState<{message: string, timestamp: number, playerId: string}[]>([]);
    
    // Add move to history
    const addMoveToHistory = useCallback((message: string, playerId: string) => {
        const newMove = {message, timestamp: Date.now(), playerId};
        setMoveHistory(prev => [newMove, ...prev.slice(0, 4)]); // Keep last 5 moves
    }, []);

    // Define players early so it can be used in useEffect
    const players = gameState?.players || [];

    // Helper function to format move messages
    const formatMoveMessage = useCallback((move: any): string | null => {
        const playerName = players.find(p => p.id === move.playerId)?.name || 'Unknown';
        
        if (move.type === 'play_king' && move.targetCard) {
            const kingName = move.cards && move.cards[0] ? (move.cards[0].name || 'King') : 'King';
            return `${playerName} used the ${kingName} to wake up the ${move.targetCard.name}`;
        } else if (move.type === 'play_knight' && move.targetCard) {
            const knightName = move.cards && move.cards[0] ? (move.cards[0].name || 'Knight') : 'Knight';
            const targetPlayerName = players.find(p => p.id === move.targetPlayer)?.name || 'someone';
            return `${playerName} used the ${knightName} to steal the ${move.targetCard.name} from ${targetPlayerName}`;
        } else if (move.type === 'play_potion' && move.targetCard) {
            const potionName = move.cards && move.cards[0] ? (move.cards[0].name || 'Sleeping Potion') : 'Sleeping Potion';
            const targetPlayerName = players.find(p => p.id === move.targetPlayer)?.name || 'someone';
            return `${playerName} used the ${potionName} to put ${targetPlayerName}'s ${move.targetCard.name} to sleep`;
        } else if (move.type === 'play_math' && move.cards && move.mathEquation) {
            // Handle math equations specifically
            const equation = move.mathEquation;
            const equationString = `${equation.left} ${equation.operator} ${equation.right} = ${equation.result}`;
            return `${playerName} played equation ${equationString} and drew 2 cards`;
        } else if (move.type === 'play' && move.cards) {
            // Handle pairs and other plays
            if (move.cards.length === 2 && move.cards[0].value === move.cards[1].value) {
                return `${playerName} played a pair of ${move.cards[0].value}s and drew 2 cards`;
            } else if (move.cards.length >= 3) {
                return `${playerName} played a math equation and drew 2 cards`;
            } else {
                return `${playerName} played ${move.cards.length} card(s)`;
            }
        } else if (move.type === 'discard' && move.cards) {
            if (move.cards.length === 1) {
                const cardName = move.cards[0].name || move.cards[0].type || 'a card';
                return `${playerName} discarded ${cardName}`;
            } else {
                return `${playerName} discarded ${move.cards.length} cards`;
            }
        } else if (move.type === 'end_turn' || move.type === 'stage_card') {
            // Skip end turn moves and staging moves - they're not interesting
            return null;
        } else {
            console.log('Unhandled move type:', move.type, move);
            return `${playerName} made a move`;
        }
    }, [players]);

    // Fetch move history from Supabase
    useEffect(() => {
        if (!gameState?.id) return;

        const fetchMoveHistory = async () => {
            try {
                const response = await fetch(`/api/games/${gameState.id}/state`);
                const data = await response.json();
                
                if (data.recentMoves && Array.isArray(data.recentMoves)) {
                    const formattedMoves = data.recentMoves
                        .map((moveRecord: any) => {
                            const move = moveRecord.move_data;
                            const message = formatMoveMessage(move);
                            
                            if (!message) return null; // Skip null messages
                            
                            return {
                                message,
                                timestamp: new Date(moveRecord.created_at).getTime(),
                                playerId: move.playerId
                            };
                        })
                        .filter(Boolean) // Remove null entries
                        .slice(0, 5); // Keep last 5 moves
                    
                    setMoveHistory(formattedMoves);
                }
            } catch (error) {
                console.error('Failed to fetch move history:', error);
            }
        };

        fetchMoveHistory();

        // Subscribe to real-time move updates
        if (gameState?.id) {
            const subscription = supabase
                .channel(`game_moves:${gameState.id}`)
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'game_moves',
                        filter: `game_id=eq.${gameState.id}`
                    }, 
                    (payload) => {
                        const moveRecord = payload.new as any;
                        const move = moveRecord.move_data;
                        const message = formatMoveMessage(move);
                        
                        if (!message) return; // Skip null messages
                        
                        const newMove = {
                            message,
                            timestamp: new Date(moveRecord.created_at).getTime(),
                            playerId: move.playerId
                        };
                        
                        setMoveHistory(prev => [newMove, ...prev.slice(0, 4)]);
                    }
                )
                .subscribe();

            return () => {
                subscription.unsubscribe();
            };
        }
    }, [gameState?.id, players, formatMoveMessage]);

    const [showWinModal, setShowWinModal] = useState(false);
    const [showGameInfo, setShowGameInfo] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [draggedCard, setDraggedCard] = useState<Card | null>(null);
    const [playedKing, setPlayedKing] = useState<Card | null>(null);
    const sleepingQueens = gameState?.sleepingQueens || [];
    const currentGamePlayer = players.find((p: any) => p.id === user?.id);

    // Get staged cards from server state instead of local state
    const stagedCards = gameState?.stagedCard?.cards || [];
    const stagedCardPlayer = gameState?.stagedCard ? players.find(p => p.id === gameState.stagedCard!.playerId) : null;
    const stagedAction = gameState?.stagedCard?.action || '';
    
    // For backward compatibility, get the first staged card (for single card operations)
    const stagedCard = stagedCards.length > 0 ? stagedCards[0] : null;
    
    // Create initial layout by reconstructing from the full game state
    const initialQueensLayout = useMemo(() => {
        if (!gameState) return [];
        
        // Get the original order of all queens
        const allQueens = createSleepingQueens();
        
        // Create layout where queens that are still sleeping stay in their original position
        // and awakened queens become null
        return allQueens.map(originalQueen => {
            // Check if this queen is still sleeping
            const stillSleeping = sleepingQueens.find(q => q.id === originalQueen.id);
            return stillSleeping || null;
        });
    }, [gameState, sleepingQueens]);
    

    // Game statistics
    const gameStats = useMemo(() => {
        if (!gameState) return null;

        const playerCount = players.length;
        const queensRequired = GAME_CONFIG.queensToWin[playerCount] || 4;
        const pointsRequired = GAME_CONFIG.pointsToWin[playerCount] || 40;

        return { queensRequired, pointsRequired };
    }, [gameState, players.length]);

    // Handle drag and drop
    const handleDragStart = useCallback((card: Card) => {
        console.log('Drag started with card:', card);
        setDraggedCard(card);
    }, []);

    const handleDragEnd = useCallback(() => {
        setDraggedCard(null);
    }, []);


    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

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

        // If a King was played and a queen is selected, complete the move
        if (playedKing && queen) {
            (async () => {
                if (!gameState || !user || !currentGamePlayer) return;

                console.log('Playing king move with drag and drop:', { playedKing, queen });

                const move: GameMove = {
                    type: 'play_king',
                    playerId: user.id,
                    cards: [playedKing],
                    targetCard: queen,
                    timestamp: Date.now(),
                };

                const result = await playMove(move);
                console.log('King move result:', result);

                if (result.isValid) {
                    setSelectedCards([]);
                    setSelectedQueen(null);
                    setPlayedKing(null);
                    setSelectedTargetPlayer(null);
                    setGameAction(null);
                                    } else {
                    console.error('King move failed:', result.error);
                }
            })();
            return;
        }

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
                        targetPlayer: queenOwner.id,
                        timestamp: Date.now(),
                    };

                    const result = await playMove(move);
                    console.log('Knight move result:', result);

                    if (result.isValid) {
                        setSelectedCards([]);
                        setSelectedQueen(null);
                        setSelectedTargetPlayer(null);
                        setGameAction(null);
                                            } else {
                        console.error('Knight move failed:', result.error);
                    }
                })();
            }
        }

        // Check if we have a sleeping potion selected to play (targeting awake queens)
        const selectedPotion = selectedCards.find(card => card.type === 'potion');
        if (selectedPotion && queen.isAwake) {
            const queenOwner = players.find((p: any) => p.queens?.some((q: any) => q.id === queen.id));
            if (queenOwner && queenOwner.id !== user?.id) {
                (async () => {
                    if (!gameState || !user || !currentGamePlayer) return;

                    console.log('Playing sleeping potion move:', { selectedPotion, queen, queenOwner });

                    const move: GameMove = {
                        type: 'play_potion',
                        playerId: user.id,
                        cards: [selectedPotion],
                        targetCard: queen,
                        targetPlayer: queenOwner.id,
                        timestamp: Date.now(),
                    };

                    const result = await playMove(move);
                    console.log('Sleeping potion move result:', result);

                    if (result.isValid) {
                        setSelectedCards([]);
                        setSelectedQueen(null);
                        setSelectedTargetPlayer(null);
                        setGameAction(null);
                                            } else {
                        console.error('Sleeping potion move failed:', result.error);
                    }
                })();
            }
        }
    }, [selectedCards, gameState, user, currentGamePlayer, players, playMove, playedKing]);

    // Play cards with specific action
    const handlePlayCards = useCallback(async (cards: Card[], action: string) => {
        if (!gameState || !user || !currentGamePlayer) return;
        
        console.log('handlePlayCards called with:', { cards, action });
        console.log('Turn state at handlePlayCards:', {
            isMyTurn,
            currentPlayerId: currentPlayer?.id,
            userId: user?.id,
            currentPlayerIndex: gameState?.currentPlayerIndex,
            players: gameState?.players?.map(p => ({ id: p.id, name: p.name, position: p.position }))
        });

        // Check if it's still our turn before proceeding
        if (!isMyTurn) {
            console.log('Not your turn - aborting move');
            return;
        }

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
            } else if (cards.length === 2 && cards.every(c => c.type === 'number')) {
                // Check if it's a pair (same values) - pairs are discarded to get new cards
                const numberCards = cards as NumberCard[];
                if (numberCards[0].value === numberCards[1].value) {
                    moveType = 'discard';
                    console.log('Pair move detected (as discard):', {
                        cards: cards.map(c => ({ id: c.id, type: c.type, value: c.value })),
                        action,
                        moveType
                    });
                } else {
                    console.error('Two number cards must have same value to form a pair');
                    return;
                }
            } else if (cards.length >= 3 && cards.every(c => c.type === 'number')) {
                moveType = 'play_math';
                console.log('Math move detected:', {
                    cards: cards.map(c => ({ id: c.id, type: c.type, value: c.value })),
                    action,
                    moveType
                });
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

        // Add mathEquation property for math moves
        if (moveType === 'play_math') {
            const numberCards = cards.filter(c => c.type === 'number') as NumberCard[];
            const equations = findMathEquations(numberCards);
            if (equations.length > 0) {
                // Format the equation string (just use the first valid equation found)
                const equation = equations[0];
                const values = equation.map(c => c.value).sort((a, b) => a - b);
                const equationString = `${values[0]} + ${values[1]} = ${values[2]}`;
                
                move.mathEquation = {
                    cards: numberCards,
                    equation: equationString,
                    result: values[2]
                };
            }
        }

        console.log('Sending move to server:', move);
        console.log('Game state at send time:', {
            currentPlayerIndex: gameState.currentPlayerIndex,
            playerId: move.playerId,
            currentPlayer: gameState.players[gameState.currentPlayerIndex]
        });
        const result = await playMove(move);
        console.log('Server response:', result);
        
        if (result.isValid) {
            setSelectedCards([]);
            setSelectedQueen(null);
            setSelectedTargetPlayer(null);
            setGameAction(null);
                    } else {
            console.error('Play move failed:', result.error);
        }
    }, [gameState, user, currentGamePlayer, playMove]);

    // Handle discard
    // Helper function to determine if a discard should be staged for visual feedback
    const shouldStageDiscard = useCallback((cards: Card[]): boolean => {
        // Stage multi-card discards (pairs and equations) for visual feedback
        if (cards.length >= 2) {
            const numberCards = cards.filter(c => c.type === 'number') as NumberCard[];
            
            if (cards.length === 2) {
                // Pair: must be identical number cards
                return numberCards.length === 2 && numberCards[0].value === numberCards[1].value;
            } else if (cards.length >= 3) {
                // Equation: must be all number cards
                return numberCards.length === cards.length;
            }
        }
        return false;
    }, []);

    const handleDiscardCards = useCallback(async (cards: Card[]) => {
        if (!user) return;

        // Stage multi-card discards for visual feedback
        if (shouldStageDiscard(cards)) {
            const stageMove: GameMove = {
                type: 'stage_card',
                playerId: user.id,
                cards,
                timestamp: Date.now(),
            };
            
            const stageResult = await playMove(stageMove);
            if (stageResult.isValid) {
                // Wait 2 seconds then execute the discard
                setTimeout(async () => {
                    const discardMove: GameMove = {
                        type: 'discard',
                        playerId: user.id,
                        cards,
                        timestamp: Date.now(),
                    };
                    const result = await playMove(discardMove);
                    if (result.isValid) {
                        setSelectedCards([]);
                    }
                }, 2000);
                return;
            }
        }

        // For single card discards or if staging fails, execute immediately
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
    }, [user, playMove, shouldStageDiscard]);

    // Handle drop on play area
    const handleDropOnPlayArea = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        
        console.log('Drop on play area:', {
            draggedCardType: draggedCard?.type,
            isMyTurn,
            currentPlayerId: gameState?.currentPlayerId,
            userId: user?.id
        });
        
        if (!draggedCard || !isMyTurn || !user) {
            console.log('Drop blocked:', { draggedCard: !!draggedCard, isMyTurn, user: !!user });
            setDraggedCard(null);
            return;
        }
        
        // If it's a King card, stage it and show it in the play area
        if (draggedCard.type === 'king') {
            // Send staging move to server so other players can see it
            const stageMove: GameMove = {
                type: 'stage_card',
                playerId: user.id,
                cards: [draggedCard],
                timestamp: Date.now(),
            };
            
            const result = await playMove(stageMove);
            if (result.isValid) {
                setPlayedKing(draggedCard);
                setSelectedCards([draggedCard]);
                // The player now needs to select a queen
            } else {
                console.error('King stage move failed:', result.error);
            }
        }
        // If it's a Knight or Sleeping Potion, stage it for target selection
        else if (draggedCard.type === 'knight' || draggedCard.type === 'potion') {
            // Send staging move to server
            const stageMove: GameMove = {
                type: 'stage_card',
                playerId: user.id,
                cards: [draggedCard],
                timestamp: Date.now(),
            };
            
            const result = await playMove(stageMove);
            if (result.isValid) {
                // Local state is now managed by server response
                setSelectedCards([draggedCard]);
            } else {
                console.error('Stage move failed:', result.error);
            }
        }
        // If there are selected number cards, check for pairs (2 cards) or math equations (3+ cards)
        else if (selectedCards.length >= 2 && selectedCards.every(card => card.type === 'number')) {
            const numberCards = selectedCards.filter(card => card.type === 'number') as NumberCard[];
            
            // Check for pairs (exactly 2 cards with same value)
            if (numberCards.length === 2 && numberCards[0].value === numberCards[1].value) {
                console.log('Playing pair:', numberCards);
                // Show staged cards first
                setLocalStagedCards({cards: selectedCards, action: `pair of ${numberCards[0].value}s`});
                // Process after delay
                setTimeout(async () => {
                    await handlePlayCards(selectedCards, 'play');
                    setSelectedCards([]);
                    setLocalStagedCards(null);
                }, 2000);
            }
            // Check for math equations (3+ cards)
            else if (numberCards.length >= 3) {
                const mathEquations = findMathEquations(numberCards);
                
                console.log('Drag equation debug:', {
                    selectedCards: selectedCards.map(c => ({ id: c.id, type: c.type, value: c.value })),
                    numberCards: numberCards.map(c => ({ id: c.id, value: c.value })),
                    mathEquations: mathEquations.length,
                    foundEquations: mathEquations
                });
                
                if (mathEquations.length > 0) {
                    // Play the math equation
                    console.log('Playing math equation with cards:', selectedCards);
                    const equation = mathEquations[0];
                    const equationString = formatMathEquation(equation);
                    // Show staged cards first
                    setLocalStagedCards({cards: selectedCards, action: `equation ${equationString}`});
                    // Process after delay
                    setTimeout(async () => {
                        await handlePlayCards(selectedCards, 'play');
                        setSelectedCards([]);
                        setLocalStagedCards(null);
                    }, 2000);
                } else {
                    console.log('No valid math equation found');
                }
            } else {
                console.log('Not a valid pair or equation');
            }
        }
        // Handle single card discard (any card that doesn't fit other categories)
        else {
            console.log('Single card discard:', draggedCard);
            
            // Send staging move to server so other players can see it
            const stageMove: GameMove = {
                type: 'stage_card',
                playerId: user.id,
                cards: [draggedCard],
                timestamp: Date.now(),
            };
            
            const result = await playMove(stageMove);
            if (result.isValid) {
                // Process after delay - the staging will be shown via server state
                setTimeout(async () => {
                    await handleDiscardCards([draggedCard]);
                }, 2000);
            } else {
                console.error('Discard stage move failed:', result.error);
                // Fallback to local staging if server staging fails
                setLocalStagedCards({cards: [draggedCard], action: `discard ${draggedCard.name || draggedCard.type}`});
                setTimeout(async () => {
                    await handleDiscardCards([draggedCard]);
                    setLocalStagedCards(null);
                }, 2000);
            }
        }
        
        setDraggedCard(null);
    }, [draggedCard, currentPlayer, user, selectedCards, handlePlayCards, handleDiscardCards]);

    // Determine possible actions
    const possibleActions = useMemo(() => {
        if (!selectedCards.length || !isMyTurn) return [];

        const actions: string[] = [];

        const hasKing = selectedCards.some(c => c.type === 'king');
        const hasKnight = selectedCards.some(c => c.type === 'knight');
        const hasPotion = selectedCards.some(c => c.type === 'potion');
        const numberCards = selectedCards.filter(c => c.type === 'number') as NumberCard[];
        const hasNumbers = numberCards.length;

        if (hasKing) {
            actions.push('play_king');
        }
        if (hasKnight) {
            actions.push('play_knight');
        }
        if (hasPotion) {
            actions.push('play_potion');
        }
        // Check for pairs (exactly 2 cards with same value) - treated as discard action
        if (hasNumbers === 2 && numberCards[0].value === numberCards[1].value) {
            actions.push('discard_pair');
        }
        // Check for math equations (3+ cards)
        if (hasNumbers >= 3) {
            actions.push('play_math');
        }

        return actions;
    }, [selectedCards, isMyTurn]);

    const canSelectQueenForKing = possibleActions.includes('play_king');
    const canSelectQueenForKnight = possibleActions.includes('play_knight');
    const canSelectQueenForPotion = possibleActions.includes('play_potion');

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
                'fixed right-0 top-0 h-full z-40 transition-transform duration-300 ease-in-out',
                showLeaderboard ? 'translate-x-0' : 'translate-x-full'
            )}>
                <div className="h-full w-64 bg-black/80 backdrop-blur-md border-l border-white/20 flex flex-col">
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
                            <ChevronRight className="h-4 w-4 text-white/60" />
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
                    
                    {/* Game Status */}
                    <div className="px-4 py-3 border-t border-white/20">
                        <div className="text-xs text-gray-400 mb-2">Game Status</div>
                        <div className="space-y-2 text-xs text-gray-300">
                            <div className="flex items-center justify-between">
                                <span>Current Turn:</span>
                                <span className="text-blue-300 font-medium">
                                    {gameState?.currentPlayerId ?
                                        players.find(p => p.id === gameState.currentPlayerId)?.name || 'Unknown'
                                        : 'Waiting...'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Game Phase:</span>
                                <span className="text-green-300 font-medium">
                                    {gameState?.phase === 'playing' ? 'In Progress' :
                                     gameState?.phase === 'waiting' ? 'Waiting for Players' :
                                     gameState?.phase === 'ended' ? 'Game Ended' : 'Unknown'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Room Code:</span>
                                <span className="text-yellow-300 font-mono font-medium">{gameState?.roomCode}</span>
                            </div>
                            {gameState?.deck && (
                                <div className="flex items-center justify-between">
                                    <span>Cards Remaining:</span>
                                    <span className="text-purple-300 font-medium">{gameState.deck.length}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Recent Moves */}
                    <div className="px-4 py-3 border-t border-white/20">
                        <div className="text-xs text-gray-400 mb-2">Recent Moves</div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {moveHistory.length > 0 ? (
                                moveHistory.map((move, index) => (
                                    <div key={move.timestamp} className="text-xs text-gray-300 opacity-75">
                                        {move.message}
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-gray-400 italic">No moves yet</div>
                            )}
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
                    'fixed right-4 top-4 z-50 p-2 bg-black/60 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-black/80 transition-all',
                    showLeaderboard && 'right-[272px]'
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
                        </div>

                    </div>
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
                                                {isCurrentTurn ? `${player.name}'s turn` : player.name}
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
                                                        const isTargetable = (canSelectQueenForKnight && stagedCard?.type === 'knight') || 
                                                                                     (canSelectQueenForPotion && stagedCard?.type === 'potion');
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
                            canSelectQueen={canSelectQueenForKing || canSelectQueenForPotion || !!playedKing}
                            actionType={
                                playedKing ? 'king' :
                                stagedCard?.type === 'knight' ? 'knight' :
                                stagedCard?.type === 'potion' ? 'potion' :
                                stagedCard?.type === 'wand' ? 'wand' :
                                canSelectQueenForKing ? 'king' :
                                canSelectQueenForPotion ? 'potion' :
                                undefined
                            }
                            discardPile={gameState?.discardPile || []}
                            drawPile={gameState?.deck || []}
                            highlightQueens={playedKing ? sleepingQueens : []}
                            isDraggingCard={!!draggedCard}
                            initialQueensLayout={initialQueensLayout}
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
                                                {isCurrentTurn ? `${player.name}'s turn` : player.name}
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
                                                        const isTargetable = (canSelectQueenForKnight && stagedCard?.type === 'knight') || 
                                                                                     (canSelectQueenForPotion && stagedCard?.type === 'potion');
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

                {/* Central Play Area for Played Cards */}
                <div className="flex justify-center my-6">
                    <div 
                        className={clsx(
                            "relative w-96 h-32 rounded-xl border-2 border-dashed transition-all",
                            draggedCard && isMyTurn
                                ? draggedCard.type === 'king'
                                    ? "border-green-400 bg-green-500/10"
                                    : draggedCard.type === 'knight'
                                        ? "border-red-400 bg-red-500/10"
                                        : draggedCard.type === 'potion'
                                            ? "border-purple-400 bg-purple-500/10"
                                            : "border-orange-400 bg-orange-500/10"
                                : "border-gray-600 bg-white/5",
                            playedKing && "border-solid border-blue-400 bg-blue-500/10"
                        )}
                        onDrop={handleDropOnPlayArea}
                        onDragOver={handleDragOver}
                    >
                        {/* Drop Zone Instructions */}
                        {!playedKing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <p className="text-gray-400 text-sm">
                                        {draggedCard?.type === 'king' 
                                            ? "Drop King here to wake a queen" 
                                            : draggedCard?.type === 'knight'
                                                ? "Drop Knight here to steal a queen"
                                            : draggedCard?.type === 'potion'
                                                ? "Drop Potion here to put opponent's queen to sleep"
                                            : selectedCards.length >= 3 && selectedCards.every(c => c.type === 'number')
                                                ? "Drop equation cards here to play"
                                            : draggedCard
                                                ? "Drop card here to discard"
                                            : isMyTurn 
                                                ? "Drag any card here to play or discard"
                                                : "Waiting for player's move..."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Played King Display */}
                        {playedKing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mb-2">
                                        <div className="inline-block p-3 bg-yellow-500/20 rounded-lg border-2 border-yellow-400">
                                            <Crown className="h-8 w-8 text-yellow-400" />
                                        </div>
                                    </div>
                                    <p className="text-blue-300 text-sm font-medium">
                                        King played! Now select a sleeping queen to wake
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Local Staged Cards Display */}
                        {localStagedCards && !playedKing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mb-2 flex gap-1 justify-center">
                                        {localStagedCards.cards.map((card, index) => (
                                            <div key={card.id} className="w-12 h-16 bg-blue-500/20 rounded border border-blue-400 flex items-center justify-center text-white text-xs font-bold">
                                                {card.type === 'number' ? card.value : card.type.charAt(0).toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-blue-300 text-sm font-medium animate-pulse">
                                        Playing {localStagedCards.action}...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Jester Reveal Display */}
                        {gameState?.jesterReveal && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mb-2">
                                        <div className="inline-block p-3 bg-yellow-500/20 rounded-lg border-2 border-yellow-400">
                                            <div className="w-12 h-16 bg-yellow-600 rounded border border-yellow-400 flex items-center justify-center text-white text-xs font-bold">
                                                {gameState.jesterReveal.revealedCard.type === 'number' 
                                                    ? gameState.jesterReveal.revealedCard.value 
                                                    : gameState.jesterReveal.revealedCard.type.charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-yellow-300 text-sm font-medium">
                                        Jester revealed: {gameState.jesterReveal.revealedCard.name || gameState.jesterReveal.revealedCard.type}!
                                        {gameState.jesterReveal.waitingForQueenSelection && gameState.jesterReveal.targetPlayerId && (
                                            <span className="block mt-1">
                                                {players.find(p => p.id === gameState.jesterReveal!.targetPlayerId)?.name} chooses a queen to wake
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Staged Card Display (Action cards or Discard pairs) */}
                        {stagedCards.length > 0 && !playedKing && !localStagedCards && !gameState?.jesterReveal && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <div className="mb-2 flex items-center justify-center gap-2">
                                        {stagedCards.map((card, index) => (
                                            <div key={`${card.id}-${index}`} className="inline-block p-3 bg-red-500/20 rounded-lg border-2 border-red-400">
                                                {card.type === 'knight' ? (
                                                    <Sword className="h-8 w-8 text-red-400" />
                                                ) : card.type === 'king' ? (
                                                    <Crown className="h-8 w-8 text-yellow-400" />
                                                ) : card.type === 'jester' ? (
                                                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">J</div>
                                                ) : card.type === 'number' ? (
                                                    <div className="w-8 h-8 bg-blue-600 rounded border border-blue-400 flex items-center justify-center text-white text-sm font-bold">
                                                        {card.value}
                                                    </div>
                                                ) : (
                                                    <Zap className="h-8 w-8 text-purple-400" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-blue-300 text-sm font-medium">
                                        {stagedCardPlayer?.id === user?.id ? (
                                            // Show different messages for current player based on action type
                                            stagedCards.length === 1 && ['knight', 'king', 'potion', 'jester'].includes(stagedCard?.type || '') ? (
                                                stagedCard?.type === 'knight' 
                                                    ? "Knight ready! Select an opponent's queen to steal"
                                                    : stagedCard?.type === 'king'
                                                    ? "King ready! Select a sleeping queen to wake"
                                                    : stagedCard?.type === 'potion'
                                                    ? "Potion ready! Select an opponent's queen to put to sleep"
                                                    : "Jester ready! Will reveal a card from the deck"
                                            ) : (
                                                `Cards staged and ready to ${stagedAction}!`
                                            )
                                        ) : (
                                            <>
                                                <strong>{stagedCardPlayer?.name}</strong> is preparing to <strong>{stagedAction}</strong>!
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Your Play Area - Below the center */}
                <div className="flex justify-center mt-8">
                        {players.filter((player: any) => player.id === user?.id).map((player: any) => {
                            const isCurrentTurn = currentPlayer?.id === user?.id;
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
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
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

                                {/* Countdown Timer */}
                                <DefenseCountdown getRemainingDefenseTime={getRemainingDefenseTime} />

                                <div className="flex space-x-3">
                                    <Button
                                        onClick={async () => {
                                            if (pendingAttack) await blockKnightAttack(user.id);
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