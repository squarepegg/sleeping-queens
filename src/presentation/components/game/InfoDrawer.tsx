import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X, Sparkles, Clock } from 'lucide-react';
import { Card } from '@/domain/models/Card';
import { CardComponent } from './CardComponent';

interface InfoDrawerProps {
  isOpen: boolean;
  cards: Card[];
  message: string;
  playerName?: string;
  onDismiss?: () => void;
  isProcessing?: boolean;
  isPersistent?: boolean; // If true, drawer stays open until manually dismissed
  isCurrentPlayer?: boolean; // If true, shows "Your Turn" instead of "[PlayerName]'s Turn"
  actionDetails?: Array<{
    action: string;
    detail?: string;
    cards?: Card[];
  }>; // For showing grouped actions
}


export const InfoDrawer: React.FC<InfoDrawerProps> = ({
  isOpen,
  cards,
  message,
  playerName,
  onDismiss,
  isProcessing = false,
  isPersistent = false,
  isCurrentPlayer = false,
  actionDetails
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showMinimizedButton, setShowMinimizedButton] = useState(false);

  // Generate friendly message from actionDetails
  const getFriendlyMessage = (): string => {
    if (!actionDetails || actionDetails.length === 0) {
      return message || 'Waiting for action...';
    }

    // Look for key actions to create friendly messages
    const playedKing = actionDetails.find(d => d.action === 'Played King');
    const wokeQueen = actionDetails.find(d => d.action === 'Woke Queen');
    const playedKnight = actionDetails.find(d => d.action === 'Played Knight');
    const stoleQueen = actionDetails.find(d => d.action === 'Stole Queen');
    const playedJester = actionDetails.find(d => d.action === 'Played Jester');
    const playedPotion = actionDetails.find(d => d.action === 'Played Potion');
    const discardedCards = actionDetails.find(d => d.action === 'Discarded cards');
    const roseBonus = actionDetails.find(d => d.action === 'Rose Queen Bonus');
    const queenConflict = actionDetails.find(d => d.action === 'Queen Conflict');

    // Create contextual friendly messages
    if (playedKing && wokeQueen) {
      const kingName = playedKing.cards?.[0]?.name || 'King';
      const queenName = wokeQueen.cards?.[0]?.name || 'Queen';
      const points = wokeQueen.detail?.match(/\d+/)?.[0] || '';

      if (roseBonus) {
        return `Woke ${queenName} (${points} points) with ${kingName}! Rose Queen bonus activated - choose another queen!`;
      }
      if (queenConflict) {
        return `Woke ${queenName} with ${kingName}, but ${queenConflict.detail}`;
      }
      return `Woke ${queenName} (${points} points) with ${kingName}!`;
    }

    if (playedKnight) {
      if (stoleQueen) {
        const queenInfo = stoleQueen.detail?.match(/(.+?) \((\d+) points\)/);
        const queenName = queenInfo?.[1] || 'a Queen';
        const targetPlayer = stoleQueen.detail?.match(/from (.+)/)?.[1] || 'opponent';
        return `Successfully stole ${queenName} from ${targetPlayer} with a Knight!`;
      }
      const targetInfo = actionDetails.find(d => d.action === 'Target');
      if (targetInfo) {
        const waiting = actionDetails.find(d => d.action === 'Waiting');
        if (waiting?.detail?.includes('can block')) {
          return `Attempting to steal ${targetInfo.detail} - they can defend with a Dragon!`;
        }
        return `Attempting to steal ${targetInfo.detail}!`;
      }
    }

    if (playedJester) {
      const revealedCard = actionDetails.find(d => d.action === 'Revealed card');
      if (revealedCard?.detail) {
        return `Played a Jester and revealed a ${revealedCard.detail}!`;
      }
    }

    if (playedPotion) {
      const putToSleep = actionDetails.find(d => d.action === 'Put Queen to sleep');
      if (putToSleep) {
        const queenName = putToSleep.cards?.[0]?.name || 'Queen';
        return `Used a Sleeping Potion on ${queenName}!`;
      }
    }

    if (discardedCards) {
      return discardedCards.detail || 'Discarded cards and drew new ones!';
    }

    // Default to original message
    return message || 'Action completed!';
  };

  // Reset minimized state when drawer opens with new content
  useEffect(() => {
    if (isOpen) {
      setIsMinimized(false);
      setShowMinimizedButton(false);
    }
  }, [isOpen, message]);

  const handleMinimize = () => {
    setIsMinimized(true);
    setShowMinimizedButton(true);
    // Don't call onDismiss when minimizing - keep the drawer "active" but hidden
  };

  const handleDismiss = () => {
    setIsMinimized(true);
    setShowMinimizedButton(true);
    // Don't call onDismiss for persistent drawers - just minimize
    if (!isPersistent && onDismiss) {
      onDismiss();
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed top-0 left-0 right-0 z-40 pointer-events-auto"
          >
            <div className="bg-gradient-to-b from-gray-900 via-gray-900/98 to-gray-900/95 backdrop-blur-xl border-b-2 border-yellow-500/30 shadow-2xl">
              {/* Drag Handle */}
              <div className="flex justify-center py-2 cursor-pointer" onClick={handleMinimize}>
                <div className="w-16 h-1.5 bg-yellow-500/50 rounded-full hover:bg-yellow-500/70 transition-colors" />
              </div>

              {/* Content Container */}
              <div className="px-4 sm:px-6 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400" />
                    </motion.div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white">
                        {playerName === 'Cards Drawn' ? 'You Picked Up' :
                         isCurrentPlayer ? 'Your Turn' :
                         playerName ? `${playerName}'s Turn` : 'Action in Progress'}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-300 mt-1 leading-relaxed">
                        {getFriendlyMessage()}
                      </p>
                    </div>
                  </div>

                  {/* Close button - only show if not processing */}
                  {!isProcessing && (
                    <button
                      onClick={handleDismiss}
                      className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400 hover:text-white" />
                    </button>
                  )}
                </div>

                {/* Display Important Cards - Show key cards from the action prominently */}
                {actionDetails && actionDetails.length > 0 && (
                  <div className="mb-4">
                    {(() => {
                      // Collect important cards to display (played cards and affected queens)
                      const importantCards = actionDetails
                        .filter(d => d.cards && d.cards.length > 0 &&
                                (d.action === 'Played King' ||
                                 d.action === 'Woke Queen' ||
                                 d.action === 'Played Knight' ||
                                 d.action === 'Stole Queen' ||
                                 d.action === 'Played Jester' ||
                                 d.action === 'Played Potion' ||
                                 d.action === 'Put Queen to sleep' ||
                                 d.action === 'Revealed card'))
                        .flatMap(d => d.cards || []);

                      if (importantCards.length > 0) {
                        return (
                          <div className="flex justify-center gap-4 flex-wrap">
                            {importantCards.map((card, idx) => (
                              <motion.div
                                key={`${card.id}-${idx}`}
                                initial={{ opacity: 0, y: 20, scale: 0.8, rotateY: 180 }}
                                animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                                transition={{
                                  delay: idx * 0.15,
                                  type: "spring",
                                  stiffness: 200
                                }}
                                className="transform-gpu"
                              >
                                <CardComponent
                                  card={card}
                                  size="md"
                                  interactive={false}
                                  className="shadow-2xl hover:shadow-3xl transition-shadow"
                                />
                              </motion.div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                {/* Cards Display - Visual cards using the same CardComponent as the game */}
                {/* Show cards unless they would be duplicated in actionDetails important cards section */}
                {cards.length > 0 && (() => {
                  // Always show for current player (private replacement cards)
                  if (isCurrentPlayer) return true;

                  // Show if no actionDetails
                  if (!actionDetails || actionDetails.length === 0) return true;

                  // Don't show if actionDetails already displays important cards that would duplicate these
                  const hasImportantCardsInActionDetails = actionDetails.some(d =>
                    d.cards && d.cards.length > 0 &&
                    (d.action === 'Played King' ||
                     d.action === 'Woke Queen' ||
                     d.action === 'Played Knight' ||
                     d.action === 'Stole Queen' ||
                     d.action === 'Played Jester' ||
                     d.action === 'Played Potion' ||
                     d.action === 'Put Queen to sleep' ||
                     d.action === 'Revealed card')
                  );

                  // Show cards if actionDetails doesn't have important cards to display
                  return !hasImportantCardsInActionDetails;
                })() && (
                  <div className="mb-6">
                    {/* Add label for cards */}
                    <p className="text-center text-sm text-gray-400 mb-3">
                      {isCurrentPlayer
                        ? (cards.length === 1 ? 'You picked up:' : `You picked up ${cards.length} cards:`)
                        : (cards.length === 1 ? 'Card played:' : `Cards played:`)
                      }
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-2 justify-center">
                      {cards.map((card, index) => (
                        <motion.div
                          key={`${card.id}-${index}`}
                          initial={{ opacity: 0, y: 20, scale: 0.8, rotateY: 180 }}
                          animate={{ opacity: 1, y: 0, scale: 1, rotateY: 0 }}
                          transition={{
                            delay: index * 0.15,
                            type: "spring",
                            stiffness: 200
                          }}
                          className="drawer-card-wrapper"
                        >
                          <CardComponent
                            card={card}
                            size="md"
                            interactive={false}
                            className="shadow-lg"
                          />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Status */}
                {cards.length === 0 && !isProcessing ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 justify-center text-green-400 text-base sm:text-lg"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="font-semibold">Action completed!</span>
                  </motion.div>
                ) : isProcessing ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 justify-center text-yellow-400 text-base sm:text-lg"
                  >
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span>Processing action...</span>
                  </motion.div>
                ) : null}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized Tab - Show when minimized button should be visible */}
      <AnimatePresence>
        {showMinimizedButton && (
          <motion.button
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            onClick={() => {
              setIsMinimized(false);
              setShowMinimizedButton(false);
            }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40
                       bg-gradient-to-r from-yellow-500 to-orange-500 text-white
                       px-4 py-2 rounded-full shadow-lg hover:shadow-xl
                       transition-all hover:scale-105 flex items-center gap-2
                       pointer-events-auto"
          >
            <ChevronDown className="w-4 h-4" />
            <span className="font-medium text-sm">Show Info</span>
            {cards.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {cards.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};