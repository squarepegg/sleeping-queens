import React, {useCallback, useEffect, useMemo, useState} from 'react';
import clsx from 'clsx';
import {
    closestCenter,
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {sortableKeyboardCoordinates,} from '@dnd-kit/sortable';
import {useGameState} from '@/lib/context/GameStateContext';
import {useAuth} from '@/lib/hooks/useAuth';
import {Card, Queen} from '@/domain/models/Card';
import {Player} from '@/domain/models/Player';

// Import modular components
import {DrawDiscardPiles} from './DrawDiscardPiles';
import {DraggableCard, DragOverlay as CardDragOverlay} from './DraggableCard';
import {DroppableArea} from './DroppableArea';

// Import modals
import {DragonBlockModal} from './modals/DragonBlockModal';
import {WandBlockModal} from './modals/WandBlockModal';
import {WinModal} from './modals/WinModal';

// Import icons
import {Crown, Sparkles, Trophy} from 'lucide-react';

/**
 * NewGameBoard - Modular game board with @dnd-kit drag and drop
 * 
 * Layout structure:
 * 1. Central play area with sleeping queens (2x3 layout) + draw/discard + (2x3 layout)
 * 2. Other players on left and right sides (2 columns)
 * 3. Staging area below the play area (visible to all)
 * 4. Player hand below staging area (visible only to player)
 */
export function NewGameBoard() {
  const { state, playMove, currentPlayer, isMyTurn } = useGameState();
  const { user } = useAuth();
  const gameState = state.gameState;
  
  const [stagedCards, setStagedCards] = useState<Card[]>([]);
  const [selectedQueen, setSelectedQueen] = useState<Queen | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);  // For multi-select
  
  // Configure sensors for both mouse and touch with better settings
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8, // Minimum distance before drag starts
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 200, // Small delay to allow for scrolling on mobile
      tolerance: 8, // Tolerance for touch movement
    },
  });
  
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  
  const sensors = useSensors(
    pointerSensor,
    touchSensor,
    keyboardSensor
  );
  
  // Memoized values - Now using UUID properly
  const currentUserId = user?.id!; // Non-null assertion since auth is required for game
  const currentUsername = user?.username;
  const players = gameState?.players || [];
  
  const currentUserPlayer = useMemo(
    () => {
      const player = players.find(p => p.id === currentUserId);
      return player;
    },
    [players, currentUserId]
  );
  const otherPlayers = useMemo(
    () => players.filter(p => p.id !== currentUserId),
    [players, currentUserId]
  );

  // Check what cards this player has staged in the backend
  const currentPlayerStagedCards = useMemo(() => {
    if (!currentUserId || !gameState?.stagedCards) return [];
    // @ts-ignore - TypeScript has issues with Record<string, T> indexing, but this is safe
    return gameState.stagedCards[currentUserId] || [];
  }, [currentUserId, gameState?.stagedCards]);
  const hasKing = currentPlayerStagedCards.some((card: any) => card.type === 'king');
  const hasKnight = currentPlayerStagedCards.some((card: any) => card.type === 'knight');
  const hasPotion = currentPlayerStagedCards.some((card: any) => card.type === 'potion');

  // Note: isMyTurn comes from useGameState() context - no need to recalculate
  // Special case: allow actions when player has staged cards that need selection
  const canInteract = isMyTurn ||
    (currentPlayerStagedCards.length > 0 && (hasKnight || hasKing || hasPotion));

  // Auto-play staged cards effect with 500ms delay
  useEffect(() => {
    if (!currentUserId || !isMyTurn || stagedCards.length === 0) return;
    
    // Prevent re-staging if card is already staged in game state (except for jester)
    const serverStagedCards = gameState?.stagedCards?.[currentUserId] || [];
    if (serverStagedCards.length > 0 && stagedCards.length === 1 &&
        serverStagedCards[0]?.id === stagedCards[0].id &&
        stagedCards[0].type !== 'jester') {
      console.log('[NewGameBoard] Card already staged, skipping auto-play');
      return;
    }
    
    // Check if we should auto-play the staged cards
    const shouldAutoPlay = async () => {
      // Single number card - auto discard
      if (stagedCards.length === 1 && stagedCards[0].type === 'number') {
        await playMove({
          type: 'discard',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        setStagedCards([]);
        return;
      }
      
      // Two cards of same value (pair) - auto discard
      if (stagedCards.length === 2 && 
          stagedCards[0].type === 'number' && 
          stagedCards[1].type === 'number' &&
          stagedCards[0].value === stagedCards[1].value) {
        await playMove({
          type: 'discard',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        setStagedCards([]);
        return;
      }
      
      // Three or more number cards - check for math equation
      if (stagedCards.length >= 3 && stagedCards.every(c => c.type === 'number')) {
        // Try to validate math equation
        await playMove({
          type: 'play_math',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        setStagedCards([]);
        return;
      }
      
      // Jester card - play immediately (no target needed)
      if (stagedCards.length === 1 && stagedCards[0].type === 'jester') {
        console.log('[NewGameBoard] Playing jester card');
        const result = await playMove({
          type: 'play_jester',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        console.log('[NewGameBoard] Jester play result:', result);
        setStagedCards([]);
        return;
      }
      
      // Single action card that needs a target - stage it for further action
      if (stagedCards.length === 1 && ['king', 'knight', 'potion'].includes(stagedCards[0].type)) {
        console.log('[NewGameBoard] Staging action card:', stagedCards[0].type);
        const result = await playMove({
          type: 'stage_cards',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        console.log('[NewGameBoard] Stage move result:', result);
        // Don't clear staged cards for action cards - they need to stay visible
        // They will be cleared when the actual move is executed
        return;
      }
    };
    
    // Delay auto-play 500ms to show the card in staging area
    const timer = setTimeout(shouldAutoPlay, 500);
    return () => clearTimeout(timer);
  }, [stagedCards, currentUserId, isMyTurn, playMove, gameState?.stagedCard]);
  
  // Handle drag start - Set the active card for drag overlay
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card;
    if (card) {
      setActiveDragCard(card);
    }
  }, []);

  // Handle drag end - Process drop actions
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragCard(null); // Clear drag overlay

    if (!over || !currentUserId || !canInteract) return;

    const draggedCard = active.data.current?.card;
    if (!draggedCard) return;

    const sourceId = active.id.toString();
    const targetId = over.id.toString();

    // Card dragged from hand to staging area
    if (sourceId.startsWith('hand-') && targetId === 'staging') {
      // Check if the dragged card is part of a selection
      const isDraggedCardSelected = selectedCards.some(c => c.id === draggedCard.id);

      if (isDraggedCardSelected && selectedCards.length > 1) {
        // Move all selected cards to staging
        setStagedCards(prev => [...prev, ...selectedCards]);
      } else {
        // Move just the dragged card
        const card = currentUserPlayer?.hand?.find(c => c.id === draggedCard.id);
        if (!card) return;
        setStagedCards(prev => [...prev, card]);
      }

      // Clear selection after dragging
      setSelectedCards([]);
      return;
    }

    // Card dragged back from staging to hand
    if (sourceId.startsWith('staging-') && targetId === 'hand') {
      // Remove card from staged cards
      setStagedCards(prev => prev.filter(c => c.id !== draggedCard.id));
      return;
    }
  }, [currentUserId, currentUserPlayer, canInteract, selectedCards]);
  
  // Defense handlers
  const handlePlayDragon = useCallback(async () => {
    console.log('[NewGameBoard] handlePlayDragon called');
    if (!gameState?.pendingKnightAttack) {
      console.log('[NewGameBoard] No pending knight attack');
      return;
    }
    
    console.log('[NewGameBoard] Playing dragon defense');
    await playMove({
      type: 'play_dragon',
      playerId: gameState.pendingKnightAttack.target,
      cards: [],
      timestamp: Date.now()
    });
  }, [gameState, playMove]);
  
  const handlePlayWand = useCallback(async () => {
    console.log('[NewGameBoard] handlePlayWand called', {
      hasPendingAttack: !!gameState?.pendingPotionAttack,
      pendingAttack: gameState?.pendingPotionAttack
    });

    if (!gameState?.pendingPotionAttack) {
      console.log('[NewGameBoard] No pending potion attack to defend');
      return;
    }

    console.log('[NewGameBoard] Playing wand defense');
    await playMove({
      type: 'play_wand',
      playerId: gameState.pendingPotionAttack.target,
      cards: [],
      targetCard: gameState.pendingPotionAttack.targetQueen,
      timestamp: Date.now()
    });
  }, [gameState, playMove]);
  
  const getRemainingDefenseTime = useCallback(() => {
    if (gameState?.pendingKnightAttack) {
      const remaining = Math.max(0, gameState.pendingKnightAttack.defenseDeadline - Date.now());
      return Math.ceil(remaining / 1000);
    }
    return 0;
  }, [gameState]);
  
  const getRemainingPotionDefenseTime = useCallback(() => {
    if (gameState?.pendingPotionAttack) {
      const remaining = Math.max(0, gameState.pendingPotionAttack.defenseDeadline - Date.now());
      return Math.ceil(remaining / 1000);
    }
    return 0;
  }, [gameState]);
  
  const handleAllowKnightAttack = useCallback(async () => {
    console.log('[NewGameBoard] handleAllowKnightAttack called', {
      hasPendingAttack: !!gameState?.pendingKnightAttack,
      currentUserId,
      pendingAttack: gameState?.pendingKnightAttack
    });

    if (!gameState?.pendingKnightAttack || !currentUserId) return;

    // Allow the knight attack to proceed
    // Any connected player can complete the attack after timeout
    console.log('[NewGameBoard] Sending allow_knight_attack move');
    await playMove({
      type: 'allow_knight_attack',
      playerId: currentUserId,
      timestamp: Date.now()
    });
  }, [gameState, currentUserId, playMove]);
  
  const handleAllowPotionAttack = useCallback(async () => {
    console.log('[NewGameBoard] handleAllowPotionAttack called', {
      hasPendingAttack: !!gameState?.pendingPotionAttack,
      currentUserId,
      pendingAttack: gameState?.pendingPotionAttack
    });

    if (!gameState?.pendingPotionAttack || !currentUserId) return;

    // Allow the potion attack to proceed
    // Any connected player can complete the attack after timeout
    console.log('[NewGameBoard] Sending allow_potion_attack move');
    await playMove({
      type: 'allow_potion_attack',
      playerId: currentUserId,
      timestamp: Date.now()
    });
  }, [gameState, currentUserId, playMove]);
  
  // Clear staged cards
  const handleClearStagedCards = useCallback(() => {
    setStagedCards([]);
  }, []);
  
  // Auto-complete attacks when defense time expires
  useEffect(() => {
    if (gameState?.pendingKnightAttack) {
      console.log('[NewGameBoard] Knight attack effect triggered', {
        pendingAttack: gameState.pendingKnightAttack,
        currentTime: Date.now(),
        deadline: gameState.pendingKnightAttack.defenseDeadline,
        remaining: gameState.pendingKnightAttack.defenseDeadline - Date.now()
      });
      const remaining = gameState.pendingKnightAttack.defenseDeadline - Date.now();

      // Either the target or attacker can complete the attack after timeout
      if (remaining > 0) {
        console.log(`[NewGameBoard] Setting timeout for Knight attack completion in ${remaining}ms`);
        const timeout = setTimeout(() => {
          console.log('[NewGameBoard] Knight attack timeout fired, calling handleAllowKnightAttack');
          handleAllowKnightAttack();
        }, remaining);
        return () => clearTimeout(timeout);
      } else if (remaining <= 0) {
        // Time already expired, complete immediately
        console.log('[NewGameBoard] Knight attack time already expired, completing immediately');
        handleAllowKnightAttack();
      }
    }
  }, [gameState?.pendingKnightAttack?.defenseDeadline, handleAllowKnightAttack]);
  
  useEffect(() => {
    if (gameState?.pendingPotionAttack) {
      console.log('[NewGameBoard] Potion attack effect triggered', {
        pendingAttack: gameState.pendingPotionAttack,
        currentTime: Date.now(),
        deadline: gameState.pendingPotionAttack.defenseDeadline,
        remaining: gameState.pendingPotionAttack.defenseDeadline - Date.now()
      });
      const remaining = gameState.pendingPotionAttack.defenseDeadline - Date.now();

      // Either the target or attacker can complete the attack after timeout
      if (remaining > 0) {
        console.log(`[NewGameBoard] Setting timeout for Potion attack completion in ${remaining}ms`);
        const timeout = setTimeout(() => {
          console.log('[NewGameBoard] Potion attack timeout fired, calling handleAllowPotionAttack');
          handleAllowPotionAttack();
        }, remaining);
        return () => clearTimeout(timeout);
      } else if (remaining <= 0) {
        // Time already expired, complete immediately
        console.log('[NewGameBoard] Potion attack time already expired, completing immediately');
        handleAllowPotionAttack();
      }
    }
  }, [gameState?.pendingPotionAttack?.defenseDeadline, handleAllowPotionAttack]);
  
  // Handle card selection for multi-select (pairs and equations)
  const handleCardSelect = useCallback((card: Card, event: React.MouseEvent) => {
    if (!isMyTurn) return;

    // Prevent drag-and-drop from interfering
    event.stopPropagation();
    event.preventDefault();

    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);

      // Check if it's a multi-select (Ctrl/Cmd or Shift key)
      const isMultiSelect = event.ctrlKey || event.metaKey || event.shiftKey;

      if (isMultiSelect) {
        // Multi-select mode: toggle this card
        if (isSelected) {
          return prev.filter(c => c.id !== card.id);
        } else {
          return [...prev, card];
        }
      } else {
        // Regular click mode
        if (isSelected) {
          // If card is selected
          if (prev.length === 1) {
            // Only this card selected - deselect it
            return [];
          } else {
            // Multiple cards selected - select only this one
            return [card];
          }
        } else {
          // Card not selected - add it to selection
          // This allows building selection without Ctrl/Cmd
          return [...prev, card];
        }
      }
    });
  }, [isMyTurn]);

  // Stage selected cards
  const handleStageSelectedCards = useCallback(async () => {
    if (selectedCards.length === 0) return;

    // Check if it's a valid combination
    const allNumbers = selectedCards.every(c => c.type === 'number');

    if (selectedCards.length === 2 && allNumbers) {
      // Check for pair
      const [card1, card2] = selectedCards;
      if (card1.value === card2.value) {
        // Stage as pair
        if (currentUserId) {
          await playMove({
            type: 'stage_cards',
            playerId: currentUserId,
            cards: selectedCards,
            timestamp: Date.now()
          });
        }
        setStagedCards(selectedCards);
        setSelectedCards([]);
      }
    } else if (selectedCards.length >= 3 && allNumbers) {
      // Could be a math equation - stage them
      await playMove({
        type: 'stage_cards',
        playerId: currentUserId,
        cards: selectedCards,
        timestamp: Date.now()
      });
      setStagedCards(selectedCards);
      setSelectedCards([]);
    } else if (selectedCards.length === 1) {
      // Single card - stage it
      await playMove({
        type: 'stage_cards',
        playerId: currentUserId,
        cards: selectedCards,
        timestamp: Date.now()
      });
      setStagedCards(selectedCards);
      setSelectedCards([]);
    }
  }, [selectedCards, currentUserId, playMove]);

  // Queen selection handler
  const handleQueenSelect = useCallback(async (queen: Queen | null) => {
    if (!queen) return;
    if (!currentUserId || !gameState) return;

    // Check if this is a Rose Queen bonus selection
    if (gameState.roseQueenBonus?.pending &&
        gameState.roseQueenBonus.playerId === currentUserId) {
      console.log('[NewGameBoard] Selecting bonus queen for Rose Queen:', {
        queen,
        roseQueenBonus: gameState.roseQueenBonus,
        currentUserId
      });

      const moveResult = await playMove({
        type: 'rose_queen_bonus',
        playerId: currentUserId,
        cards: [],
        targetCard: queen,
        timestamp: Date.now()
      });

      console.log('[NewGameBoard] Rose Queen bonus selection result:', moveResult);
      return;
    }

    // Check if this is a jester reveal queen selection
    if (gameState.jesterReveal?.waitingForQueenSelection &&
        gameState.jesterReveal.targetPlayerId === currentUserId) {
      console.log('[NewGameBoard] Selecting queen for jester reveal:', {
        queen,
        jesterReveal: gameState.jesterReveal,
        currentUserId,
        targetPlayerId: gameState.jesterReveal.targetPlayerId
      });

      const moveResult = await playMove({
        type: 'play_jester',
        playerId: currentUserId,
        cards: [], // Empty since jester was already played
        targetCard: queen,
        timestamp: Date.now()
      });

      console.log('[NewGameBoard] Jester queen selection result:', moveResult);
      setStagedCards([]); // Clear any staged cards
      return;
    }
    
    // Check if we have staged cards (local or server) that need a queen selection
    const allStagedCards = currentPlayerStagedCards.length > 0 ? currentPlayerStagedCards : stagedCards;
    if (allStagedCards.length > 0) {
      const hasLocalKing = allStagedCards.some((card: any) => card.type === 'king');
      if (hasLocalKing || hasKing) {
        const kingCard = allStagedCards.find((card: any) => card.type === 'king');
        if (kingCard) {
          await playMove({
            type: 'play_king',
            playerId: currentUserId,
            cards: [kingCard],
            targetCard: queen,
            timestamp: Date.now()
          });
          setStagedCards([]); // Clear staged cards after executing the move
        }
      } else if (hasKnight || allStagedCards.some((card: any) => card.type === 'knight')) {
        // Knight targets opponent's queens only
        const targetPlayer = players.find(p => p.queens?.some(q => q.id === queen.id));
        if (targetPlayer && targetPlayer.id !== currentUserId) {
          const knightCard = allStagedCards.find((card: any) => card.type === 'knight');
          if (knightCard) {
            console.log('[NewGameBoard] Playing knight to steal queen:', {
              targetPlayerId: targetPlayer.id,
              targetPlayerName: targetPlayer.name,
              targetQueen: queen,
              knightCard,
              currentUserId
            });
            const moveResult = await playMove({
              type: 'play_knight',
              playerId: currentUserId,
              cards: [knightCard],
              targetCard: queen,
              targetPlayer: targetPlayer.id,
              timestamp: Date.now()
            });
            console.log('[NewGameBoard] Knight move result:', moveResult);
            setStagedCards([]); // Clear staged cards after executing the move
          }
        } else {
          console.log('[NewGameBoard] Invalid knight target - must select opponent queen');
        }
      } else if (hasPotion) {
        // Need to select target player for potion
        const targetPlayer = players.find(p => p.queens?.some(q => q.id === queen.id));
        if (targetPlayer) {
          const potionCard = currentPlayerStagedCards.find((card: any) => card.type === 'potion');
          if (potionCard) {
            await playMove({
              type: 'play_potion',
              playerId: currentUserId,
              cards: [potionCard],
              targetCard: queen,
              targetPlayer: targetPlayer.id,
              timestamp: Date.now()
            });
            setStagedCards([]); // Clear staged cards after executing the move
          }
        }
      }
    }
    
    setSelectedQueen(null);
  }, [currentUserId, gameState, players, playMove]);
  
  // Helper function to calculate player score
  const calculatePlayerScore = (player: Player) => {
    return player.queens?.reduce((sum, queen) => sum + (queen.points || 0), 0) || 0;
  };
  
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
  
  const pendingKnightAttack = gameState.pendingKnightAttack;
  const pendingPotionAttack = gameState.pendingPotionAttack;
  const winner = gameState.winner ? players.find(p => p.id === gameState.winner) : null;
  const jesterReveal = gameState.jesterReveal;

  // Debug logging for pending attacks
  useEffect(() => {
    if (pendingKnightAttack) {
      console.log('[NewGameBoard] Pending Knight Attack detected:', {
        pendingKnightAttack,
        currentUserId,
        isTarget: pendingKnightAttack.target === currentUserId,
        currentUserHand: currentUserPlayer?.hand?.map(c => ({ type: c.type, name: c.name })),
        hasDragon: currentUserPlayer?.hand?.some(card => card.type === 'dragon'),
        modalShouldShow: pendingKnightAttack.target === currentUserId &&
                        currentUserPlayer?.hand?.some(card => card.type === 'dragon')
      });
    }
  }, [pendingKnightAttack, currentUserId, currentUserPlayer]);
  
  // Determine if player can select queens
  // Player can select if they have a staged King, jester selection, or Rose Queen bonus
  const canSelectSleepingQueen = (
    (hasKing && (isMyTurn || currentPlayerStagedCards.length > 0)) ||
    (jesterReveal?.waitingForQueenSelection && jesterReveal?.targetPlayerId === currentUserId) ||
    (gameState.roseQueenBonus?.pending && gameState.roseQueenBonus?.playerId === currentUserId)
  );

  const canSelectOpponentQueen = hasKnight || hasPotion;
  
  // Debug logging
  console.log('[NewGameBoard] Queen selection state:', {
    canSelectSleepingQueen,
    canSelectOpponentQueen,
    isMyTurn,
    currentPlayerStagedCards,
    hasKing,
    hasKnight,
    hasPotion,
    currentUserId: currentUserId,
    currentPlayerId: gameState.currentPlayerId,
    jesterReveal: jesterReveal,
    gameMessage: gameState.gameMessage
  });
  
  // Create a fixed array of 12 positions with queens or nulls
  const queenPositions = useMemo(() => {
    // Start with all 12 queen IDs in their original positions - must match cards.ts
    const allQueenIds = [
      'queen-cat', 'queen-dog', 'queen-cake', 'queen-pancake',
      'queen-ladybug', 'queen-strawberry', 'queen-rainbow', 'queen-heart',
      'queen-star', 'queen-moon', 'queen-sun', 'queen-rose'
    ];

    // Map each position to either the queen object or null if awakened
    return allQueenIds.map(id => {
      return gameState.sleepingQueens.find(q => q.id === id) || null;
    });
  }, [gameState.sleepingQueens]);

  // Render sleeping queen card or empty space
  const renderSleepingQueenSlot = (position: number) => {
    const queen = queenPositions[position];
    const isSelected = queen && selectedQueen?.id === queen.id;

    if (!queen) {
      // Render empty slot where queen was awakened
      return (
        <div
          key={`empty-${position}`}
          className="w-16 h-24 rounded-lg border-2 border-dashed border-gray-600/50 bg-gray-900/30 flex items-center justify-center"
        >
          <span className="text-gray-600 text-xs">Empty</span>
        </div>
      );
    }

    return (
      <div
        key={queen.id}
        className="relative w-16 h-24"
      >
        <div
          onClick={() => canSelectSleepingQueen && handleQueenSelect(queen)}
          className={clsx(
            'w-full h-full rounded-lg border-2 transition-all bg-purple-900/40',
            isSelected
              ? 'border-blue-400 ring-2 ring-blue-400/50 scale-105 cursor-pointer'
              : canSelectSleepingQueen
                ? 'border-purple-400/50 hover:border-purple-400 hover:scale-105 cursor-pointer'
                : 'border-gray-600/50'
          )}
        >
          {/* Sleeping queen card back - show consistent image for all sleeping queens */}
          <img
            src="/images/sleeping-queen.png"
            alt="Sleeping Queen"
            className="w-full h-full object-cover rounded-lg"
          />

          {isSelected && (
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <Crown className="h-3 w-3 text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
          
          {/* Jester Reveal Notification */}
          {jesterReveal && (
            <div className="mb-4 p-4 bg-yellow-500/20 backdrop-blur-sm rounded-lg border-2 border-yellow-400/50">
              <div className="text-center">
                <h3 className="text-lg font-bold text-yellow-300 mb-2">Jester Revealed!</h3>
                <div className="text-white">
                  {jesterReveal.revealedCard.type === 'number' ? (
                    <span>Revealed a {(jesterReveal.revealedCard as any).value}!</span>
                  ) : jesterReveal.revealedCard.type === 'queen' ? (
                    <span>Revealed a Queen!</span>
                  ) : (
                    <span>Revealed {jesterReveal.revealedCard.name || jesterReveal.revealedCard.type}!</span>
                  )}
                </div>
                {jesterReveal.waitingForQueenSelection && (
                  <div className="mt-2 text-yellow-200">
                    {jesterReveal.targetPlayerId === currentUserId ? (
                      <span className="font-bold">Select a sleeping queen to wake!</span>
                    ) : (
                      <span>Waiting for player to select a queen...</span>
                    )}
                  </div>
                )}
                {gameState.gameMessage && (
                  <div className="mt-2 text-sm text-white/80">
                    {gameState.gameMessage}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rose Queen Bonus Message */}
          {gameState.roseQueenBonus?.pending && (
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-pink-600/90 backdrop-blur-sm rounded-lg p-4 border-2 border-pink-400 shadow-xl">
                <h3 className="text-lg font-bold text-pink-100 mb-2">Rose Queen Bonus!</h3>
                <div className="text-white">
                  You woke the Rose Queen!
                </div>
                <div className="mt-2 text-pink-200">
                  {gameState.roseQueenBonus.playerId === currentUserId ? (
                    <span className="font-bold">Select another sleeping queen to wake!</span>
                  ) : (
                    <span>Waiting for player to select a bonus queen...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Main Game Layout */}
          <div className="flex-1 flex gap-4">
            
            {/* Left Players Column */}
            <div className="w-48 flex flex-col gap-3">
              {otherPlayers.slice(0, 2).map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  isCurrentTurn={currentPlayer?.id === player.id}
                  calculateScore={calculatePlayerScore}
                  canSelectOpponentQueen={canSelectOpponentQueen}
                  currentUserId={currentUserId}
                  handleQueenSelect={handleQueenSelect}
                />
              ))}
            </div>
            
            {/* Central Game Area */}
            <div className="flex-1 flex flex-col gap-4">
              
              {/* Play Area with Sleeping Queens and Piles */}
              <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                <div className="flex items-center justify-center gap-8">
                  
                  {/* Left Queens (2x3 grid) */}
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1, 2, 3, 4, 5].map(position =>
                      renderSleepingQueenSlot(position)
                    )}
                  </div>

                  {/* Draw and Discard Piles */}
                  <DrawDiscardPiles
                    drawPile={gameState.deck || []}
                    discardPile={gameState.discardPile || []}
                  />

                  {/* Right Queens (2x3 grid) */}
                  <div className="grid grid-cols-2 gap-2">
                    {[6, 7, 8, 9, 10, 11].map(position =>
                      renderSleepingQueenSlot(position)
                    )}
                  </div>
                </div>
              </div>
              
              {/* Staging Area - Using DroppableArea */}
              <DroppableArea 
                id="staging"
                className={clsx(
                  'min-h-[120px] bg-white/5 backdrop-blur-sm rounded-lg border-white/10'
                )}
                label="Staging Area"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-white/70">Staging Area</h3>
                  {stagedCards.length > 0 && (
                    <button
                      onClick={handleClearStagedCards}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {stagedCards.map((card, index) => (
                    <DraggableCard
                      key={`staged-${card.id}`}
                      card={card}
                      id={`staging-${card.id}`}
                      disabled={false}
                      size="md"
                    />
                  ))}
                  {stagedCards.length === 0 && (
                    <div className="text-gray-400 text-sm">
                      Drag cards here - Number cards auto-play after 500ms, action cards wait for selection
                    </div>
                  )}
                </div>
              </DroppableArea>
              
              {/* Player Hand Area - Using DroppableArea */}
              <DroppableArea
                id="hand"
                className={clsx(
                  'backdrop-blur-sm rounded-lg p-4',
                  isMyTurn 
                    ? 'bg-green-500/10 border-green-400/30' 
                    : 'bg-white/5 border-white/10'
                )}
                label="Your Hand"
                disabled={!isMyTurn}
              >
                {currentUserPlayer ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-medium text-white">Your Hand</h3>
                        {isMyTurn && (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            Your Turn! Drag cards to staging area
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Crown className="h-4 w-4 text-purple-300" />
                          <span className="text-purple-200">
                            {currentUserPlayer.queens?.length || 0} queens
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-yellow-300" />
                          <span className="text-yellow-200">
                            {calculatePlayerScore(currentUserPlayer)} points
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Player's Queens */}
                    {currentUserPlayer.queens && currentUserPlayer.queens.length > 0 && (
                      <div className="mb-3">
                        <div className="flex gap-2 flex-wrap">
                          {currentUserPlayer.queens.map(queen => (
                            <div
                              key={queen.id}
                              className="px-2 py-1 rounded bg-purple-500/20 border border-purple-400/30 flex items-center gap-1"
                            >
                              <Crown className="h-3 w-3 text-purple-300" />
                              <span className="text-xs text-white">{queen.name}</span>
                              <span className="text-xs bg-yellow-500 text-black px-1 rounded">
                                {queen.points}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Player's Cards - Draggable with Multi-Select */}
                    <div className="flex flex-wrap gap-2">
                      {currentUserPlayer.hand && currentUserPlayer.hand.length > 0 ? (
                        currentUserPlayer.hand
                          .filter(card => !stagedCards.some(sc => sc.id === card.id))
                          .map((card, index) => {
                            const isSelected = selectedCards.some(c => c.id === card.id);
                            return (
                              <div
                                key={card.id}
                                onClick={(e) => handleCardSelect(card, e)}
                                className={clsx(
                                  "relative cursor-pointer transition-all",
                                  isSelected && "ring-2 ring-blue-400 rounded-lg scale-105"
                                )}
                              >
                                <DraggableCard
                                  card={card}
                                  id={`hand-${card.id}`}
                                  disabled={!isMyTurn}
                                  size="md"
                                />
                                {isSelected && (
                                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {selectedCards.findIndex(c => c.id === card.id) + 1}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                      ) : (
                        <div className="text-gray-400 text-sm">No cards in hand</div>
                      )}
                    </div>

                    {/* Multi-Select Actions */}
                    {selectedCards.length > 0 && (
                      <div className="mt-3 flex gap-2 items-center">
                        <button
                          onClick={handleStageSelectedCards}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Stage {selectedCards.length} Card{selectedCards.length > 1 ? 's' : ''}
                        </button>
                        <button
                          onClick={() => setSelectedCards([])}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          Clear Selection
                        </button>
                        <span className="text-sm text-gray-400">
                          Click to add cards • Ctrl/Cmd+click to toggle
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-gray-400">
                    <p>Unable to find your player data</p>
                    <p className="text-xs mt-2">User ID: {currentUserId || 'Not logged in'}</p>
                  </div>
                )}
              </DroppableArea>
            </div>
            
            {/* Right Players Column */}
            <div className="w-48 flex flex-col gap-3">
              {otherPlayers.slice(2, 4).map(player => (
                <PlayerCard 
                  key={player.id}
                  player={player}
                  isCurrentTurn={currentPlayer?.id === player.id}
                  calculateScore={calculatePlayerScore}
                  canSelectOpponentQueen={canSelectOpponentQueen}
                  currentUserId={currentUserId}
                  handleQueenSelect={handleQueenSelect}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Modals */}
        {pendingKnightAttack && pendingKnightAttack.target === currentUserId &&
         currentUserPlayer?.hand?.some(card => card.type === 'dragon') && (
          <DragonBlockModal
            isOpen={true}
            onPlayDragon={handlePlayDragon}
            onAllowAttack={handleAllowKnightAttack}
            getRemainingDefenseTime={getRemainingDefenseTime}
            attackerName={players.find(p => p.id === pendingKnightAttack.attacker)?.name || 'Unknown'}
            targetQueenName={pendingKnightAttack.targetQueen.name}
          />
        )}
        
        {pendingPotionAttack && pendingPotionAttack.target === currentUserId &&
         currentUserPlayer?.hand?.some(card => card.type === 'wand') && (
          <WandBlockModal
            isOpen={true}
            onPlayWand={handlePlayWand}
            onAllowAttack={handleAllowPotionAttack}
            getRemainingDefenseTime={getRemainingPotionDefenseTime}
            attackerName={players.find(p => p.id === pendingPotionAttack.attacker)?.name || 'Unknown'}
            targetQueenName={pendingPotionAttack.targetQueen.name}
          />
        )}
        
        {winner && (
          <WinModal
            isOpen={true}
            winner={winner}
            onClose={() => {}}
          />
        )}
      </div>
      
      {/* Critical: DragOverlay for visible drag preview */}
      <DragOverlay>
        {activeDragCard ? (
          <CardDragOverlay card={activeDragCard} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// PlayerCard component
function PlayerCard({ 
  player, 
  isCurrentTurn, 
  calculateScore,
  canSelectOpponentQueen,
  currentUserId,
  handleQueenSelect
}: { 
  player: Player; 
  isCurrentTurn: boolean;
  calculateScore: (player: Player) => number;
  canSelectOpponentQueen: boolean;
  currentUserId: string;
  handleQueenSelect: (queen: Queen) => void;
}) {
  return (
    <div className={clsx(
      'bg-white/5 backdrop-blur-sm rounded-lg border p-3',
      isCurrentTurn ? 'border-green-400/50' : 'border-white/10'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">{player.name}</span>
        {isCurrentTurn && (
          <Sparkles className="h-4 w-4 text-green-400 animate-pulse" />
        )}
      </div>
      <div className="text-xs space-y-1">
        <div className="flex items-center gap-1">
          <Crown className="h-3 w-3 text-purple-300" />
          <span className="text-purple-200">{player.queens?.length || 0} queens</span>
        </div>
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-yellow-300" />
          <span className="text-yellow-200">{calculateScore(player)} pts</span>
        </div>
      </div>
      {player.queens && player.queens.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.queens.map(queen => {
            const canSelect = canSelectOpponentQueen && player.id !== currentUserId;
            return (
              <div
                key={queen.id}
                onClick={() => canSelect && handleQueenSelect(queen)}
                className={clsx(
                  "text-xs px-1 py-0.5 rounded transition-all",
                  canSelect 
                    ? "bg-red-500/30 hover:bg-red-500/50 cursor-pointer hover:scale-105 border border-red-400"
                    : "bg-purple-500/20"
                )}
                title={`${queen.name} (${queen.points} pts)`}
              >
                {queen.name.substring(0, 3)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}