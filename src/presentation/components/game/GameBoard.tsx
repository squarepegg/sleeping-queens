import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {motion} from 'framer-motion';
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
import {Card, isNumberCard, NumberCard, Queen} from '@/domain/models/Card';
import {Player} from '@/domain/models/Player';
import {validateMathEquation} from '@/lib/utils/mathValidator';

// Import modular components
import {DrawDiscardPiles} from './DrawDiscardPiles';
import {DraggableCard, DragOverlay as CardDragOverlay} from './DraggableCard';
import {DroppableArea} from './DroppableArea';
import {PlayAreaDropZone} from './PlayAreaDropZone';
import {InfoDrawer} from './InfoDrawer';
import {StagingArea} from './StagingArea';
import {HandOverlay} from './HandOverlay';
import {ActionBanner} from './ActionBanner';

// Import modals
import {DragonBlockModal} from './modals/DragonBlockModal';
import {WandBlockModal} from './modals/WandBlockModal';
import {MoveHistorySidebar} from './MoveHistorySidebar';
import {GameOverOverlay} from './GameOverOverlay';
// Import the player dice roll component
import { PlayerDiceRoll } from './PlayerDiceRoll';

// Import icons
import {Crown, Sparkles, Trophy} from 'lucide-react';

/**
 * GameBoard - Modular game board with @dnd-kit drag and drop
 *
 * Layout structure:
 * 1. Central play area with sleeping queens (2x3 layout) + draw/discard + (2x3 layout)
 * 2. Other players on left and right sides (2 columns)
 * 3. Staging area below the play area (visible to all)
 * 4. Player hand below staging area (visible only to player)
 */
export function GameBoard() {
  const { state, playMove, currentPlayer, isMyTurn, drawnCards, clearDrawnCards } = useGameState();
  const { user } = useAuth();
  const gameState = state.gameState;

  // Debug drawn cards in GameBoard
  React.useEffect(() => {
    if (drawnCards) {
      console.log('[GameBoard] Drawn cards state updated:', {
        cardsCount: drawnCards.cards.length,
        timestamp: drawnCards.timestamp,
        cards: drawnCards.cards.map(c => ({ id: c.id, type: c.type, name: c.name }))
      });
    }
  }, [drawnCards]);
  
  const [stagedCards, setStagedCards] = useState<Card[]>([]);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [selectedQueen, setSelectedQueen] = useState<Queen | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<Card | null>(null);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);  // For multi-select
  const [showPopover, setShowPopover] = useState(false);
  const [recentDefenseType, setRecentDefenseType] = useState<'dragon' | 'wand' | null>(null);
  const [showActionResult, setShowActionResult] = useState(false);
  const [drawerDismissed, setDrawerDismissed] = useState(false);
  const [showFirstPlayerAnimation, setShowFirstPlayerAnimation] = useState(false);
  const [previousPhase, setPreviousPhase] = useState<string | undefined>(undefined);
  const [lastDefenseTimestamp, setLastDefenseTimestamp] = useState<number | null>(null);
  const [hasShownWheelForGame, setHasShownWheelForGame] = useState<string | null>(null);
  const [lastActionTimestamp, setLastActionTimestamp] = useState<number | null>(null);
  const [hasLoadedInitialHistory, setHasLoadedInitialHistory] = useState(false);

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
  const currentUserId = user?.id || ''; // Fallback to empty string if no user

  // Memoize players to prevent unnecessary recalculations
  const players = useMemo(
    () => gameState?.players || [],
    [gameState?.players]
  );

  const currentUserPlayer = useMemo(
    () => {
        return players.find(p => p.id === currentUserId);
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

  // Load initial history when game starts
  useEffect(() => {
    if (gameState?.phase === 'playing' && gameState?.id && !hasLoadedInitialHistory) {
      // Load move history to check if first player was already selected
      fetch(`/api/games/${gameState.id}/history?limit=10`)
        .then(res => res.json())
        .then(data => {
          setHasLoadedInitialHistory(true);

          // Check if there are ANY moves in history
          const hasAnyMoves = data.moves && data.moves.length > 0;

          // Only show animation if:
          // 1. We haven't shown it for this game
          // 2. We're transitioning to playing
          // 3. There are NO moves in history (truly the start of the game)
          if (!hasAnyMoves &&
              hasShownWheelForGame !== gameState.id &&
              previousPhase !== 'playing') {
            const firstPlayer = players.find(p => p.id === gameState.currentPlayerId);
            if (firstPlayer) {
              console.log('[GameBoard] Showing first player animation for:', firstPlayer.name);
              setShowFirstPlayerAnimation(true);
              setHasShownWheelForGame(gameState.id);
            }
          } else if (hasAnyMoves) {
            // Mark as shown since game has already started
            setHasShownWheelForGame(gameState.id);
          }
        })
        .catch(err => {
          console.error('Failed to load initial history:', err);
          setHasLoadedInitialHistory(true);
        });
    }

    // Track the phase for next render
    if (gameState?.phase !== previousPhase) {
      setPreviousPhase(gameState?.phase);
    }
  }, [gameState?.phase, gameState?.currentPlayerId, gameState?.id, previousPhase, players, hasShownWheelForGame, hasLoadedInitialHistory]);

  // Clear staging error when cards change
  useEffect(() => {
    if (stagedCards.length === 0) {
      setStagingError(null);
    }
  }, [stagedCards]);

  // Auto-play staged cards effect with 500ms delay
  useEffect(() => {
    if (!currentUserId || !isMyTurn || stagedCards.length === 0) return;
    
    // Prevent re-staging if card is already staged in game state (except for jester)
    const serverStagedCards = gameState?.stagedCards?.[currentUserId] || [];
    if (serverStagedCards.length > 0 && stagedCards.length === 1 &&
        serverStagedCards[0]?.id === stagedCards[0].id &&
        stagedCards[0].type !== 'jester') {
      console.log('[GameBoard] Card already staged, skipping auto-play');
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
      
      // Two number cards - check if they're a pair for discard
      if (stagedCards.length === 2 &&
          isNumberCard(stagedCards[0]) &&
          isNumberCard(stagedCards[1])) {

        // If they're a pair, discard them
        if (stagedCards[0].value === stagedCards[1].value) {
          await playMove({
            type: 'discard',
            playerId: currentUserId,
            cards: stagedCards,
            timestamp: Date.now()
          });
          setStagedCards([]);
          return;
        }

        // Not a pair - keep them staged and show message
        console.log('[GameBoard] Two number cards but not a pair - keeping staged');
        setStagingError('Need at least 3 cards for an equation, or a matching pair to discard');
        // Cards stay staged, user needs to add more for equation or clear them
        return;
      }
      
      // Three or more number cards - check for math equation
      if (stagedCards.length >= 3 && stagedCards.every(c => c.type === 'number')) {
        // Try to validate math equation
        const result = await playMove({
          type: 'play_math',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });

        // If move failed, keep cards staged and show error
        if (!result.isValid) {
          console.log('[GameBoard] Math equation invalid:', result.error);
          // Show error message to user
          const errorMessage = result.error || 'Invalid equation - cards don\'t form a valid math equation';
          setStagingError(errorMessage);
          // Keep cards in staging so user can see them
          return;
        }

        setStagedCards([]);
        setStagingError(null);
        return;
      }
      
      // Jester card - play immediately (no target needed)
      if (stagedCards.length === 1 && stagedCards[0].type === 'jester') {
        console.log('[GameBoard] Playing jester card');
        const result = await playMove({
          type: 'play_jester',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        console.log('[GameBoard] Jester play result:', result);
        setStagedCards([]);
        return;
      }

      // Dragon or Wand - discard immediately when played outside defense context
      if (stagedCards.length === 1 && (stagedCards[0].type === 'dragon' || stagedCards[0].type === 'wand')) {
        console.log('[GameBoard] Discarding defense card:', stagedCards[0].type);
        await playMove({
          type: 'discard',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        setStagedCards([]);
        return;
      }

      // Single action card that needs a target - stage it for further action
      if (stagedCards.length === 1 && ['king', 'knight', 'potion'].includes(stagedCards[0].type)) {
        console.log('[GameBoard] Staging action card:', stagedCards[0].type);
        const result = await playMove({
          type: 'stage_cards',
          playerId: currentUserId,
          cards: stagedCards,
          timestamp: Date.now()
        });
        console.log('[GameBoard] Stage move result:', result);
        // Don't clear staged cards for action cards - they need to stay visible
        // They will be cleared when the actual move is executed
        return;
      }
    };

    // Determine if we need to show staging area or auto-play immediately
    const needsStaging = () => {
      // Action cards that need targets always need staging
      if (stagedCards.length === 1 && ['king', 'knight', 'potion'].includes(stagedCards[0].type)) {
        return true;
      }

      // Two number cards that aren't a pair need staging (to show error)
      if (stagedCards.length === 2 &&
          stagedCards.every(c => c.type === 'number') &&
          stagedCards[0].value !== stagedCards[1].value) {
        return true;
      }

      // Don't add staging for 3+ cards - let shouldAutoPlay validate them immediately
      // If they're invalid, shouldAutoPlay will keep them staged and show error
      // If they're valid, they'll be played immediately without staging delay

      return false;
    };

    // Use conditional delay: immediate for auto-play cases, 500ms for staging cases
    const delay = needsStaging() ? 500 : 0;
    const timer = setTimeout(shouldAutoPlay, delay);
    return () => clearTimeout(timer);
  }, [stagedCards, currentUserId, isMyTurn, playMove, gameState?.stagedCards]);
  
  // Handle drag start - Set the active card for drag overlay
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card;
    if (card) {
      setActiveDragCard(card);
      // Dismiss the drawer when starting to drag a card
      setDrawerDismissed(true);
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

    // Card dragged from hand to play area
    if (sourceId.startsWith('hand-') && targetId === 'play-area') {
      // Check if we already have staged cards (building an equation)
      if (stagedCards.length > 0 && stagedCards.every(c => c.type === 'number')) {
        // Add the dragged card to the existing staged cards
        const newCard = currentUserPlayer?.hand?.find(c => c.id === draggedCard.id);
        if (newCard && newCard.type === 'number') {
          const updatedStagedCards = [...stagedCards, newCard];

          // Check if the new combination forms a valid equation
          const numberCards = updatedStagedCards as NumberCard[];
          const values = numberCards.map(c => c.value);
          const validation = validateMathEquation(values);

          if (validation.isValid) {
            // Valid equation - play immediately
            playMove({
              type: 'play_math',
              playerId: currentUserId,
              cards: updatedStagedCards,
              mathEquation: {
                cards: updatedStagedCards,
                equation: validation.equation || '',
                result: values[values.length - 1]
              },
              timestamp: Date.now()
            });
            setStagedCards([]);
            setStagingError(null);
            setSelectedCards([]);
            return;
          } else {
            // Still invalid - update staged cards and error
            setStagedCards(updatedStagedCards);
            if (updatedStagedCards.length < 3) {
              setStagingError('Need at least 3 cards for an equation');
            } else {
              setStagingError('Invalid equation. Cards must form a valid math equation (e.g., 2 + 3 = 5)');
            }
            setSelectedCards([]);
            return;
          }
        }
      }

      // Check if the dragged card is part of a selection
      const isDraggedCardSelected = selectedCards.some(c => c.id === draggedCard.id);

      // Get the cards being dropped
      const cardsToPlay = isDraggedCardSelected && selectedCards.length > 1
        ? selectedCards
        : [currentUserPlayer?.hand?.find(c => c.id === draggedCard.id)].filter(Boolean);

      if (cardsToPlay.length === 0) return;

      // For single cards or pairs, check if we can play them immediately
      if (cardsToPlay.length === 1) {
        const card = cardsToPlay[0] as Card;

        // Single number card - discard immediately
        if (card.type === 'number') {
          playMove({
            type: 'discard',
            playerId: currentUserId,
            cards: [card],
            timestamp: Date.now()
          });
          setSelectedCards([]);
          return;
        }

        // Jester - play immediately
        if (card.type === 'jester') {
          playMove({
            type: 'play_jester',
            playerId: currentUserId,
            cards: [card],
            timestamp: Date.now()
          });
          setSelectedCards([]);
          return;
        }

        // Dragon or Wand - discard immediately (not during defense)
        if (card.type === 'dragon' || card.type === 'wand') {
          playMove({
            type: 'discard',
            playerId: currentUserId,
            cards: [card],
            timestamp: Date.now()
          });
          setSelectedCards([]);
          return;
        }

        // Action cards that need targets - check if valid targets exist
        if (['king', 'knight', 'potion'].includes(card.type)) {
          // Check for valid targets based on card type
          let hasValidTargets = false;

          if (card.type === 'king') {
            // Kings target sleeping queens
            hasValidTargets = gameState?.sleepingQueens && gameState.sleepingQueens.length > 0;
          } else if (card.type === 'knight' || card.type === 'potion') {
            // Knights and Potions target opponent queens
            hasValidTargets = otherPlayers.some(player => player.queens && player.queens.length > 0);
          }

          if (hasValidTargets) {
            // Stage the card for target selection
            setStagedCards([card]);
            setSelectedCards([]);
            setShowPopover(true);
          } else {
            // No valid targets - discard the card
            playMove({
              type: 'discard',
              playerId: currentUserId,
              cards: [card],
              timestamp: Date.now()
            });
            setSelectedCards([]);
          }
          return;
        }
      }

      // Two cards - check if they're a matching pair
      if (cardsToPlay.length === 2 &&
          cardsToPlay.every(c => c && isNumberCard(c))) {
        const [card1, card2] = cardsToPlay as NumberCard[];
        if (card1.value === card2.value) {
          // Matching pair - discard immediately
          playMove({
            type: 'discard',
            playerId: currentUserId,
            cards: cardsToPlay as Card[],
            timestamp: Date.now()
          });
          setSelectedCards([]);
          return;
        }
        // Non-matching pair - stage them to show error
        setStagedCards(cardsToPlay as Card[]);
        setStagingError('Need at least 3 cards for an equation, or a matching pair to discard');
        setSelectedCards([]);
        setShowPopover(true);
        return;
      }

      // Three or more cards - check if they form a valid equation
      if (cardsToPlay.length >= 3) {
        // Check if all cards are number cards
        if (cardsToPlay.every(c => c && isNumberCard(c))) {
          const numberCards = cardsToPlay as NumberCard[];
          const values = numberCards.map(c => c.value);

          // Check if it's a valid equation
          const validation = validateMathEquation(values);

          if (validation.isValid) {
            // Valid equation - play immediately
            playMove({
              type: 'play_math',
              playerId: currentUserId,
              cards: cardsToPlay as Card[],
              mathEquation: {
                cards: cardsToPlay as Card[],
                equation: validation.equation || '',
                result: values[values.length - 1]
              },
              timestamp: Date.now()
            });
            setSelectedCards([]);
            return;
          }

          // Invalid equation - stage with error
          setStagedCards(cardsToPlay as Card[]);
          setStagingError('Invalid equation. Cards must form a valid math equation (e.g., 2 + 3 = 5)');
          setSelectedCards([]);
          setShowPopover(true);
          return;
        }

        // Mixed cards or non-number cards - stage with error
        setStagedCards(cardsToPlay as Card[]);
        setStagingError('Cannot play these cards together');
        setSelectedCards([]);
        setShowPopover(true);
        return;
      }

      // Clear selection
      setSelectedCards([]);
      return;
    }
  }, [currentUserId, currentUserPlayer, canInteract, selectedCards, playMove]);
  
  // Defense handlers
  const handlePlayDragon = useCallback(async () => {
    console.log('[GameBoard] handlePlayDragon called');
    if (!gameState?.pendingKnightAttack) {
      console.log('[GameBoard] No pending knight attack');
      return;
    }

    console.log('[GameBoard] Playing dragon defense');
    await playMove({
      type: 'play_dragon',
      playerId: currentUserId, // Use current user's ID - only the target can block knight attacks
      cards: [],
      timestamp: Date.now()
    });
  }, [gameState, playMove, currentUserId]);
  
  const handlePlayWand = useCallback(async () => {
    console.log('[GameBoard] handlePlayWand called', {
      hasPendingAttack: !!gameState?.pendingPotionAttack,
      pendingAttack: gameState?.pendingPotionAttack
    });

    if (!gameState?.pendingPotionAttack) {
      console.log('[GameBoard] No pending potion attack to defend');
      return;
    }

    console.log('[GameBoard] Playing wand defense');
    await playMove({
      type: 'play_wand',
      playerId: currentUserId, // Use current user's ID since any player with wand can block
      cards: [],
      targetCard: gameState.pendingPotionAttack.targetQueen,
      timestamp: Date.now()
    });
  }, [gameState, playMove, currentUserId]);
  
  
  const handleAllowKnightAttack = useCallback(async () => {
    console.log('[GameBoard] handleAllowKnightAttack called', {
      hasPendingAttack: !!gameState?.pendingKnightAttack,
      currentUserId,
      pendingAttack: gameState?.pendingKnightAttack
    });

    if (!gameState?.pendingKnightAttack || !currentUserId) return;

    // Allow the knight attack to proceed
    // Player has chosen not to defend
    console.log('[GameBoard] Sending allow_knight_attack move');
    await playMove({
      type: 'allow_knight_attack',
      playerId: currentUserId,
      cards: [],
      timestamp: Date.now()
    });
  }, [gameState, currentUserId, playMove]);
  
  const handleAllowPotionAttack = useCallback(async () => {
    console.log('[GameBoard] handleAllowPotionAttack called', {
      hasPendingAttack: !!gameState?.pendingPotionAttack,
      currentUserId,
      pendingAttack: gameState?.pendingPotionAttack
    });

    if (!gameState?.pendingPotionAttack || !currentUserId) return;

    // Allow the potion attack to proceed
    // Player has chosen not to defend
    console.log('[GameBoard] Sending allow_potion_attack move');
    await playMove({
      type: 'allow_potion_attack',
      playerId: currentUserId,
      cards: [],
      timestamp: Date.now()
    });
  }, [gameState, currentUserId, playMove]);

  // Get personalized message for when your queen gets stolen
  const getPersonalizedMessage = useCallback((action: LastAction | undefined): string => {
    if (!action || !currentUserId) return action?.message || '';

    // Check if this was a knight attack that affected the current player
    if (action.actionType === 'play_knight' && action.playerId !== currentUserId) {
      // Check if the message indicates a queen was stolen
      if (action.message?.includes('steal') && action.message?.includes('from')) {
        // Try to determine if current player was the victim
        const currentPlayerName = currentUserPlayer?.name;
        if (currentPlayerName && action.message.includes(currentPlayerName)) {
          // Parse queen name from the message
          const queenMatch = action.message.match(/steal (the )?(.+?) from/);
          if (queenMatch) {
            const queenName = queenMatch[2] || queenMatch[1];

            // Generate queen-specific humorous messages
            let knightMessage = '';

            // Check for specific queen names and create tailored messages
            if (queenName.includes('Rose')) {
              const messages = [
                `${action.playerName}'s knight picked your Rose Queen! Every rose has its thorn... and its new owner! 🌹`,
                `Your Rose Queen was swept off her feet by ${action.playerName}'s charming knight! 🌹⚔️`,
                `${action.playerName}'s knight stopped to smell the roses... and took yours! 🌹`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Cat')) {
              const messages = [
                `${action.playerName}'s knight lured your Cat Queen away with treats! The purr-fect heist! 🐱⚔️`,
                `Your Cat Queen used one of her nine lives to join ${action.playerName}'s kingdom! 🐱`,
                `${action.playerName}'s knight cat-napped your feline royalty! Me-owch! 🐱⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Dog')) {
              const messages = [
                `${action.playerName}'s knight whistled and your Dog Queen came running! Who's a good queen? 🐕⚔️`,
                `Your Dog Queen fetched a new kingdom with ${action.playerName}'s knight! 🐕`,
                `${action.playerName}'s knight threw a bone and your Dog Queen couldn't resist! 🐕⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Pancake')) {
              const messages = [
                `${action.playerName}'s knight flipped your Pancake Queen to their side! 🥞⚔️`,
                `Your Pancake Queen got stacked in ${action.playerName}'s kingdom! Butter luck next time! 🥞`,
                `${action.playerName}'s knight served up a royal breakfast heist! 🥞⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Ice Cream')) {
              const messages = [
                `${action.playerName}'s knight gave your Ice Cream Queen the cold shoulder... then took her! 🍦⚔️`,
                `Your Ice Cream Queen melted for ${action.playerName}'s dashing knight! 🍦`,
                `${action.playerName}'s knight scooped up your Ice Cream Queen! Brain freeze! 🍦⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Rainbow')) {
              const messages = [
                `${action.playerName}'s knight found the pot of gold at the end of your Rainbow Queen! 🌈⚔️`,
                `Your Rainbow Queen's colors now fly in ${action.playerName}'s kingdom! 🌈`,
                `${action.playerName}'s knight rode the rainbow... and took your queen! 🌈⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Moon')) {
              const messages = [
                `${action.playerName}'s knight launched a midnight raid on your Moon Queen! 🌙⚔️`,
                `Your Moon Queen was eclipse-d by ${action.playerName}'s brave knight! 🌙`,
                `${action.playerName}'s knight shot for the moon and landed your queen! 🌙⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Strawberry')) {
              const messages = [
                `${action.playerName}'s knight picked your Strawberry Queen! Berry unfortunate! 🍓⚔️`,
                `Your Strawberry Queen got into a jam with ${action.playerName}'s knight! 🍓`,
                `${action.playerName}'s knight harvested your Strawberry Queen! 🍓⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Heart')) {
              const messages = [
                `${action.playerName}'s knight stole your Heart Queen! How heartbreaking! 💔⚔️`,
                `Your Heart Queen had a change of heart thanks to ${action.playerName}'s knight! ❤️`,
                `${action.playerName}'s knight captured your Heart Queen! Love hurts! 💔⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Ladybug')) {
              const messages = [
                `${action.playerName}'s knight caught your Ladybug Queen! Not so lucky now! 🐞⚔️`,
                `Your Ladybug Queen flew away with ${action.playerName}'s knight! 🐞`,
                `${action.playerName}'s knight spotted your Ladybug Queen and claimed her! 🐞⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else if (queenName.includes('Star')) {
              const messages = [
                `${action.playerName}'s knight wished upon your Star Queen... and got her! ⭐⚔️`,
                `Your Star Queen's light now shines in ${action.playerName}'s kingdom! ⭐`,
                `${action.playerName}'s knight reached for the stars and grabbed yours! ⭐⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            } else {
              // Generic knight messages for queens without specific names
              const messages = [
                `${action.playerName}'s gallant knight has rescued your ${queenName} to a "better" kingdom! ⚔️`,
                `Your ${queenName} was charmed by ${action.playerName}'s dashing knight! Off they go! ⚔️`,
                `${action.playerName}'s knight successfully completed Operation: Steal ${queenName}! ⚔️`
              ];
              knightMessage = messages[Math.floor(Math.random() * messages.length)];
            }

            return knightMessage;
          }
        }
      }
    }

    // Check if this was a potion that affected the current player
    if (action.actionType === 'play_potion' && action.playerId !== currentUserId) {
      const currentPlayerName = currentUserPlayer?.name;
      if (currentPlayerName && action.message?.includes(currentPlayerName)) {
        const queenMatch = action.message?.match(/put .+'s (.+?) to sleep/);
        if (queenMatch) {
          const queenName = queenMatch[1];

          // Generate queen-specific sleep messages
          let potionMessage = '';

          if (queenName.includes('Rose')) {
            const messages = [
              `${action.playerName}'s potion put your Rose Queen into beauty sleep! 🌹💤`,
              `Your Rose Queen is having thorny dreams thanks to ${action.playerName}'s sleeping potion! 🌹😴`,
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          } else if (queenName.includes('Cat')) {
            const messages = [
              `${action.playerName}'s potion gave your Cat Queen a cat-nap! 🐱💤`,
              `Your Cat Queen is purr-fectly asleep thanks to ${action.playerName}'s potion! 🐱😴`,
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          } else if (queenName.includes('Dog')) {
            const messages = [
              `${action.playerName}'s potion sent your Dog Queen to the doghouse of dreams! 🐕💤`,
              `Your Dog Queen is chasing rabbits in dreamland thanks to ${action.playerName}! 🐕😴`,
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          } else if (queenName.includes('Pancake')) {
            const messages = [
              `${action.playerName}'s potion flattened your Pancake Queen into a sleep! 🥞💤`,
              `Your Pancake Queen is having sweet dreams thanks to ${action.playerName}'s syrupy potion! 🥞😴`,
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          } else if (queenName.includes('Ice Cream')) {
            const messages = [
              `${action.playerName}'s potion gave your Ice Cream Queen a brain freeze into sleep! 🍦💤`,
              `Your Ice Cream Queen is on ice thanks to ${action.playerName}'s chilling potion! 🍦😴`,
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          } else {
            // Generic potion messages
            const messages = [
              `${action.playerName}'s sleeping potion knocked out your ${queenName}! Sweet dreams! 💤`,
              `Your ${queenName} is catching Z's thanks to ${action.playerName}'s potion! 😴`,
              `${action.playerName} brewed the perfect sleeping potion for your ${queenName}! 🧪💤`
            ];
            potionMessage = messages[Math.floor(Math.random() * messages.length)];
          }

          return potionMessage;
        }
      }
    }

    return action.message || '';
  }, [currentUserId, currentUserPlayer]);
  
  // Clear staged cards
  const handleClearStagedCards = useCallback(async () => {
    // If we have action cards staged on the server, clear them
    if (currentPlayerStagedCards.length > 0 &&
        currentPlayerStagedCards.some((c: any) => ['king', 'knight', 'potion'].includes(c.type))) {
      await playMove({
        type: 'clear_staged',
        playerId: currentUserId,
        cards: [],
        timestamp: Date.now()
      });
    }
    setStagedCards([]);
    setShowPopover(false);
  }, [currentPlayerStagedCards, currentUserId, playMove]);

  // Handle card drop on play area
  const handleCardDropOnPlayArea = useCallback((card: Card) => {
    setStagedCards(prev => [...prev, card]);
    setShowPopover(true);
  }, []);

  // Handle action result display for staging drawer
  useEffect(() => {
    if (!gameState?.lastAction) return;

    // Prevent showing old actions on initial page load
    if (lastActionTimestamp === null) {
      // First time seeing an action - check if it's recent (within last 5 seconds)
      const isRecentAction = Date.now() - gameState.lastAction.timestamp < 5000;
      setLastActionTimestamp(gameState.lastAction.timestamp);

      // If the action is old (from before page load), don't show it
      if (!isRecentAction) {
        return;
      }
      // If it's recent, continue to show it
    } else {
      // Only process new actions
      if (gameState.lastAction.timestamp <= lastActionTimestamp) {
        return;
      }

      // Update the timestamp
      setLastActionTimestamp(gameState.lastAction.timestamp);
    }

    // Only show action result if this is a completed action (not staging)
    // Check if the action type indicates completion
    const isCompletedAction =
      gameState.lastAction.actionType !== 'stage_cards' &&
      !gameState.lastAction.message?.includes('is selecting') &&
      !gameState.lastAction.message?.includes('staged');

    if (isCompletedAction) {
      // Show action result for any completed action that just happened (for observers)
      setShowActionResult(true);
      setDrawerDismissed(false); // Reset dismissal state for new actions
      // Don't auto-hide - let user dismiss manually or by selecting a card
    } else {
      // If it's just staging, ensure we're not showing action result
      setShowActionResult(false);
    }
  }, [gameState?.lastAction?.timestamp, lastActionTimestamp]); // Re-trigger on timestamp change

  // Reset drawer dismissal when new staged cards appear from other players
  useEffect(() => {
    if (gameState?.stagedCards) {
      const otherPlayerHasStagedCards = Object.keys(gameState.stagedCards).some(playerId =>
        playerId !== currentUserId && gameState.stagedCards![playerId]?.length > 0
      );
      if (otherPlayerHasStagedCards) {
        setDrawerDismissed(false);
      }
    }
  }, [gameState?.stagedCards, currentUserId]);

  // Auto-dismiss drawer when it's your turn to select for jester reveal or Rose Queen bonus
  useEffect(() => {
    if (jesterReveal?.waitingForQueenSelection && jesterReveal.targetPlayer === currentUserId) {
      // Auto-dismiss the drawer so player can see the queen selection UI
      setDrawerDismissed(true);
    }
    if (gameState?.roseQueenBonus?.pending && gameState.roseQueenBonus.playerId === currentUserId) {
      // Auto-dismiss for Rose Queen bonus selection too
      setDrawerDismissed(true);
    }
  }, [jesterReveal, gameState?.roseQueenBonus, currentUserId]);

  // Track recent defense actions to prevent showing modals again
  useEffect(() => {
    if (!gameState?.lastAction) return;

    const action = gameState.lastAction;

    // Only process if this is a new action (not one we've already shown)
    if (action.timestamp === lastDefenseTimestamp) return;

    if (action.actionType === 'play_dragon' && action.message?.includes('block')) {
      setRecentDefenseType('dragon');
      setLastDefenseTimestamp(action.timestamp);
    } else if (action.actionType === 'play_wand' && action.message?.includes('block')) {
      setRecentDefenseType('wand');
      setLastDefenseTimestamp(action.timestamp);
    }
  }, [gameState?.lastAction, lastDefenseTimestamp]);

  // Clear recent defense type after 5 seconds
  useEffect(() => {
    if (!recentDefenseType) return;

    const timer = setTimeout(() => {
      setRecentDefenseType(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [recentDefenseType]);
  
  // Defense modals will block until player makes a decision - no auto-timeout
  // This ensures players have time to think about their defensive options
  
  // Handle card selection for multi-select (pairs and equations)
  const handleCardSelect = useCallback((card: Card, event: React.MouseEvent) => {
    if (!isMyTurn) return;

    // Prevent drag-and-drop from interfering
    event.stopPropagation();
    event.preventDefault();

    // Dismiss the drawer when selecting a card
    setDrawerDismissed(true);

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
      if (isNumberCard(card1) && isNumberCard(card2) && card1.value === card2.value) {
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
      console.log('[GameBoard] Selecting bonus queen for Rose Queen:', {
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

      console.log('[GameBoard] Rose Queen bonus selection result:', moveResult);
      return;
    }

    // Check if this is a jester reveal queen selection
    if (gameState.jesterReveal?.waitingForQueenSelection &&
        gameState.jesterReveal.targetPlayer === currentUserId) {
      console.log('[GameBoard] Selecting queen for jester reveal:', {
        queen,
        jesterReveal: gameState.jesterReveal,
        currentUserId,
        targetPlayer: gameState.jesterReveal.targetPlayer
      });

      const moveResult = await playMove({
        type: 'play_jester',
        playerId: currentUserId,
        cards: [], // Empty since jester was already played
        targetCard: queen,
        timestamp: Date.now()
      });

      console.log('[GameBoard] Jester queen selection result:', moveResult);
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
            console.log('[GameBoard] Playing knight to steal queen:', {
              targetPlayer: targetPlayer.id,
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
            console.log('[GameBoard] Knight move result:', moveResult);
            setStagedCards([]); // Clear staged cards after executing the move
          }
        } else {
          console.log('[GameBoard] Invalid knight target - must select opponent queen');
        }
      } else if (hasPotion) {
        // Need to select target player for potion
        const targetPlayer = players.find(p => p.queens?.some(q => q.id === queen.id));
        if (targetPlayer) {
          const potionCard = currentPlayerStagedCards.find((card: Card) => card.type === 'potion');
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
  
  const pendingKnightAttack = gameState?.pendingKnightAttack;
  const pendingPotionAttack = gameState?.pendingPotionAttack;
  const winner = gameState?.winner ? players.find(p => p.id === gameState?.winner) : null;
  const jesterReveal = gameState?.jesterReveal;

  // Check if hand should be disabled - it should be disabled when:
  // 1. It's not my turn AND
  // 2. There's no jester reveal waiting for me AND
  // 3. There's no rose queen bonus for me
  // OR if there's a jester reveal waiting for someone else (not me)
  const isHandDisabled = !isMyTurn ||
    (jesterReveal?.waitingForQueenSelection && jesterReveal.targetPlayer !== currentUserId);

  // Debug logging for pending attacks - moved before early return
  useEffect(() => {
    if (pendingKnightAttack) {
      console.log('[GameBoard] Pending Knight Attack detected:', {
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
    (jesterReveal?.waitingForQueenSelection && jesterReveal?.targetPlayer === currentUserId) ||
    (gameState?.roseQueenBonus?.pending && gameState?.roseQueenBonus?.playerId === currentUserId)
  );

  const canSelectOpponentQueen = hasKnight || hasPotion;
  
  // Debug logging
  console.log('[GameBoard] Queen selection state:', {
    canSelectSleepingQueen,
    canSelectOpponentQueen,
    isMyTurn,
    currentPlayerStagedCards,
    hasKing,
    hasKnight,
    hasPotion,
    currentUserId: currentUserId,
    currentPlayerId: gameState?.currentPlayerId,
    jesterReveal: jesterReveal,
    gameMessage: gameState?.gameMessage
  });
  
  // Create a fixed array of 12 positions with queens or nulls
  const queenPositions = useMemo(() => {
    // Start with all 12 queen IDs in their original positions - must match cards.ts
    const allQueenIds = [
      'queen-cat', 'queen-dog', 'queen-cake', 'queen-pancake',
      'queen-ladybug', 'queen-sunflower', 'queen-rainbow', 'queen-heart',
      'queen-peacock', 'queen-moon', 'queen-starfish', 'queen-rose'
    ];

    // Map each position to either the queen object or null if awakened
    return allQueenIds.map(id => {
      return gameState?.sleepingQueens?.find(q => q.id === id) || null;
    });
  }, [gameState?.sleepingQueens]);

  // Early return after all hooks are defined
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

  // Render sleeping queen card or empty space
  const renderSleepingQueenSlot = (position: number) => {
    const queen = queenPositions[position];
    const isSelected = queen && selectedQueen?.id === queen.id;

    if (!queen) {
      // Render empty slot where queen was awakened - Responsive
      return (
        <div
          key={`empty-${position}`}
          className="card-base rounded-lg border-2 border-dashed border-gray-600/50 bg-gray-900/30 flex items-center justify-center"
        >
          <span className="text-gray-600 text-xs-responsive">Empty</span>
        </div>
      );
    }

    return (
      <div
        key={queen.id}
        className="relative card-base"
      >
        <div
          onClick={() => canSelectSleepingQueen && handleQueenSelect(queen)}
          className={clsx(
            'w-full h-full rounded-lg border-2 transition-all bg-purple-900/40 touch-target',
            isSelected
              ? 'border-blue-400 ring-2 ring-blue-400/50 scale-105 cursor-pointer'
              : canSelectSleepingQueen
                ? 'border-yellow-400 hover:border-yellow-300 hover:scale-105 cursor-pointer animate-pulse'
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 sm:p-3 md:p-4 safe-padding">
        <div className="container-responsive h-full flex flex-col">

          {/* Move History Sidebar */}
          <MoveHistorySidebar gameId={gameState?.id} players={[...(gameState?.players || [])]} lastAction={gameState?.lastAction} />


          {/* Info Drawer - Shows actions to players who aren't performing them */}
          {(
            <InfoDrawer
              isOpen={
                // Show if:
                // 1. Someone has staged cards (not the viewer)
                // 2. An action just completed (not by the viewer)
                // 3. Rose Queen bonus for another player
                // 4. Jester reveal waiting for another player to select
                // Don't show if the drawer has been dismissed (by selecting a card)
                !drawerDismissed && !!(
                  (gameState?.stagedCards && Object.keys(gameState.stagedCards).some(playerId =>
                    playerId !== currentUserId && gameState.stagedCards![playerId]?.length > 0
                  )) ||
                  (showActionResult && gameState?.lastAction && gameState.lastAction.playerId !== currentUserId) ||
                  (gameState?.roseQueenBonus?.pending && gameState.roseQueenBonus.playerId !== currentUserId) ||
                  (jesterReveal?.waitingForQueenSelection && jesterReveal.targetPlayer !== currentUserId)
                )
              }
              cards={
                // Show cards from action or staged cards
                (showActionResult && gameState?.lastAction && gameState.lastAction.playerId !== currentUserId)
                  ? gameState.lastAction.cards || []
                  : (!showActionResult && gameState?.stagedCards)
                    ? Object.entries(gameState.stagedCards)
                        .filter(([playerId]) => playerId !== currentUserId)
                        .flatMap(([_, cards]) => cards || [])
                    : []
              }
              message={
                // Show the action message for completed actions, Rose Queen bonus, or Jester reveal
                (jesterReveal?.waitingForQueenSelection && jesterReveal.targetPlayer !== currentUserId)
                  ? (() => {
                      const targetPlayer = players.find(p => p.id === jesterReveal.targetPlayer);
                      const value = jesterReveal.revealedCard.type === 'number' ?
                        (jesterReveal.revealedCard as NumberCard).value : null;
                      return `🃏 Jester revealed a ${value || 'card'}! ${targetPlayer?.name || 'Player'} is choosing a queen to wake up...`;
                    })()
                  : (gameState?.roseQueenBonus?.pending && gameState.roseQueenBonus.playerId !== currentUserId)
                    ? `🌹 ${players.find(p => p.id === gameState.roseQueenBonus?.playerId)?.name || 'Player'} woke the Rose Queen! Selecting bonus queen...`
                    : (showActionResult && gameState?.lastAction && gameState.lastAction.playerId !== currentUserId)
                      ? getPersonalizedMessage(gameState.lastAction)
                      : gameState?.stagedCards
                        ? (() => {
                            const otherPlayerEntry = Object.entries(gameState.stagedCards)
                              .filter(([playerId]) => playerId !== currentUserId && gameState.stagedCards![playerId]?.length > 0)[0];

                            if (otherPlayerEntry) {
                              const [playerId, cards] = otherPlayerEntry;
                              const playerName = players.find(p => p.id === playerId)?.name || 'Player';
                              const stagedCard = cards[0];

                              if (stagedCard?.type === 'king') {
                                return `👑 ${playerName} played the ${stagedCard.name || 'King'} and is choosing a queen to wake up...`;
                              } else if (stagedCard?.type === 'knight') {
                                return `⚔️ ${playerName} played a Knight and is choosing a queen to steal...`;
                              } else if (stagedCard?.type === 'potion') {
                                return `🧪 ${playerName} played a Sleeping Potion and is choosing a queen to put to sleep...`;
                              } else {
                                return `${playerName} is selecting cards...`;
                              }
                            }
                            return 'Waiting...';
                          })()
                        : 'Waiting...'
              }
              playerName={
                showActionResult && gameState?.lastAction
                  ? (() => {
                      console.log('[InfoDrawer] Using lastAction playerName:', {
                        lastActionPlayerId: gameState.lastAction.playerId,
                        lastActionPlayerName: gameState.lastAction.playerName,
                        currentUserId,
                        message: gameState.lastAction.message
                      });
                      return gameState.lastAction.playerName;
                    })()
                  : Object.entries(gameState?.stagedCards || {})
                      .filter(([playerId]) => playerId !== currentUserId && gameState.stagedCards![playerId]?.length > 0)
                      .map(([playerId]) => players.find(p => p.id === playerId)?.name)[0]
              }
              isProcessing={false}
              isPersistent={true}
              onDismiss={() => setDrawerDismissed(true)}
            />
          )}

          {/* Drawn Cards Info Drawer - Private to current player only */}
          <InfoDrawer
            isOpen={!!(drawnCards && drawnCards.cards.length > 0)}
            cards={drawnCards?.cards || []}
            message={`Here ${drawnCards?.cards.length === 1 ? 'is the card' : 'are the cards'} you picked up:`}
            playerName="Cards Drawn"
            isProcessing={false}
            isPersistent={false}
            onDismiss={clearDrawnCards}
          />




          {/* Main Game Layout - Responsive */}
          <div className="flex-1 flex flex-col lg:flex-row gap-2 sm:gap-3 md:gap-4">
            
            {/* Top Players Row (Mobile) / Left Players Column (Desktop) */}
            <div className="flex flex-row lg:flex-col gap-2 sm:gap-3 lg:w-48 order-2 lg:order-1">
              {otherPlayers.slice(0, 2).map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentTurn={currentPlayer?.id === player.id}
                  calculateScore={calculatePlayerScore}
                  canSelectOpponentQueen={canSelectOpponentQueen}
                  currentUserId={currentUserId}
                  handleQueenSelect={handleQueenSelect}
                  currentPlayerQueens={currentPlayer?.queens}
                />
              ))}
            </div>
            
            {/* Central Game Area - Responsive */}
            <div className="flex-1 flex flex-col gap-2 sm:gap-3 md:gap-4 order-1 lg:order-2">
              
              {/* Play Area with Sleeping Queens and Piles - Responsive */}
              <div className="relative bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-3 sm:p-4 md:p-6">
                {/* Play Area Drop Zone - overlays the entire play area */}
                <PlayAreaDropZone
                  isCurrentTurn={isMyTurn}
                  canPlayCards={canInteract}
                />

                {/* Staging Area - Only show when there are staged cards */}
                {stagedCards.length > 0 && (
                  <StagingArea
                    cards={stagedCards}
                    error={stagingError}
                    onClear={() => {
                      setStagedCards([]);
                      setStagingError(null);
                    }}
                  />
                )}

                <div className="flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-6 md:gap-8">

                  {/* Mobile Layout: 4x3 Grid of Queens with Piles Below */}
                  <div className="md:hidden w-full">
                    <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-4">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(position =>
                        renderSleepingQueenSlot(position)
                      )}
                    </div>
                    <div className="flex justify-center">
                      <DrawDiscardPiles
                        drawPile={[...(gameState?.deck || [])]}
                        discardPile={[...(gameState?.discardPile || [])]}
                      />
                    </div>
                  </div>

                  {/* Desktop Layout: Original 2x3 + Piles + 2x3 */}
                  <div className="hidden md:flex items-center justify-center gap-4 md:gap-8">
                    {/* Left Queens (2x3 grid) */}
                    <div className="grid grid-cols-2 gap-2">
                      {[0, 1, 2, 3, 4, 5].map(position =>
                        renderSleepingQueenSlot(position)
                      )}
                    </div>

                    {/* Draw and Discard Piles */}
                    <DrawDiscardPiles
                      drawPile={[...(gameState?.deck || [])]}
                      discardPile={[...(gameState?.discardPile || [])]}
                    />

                    {/* Right Queens (2x3 grid) */}
                    <div className="grid grid-cols-2 gap-2">
                      {[6, 7, 8, 9, 10, 11].map(position =>
                        renderSleepingQueenSlot(position)
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Player Hand Area - Using DroppableArea */}
              <div className="relative">
                <DroppableArea
                  id="hand"
                  className={clsx(
                    'backdrop-blur-sm rounded-lg p-4',
                    !isHandDisabled
                      ? 'bg-green-500/10 border-green-400/30'
                      : 'bg-white/5 border-white/10'
                  )}
                  label="Your Hand"
                  disabled={isHandDisabled}
                >
                  {currentUserPlayer ? (
                    <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <h3 className="text-base-responsive sm:text-lg font-medium text-white">Your Hand</h3>
                        {isMyTurn && (
                          <span className="text-xs-responsive sm:text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">
                            <span className="hidden sm:inline">Your Turn! Drag cards to the play area above</span>
                            <span className="sm:hidden">Your Turn!</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 sm:h-4 w-3 sm:w-4 text-purple-300" />
                          <span className="text-purple-200">
                            {currentUserPlayer.queens?.length || 0} queens
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Trophy className="h-3 sm:h-4 w-3 sm:w-4 text-yellow-300" />
                          <span className="text-yellow-200">
                            {calculatePlayerScore(currentUserPlayer)} points
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Cards Container - Responsive layout */}
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start">
                      {/* Player's Queens - Responsive card style */}
                      {currentUserPlayer.queens && currentUserPlayer.queens.length > 0 && (
                        <div className="flex gap-2 flex-wrap md:flex-nowrap md:flex-shrink-0 items-start">
                          {currentUserPlayer.queens.map(queen => (
                            <div
                              key={queen.id}
                              className="relative group"
                            >
                              <div className="card-base sm:card-large bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg border-2 border-purple-400 shadow-xl flex flex-col items-center justify-center p-2 transform transition-transform group-hover:scale-105">
                                <Crown className="h-4 sm:h-5 md:h-6 w-4 sm:w-5 md:w-6 text-yellow-400 mb-1" />
                                <div className="text-xs-responsive sm:text-xs text-white text-center font-semibold">
                                  {queen.name}
                                </div>
                                <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-yellow-400 text-black text-xs-responsive sm:text-xs font-bold w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center">
                                  {queen.points}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Divider if there are queens - Hide on mobile */}
                      {currentUserPlayer.queens && currentUserPlayer.queens.length > 0 && (
                        <div className="hidden md:block w-px bg-gray-600/50 mx-2" />
                      )}

                      {/* Player's Regular Cards - Draggable with Multi-Select */}
                      <div className="flex flex-wrap gap-2 flex-1 items-start">
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
                                  "relative cursor-pointer transition-all inline-block",
                                  isSelected && "ring-2 ring-blue-400 rounded-lg scale-105"
                                )}
                              >
                                <DraggableCard
                                  card={card}
                                  id={`hand-${card.id}`}
                                  disabled={isHandDisabled}
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
                    </div>

                    {/* Hand Overlay - Shows staged cards action over the hand */}
                    {isMyTurn && currentPlayerStagedCards.length > 0 && (
                      <HandOverlay
                        cards={[...currentPlayerStagedCards]}
                        isVisible={currentPlayerStagedCards.length > 0}
                        onCancel={handleClearStagedCards}
                      />
                    )}

                    {/* Action Banner - Shows special actions like Jester reveal or Rose Queen bonus */}
                    {jesterReveal?.waitingForQueenSelection && jesterReveal.targetPlayer === currentUserId && (
                      <ActionBanner
                        actionType="jester"
                        playerName={gameState?.players.find(p => p.id === jesterReveal.originalPlayerId)?.name}
                        revealedValue={(jesterReveal.revealedCard as any).value}
                        isVisible={true}
                        isOwnAction={jesterReveal.originalPlayerId === currentUserId}
                        onCancel={undefined}  // Can't cancel a jester queen selection
                      />
                    )}
                    {gameState?.roseQueenBonus?.pending && gameState.roseQueenBonus.playerId === currentUserId && (
                      <ActionBanner
                        actionType="rose_bonus"
                        isVisible={true}
                        onCancel={undefined}  // Can't cancel a rose bonus selection
                      />
                    )}

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
            </div>
            
            {/* Bottom Players Row (Mobile) / Right Players Column (Desktop) */}
            <div className="flex flex-row lg:flex-col gap-2 sm:gap-3 lg:w-48 order-3">
              {otherPlayers.slice(2, 4).map(player => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentTurn={currentPlayer?.id === player.id}
                  calculateScore={calculatePlayerScore}
                  canSelectOpponentQueen={canSelectOpponentQueen}
                  currentUserId={currentUserId}
                  handleQueenSelect={handleQueenSelect}
                  currentPlayerQueens={currentPlayer?.queens}
                />
              ))}
            </div>
          </div>
        </div>
        

        {/* Modals */}
        {/* Dragon Block Modal - Show only for the target player if they have a dragon and haven't played it yet */}
        {pendingKnightAttack &&
         pendingKnightAttack.target === currentUserId &&
         currentUserPlayer?.hand?.some(card => card.type === 'dragon') &&
         recentDefenseType !== 'dragon' && ( // Don't show if this player just played a dragon
          <DragonBlockModal
            isOpen={true}
            onPlayDragon={handlePlayDragon}
            onAllowAttack={handleAllowKnightAttack}
            attackerName={players.find(p => p.id === pendingKnightAttack.attacker)?.name || 'Unknown'}
            targetQueenName={pendingKnightAttack.targetQueen.name}
          />
        )}


        {/* Wand Block Modal - Show for any player with a wand EXCEPT the one currently playing it */}
        {pendingPotionAttack &&
         currentUserPlayer?.hand?.some(card => card.type === 'wand') &&
         recentDefenseType !== 'wand' && ( // Don't show if this player just played a wand
          <WandBlockModal
            isOpen={true}
            onPlayWand={handlePlayWand}
            onAllowAttack={handleAllowPotionAttack}
            attackerName={players.find(p => p.id === pendingPotionAttack.attacker)?.name || 'Unknown'}
            targetQueenName={pendingPotionAttack.targetQueen.name}
          />
        )}

        
        {/* Game Over Overlay - replaces the old WinModal redirect */}
        {winner && (
          <GameOverOverlay
            winner={winner}
            players={[...players]}
            currentPlayerId={currentUserId}
            onBackToLobby={() => {
              // Navigate back to lobby
              window.location.href = '/';
            }}
          />
        )}

        {/* First Player Selection Wheel */}
        {showFirstPlayerAnimation && gameState?.currentPlayerId && (
          <PlayerDiceRoll
            isVisible={showFirstPlayerAnimation}
            players={players.map(p => ({ id: p.id, name: p.name }))}
            selectedPlayerId={gameState.currentPlayerId}
            gameId={gameState.id} // Pass game ID for deterministic randomness
            onComplete={() => {
              setShowFirstPlayerAnimation(false);
              // First player logging is handled inside PlayerDiceRoll component
            }}
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

// Responsive PlayerCard component
function PlayerCard({
  player,
  isCurrentTurn,
  calculateScore,
  canSelectOpponentQueen,
  currentUserId,
  handleQueenSelect,
  currentPlayerQueens
}: {
  player: Player;
  isCurrentTurn: boolean;
  calculateScore: (player: Player) => number;
  canSelectOpponentQueen: boolean;
  currentUserId: string;
  handleQueenSelect: (queen: Queen) => void;
  currentPlayerQueens?: Queen[];
}) {
  return (
    <div className={clsx(
      'bg-white/5 backdrop-blur-sm rounded-lg border p-2 sm:p-3 flex-1 lg:flex-initial',
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
        <div className="mt-2 grid grid-cols-2 xs:grid-cols-3 gap-1">
          {player.queens.map(queen => {
            // Check if this queen can be selected (Knight/Potion and not same player)
            let canSelect = canSelectOpponentQueen && player.id !== currentUserId;
            let conflictMessage = '';

            // Additional check for Cat/Dog conflict when using Knight
            if (canSelect && currentPlayerQueens) {
              const hasCatQueen = currentPlayerQueens.some(q => q.name === 'Cat Queen');
              const hasDogQueen = currentPlayerQueens.some(q => q.name === 'Dog Queen');

              if (hasCatQueen && queen.name === 'Dog Queen') {
                canSelect = false;
                conflictMessage = 'Cannot steal - you have Cat Queen!';
              } else if (hasDogQueen && queen.name === 'Cat Queen') {
                canSelect = false;
                conflictMessage = 'Cannot steal - you have Dog Queen!';
              }
            }

            return (
              <div
                key={queen.id}
                onClick={() => canSelect && handleQueenSelect(queen)}
                className={clsx(
                  "group transition-all cursor-pointer",
                  canSelect && "hover:scale-110"
                )}
                title={conflictMessage || `${queen.name} (${queen.points} pts)`}
              >
                <div className={clsx(
                  "relative w-14 h-20 rounded border-2 shadow-lg flex flex-col items-center justify-center p-1 transition-all",
                  canSelect
                    ? "bg-gradient-to-br from-red-600/80 to-red-800/80 border-red-400 hover:border-red-300 hover:shadow-red-400/50"
                    : "bg-gradient-to-br from-purple-600/80 to-purple-800/80 border-purple-400"
                )}>
                  <Crown className="h-4 w-4 text-yellow-400 mb-0.5" />
                  <div className="text-[8px] text-white text-center font-semibold leading-tight">
                    {queen.name.split(' ')[0]}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-purple-800">
                    {queen.points}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}