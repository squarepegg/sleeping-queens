import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/domain/models/Card';
import { LastAction } from '@/domain/models/GameState';
import { CardComponent } from './CardComponent';

interface PlayedCardsPopoverProps {
  stagedCards?: Card[];
  jesterRevealedCard?: Card;
  lastAction?: LastAction;
  currentPlayerId?: string;
  onDismiss?: () => void;
  autoDismissMs?: number;
}

export const PlayedCardsPopover: React.FC<PlayedCardsPopoverProps> = ({
  stagedCards = [],
  jesterRevealedCard,
  lastAction,
  currentPlayerId,
  onDismiss,
  autoDismissMs = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);
  const [lastActionTimestamp, setLastActionTimestamp] = useState<number>(0);

  // Show popover when cards are present or there's a new action
  useEffect(() => {
    // Check if we have a new action to show
    const hasNewAction = lastAction && (!lastActionTimestamp || lastAction.timestamp > lastActionTimestamp);
    const hasContent = stagedCards.length > 0 || jesterRevealedCard || hasNewAction;

    console.log('[PlayedCardsPopover] Effect triggered:', {
      hasNewAction,
      hasContent,
      lastAction,
      lastActionTimestamp,
      isVisible
    });

    // Only show if we have content
    if (hasContent) {
      setIsVisible(true);

      // Track last action timestamp to avoid re-showing same action
      if (lastAction && lastAction.timestamp !== lastActionTimestamp) {
        setLastActionTimestamp(lastAction.timestamp);
      }

      if (jesterRevealedCard && !hasBeenShown) {
        setHasBeenShown(true);
      }

      // Check if this is a staging action that's waiting for selection
      const isWaitingForSelection = lastAction?.message?.includes('selecting');

      // Auto dismiss after timeout (but not if waiting for selection)
      if (autoDismissMs > 0 && !isWaitingForSelection && !stagedCards.length) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          onDismiss?.();
        }, autoDismissMs);

        return () => clearTimeout(timer);
      }
    } else if (!hasContent) {
      setIsVisible(false);
      if (!jesterRevealedCard) {
        setHasBeenShown(false);
      }
    }
  }, [stagedCards, jesterRevealedCard, lastAction, autoDismissMs, onDismiss, hasBeenShown]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 shadow-2xl border border-gray-700">
            {/* Last Action Section - Show what any player played (including staging) */}
            {lastAction && (
              <div className="mb-4">
                <div className="text-blue-400 text-sm font-semibold mb-2 text-center">
                  {lastAction.message}
                </div>
                {lastAction.cards && lastAction.cards.length > 0 && (
                  <div className="flex gap-2 justify-center">
                    {lastAction.cards.map((card) => (
                      <motion.div
                        key={card.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{ duration: 0.3 }}
                      >
                        <CardComponent
                          card={card}
                          size="md"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Jester Reveal Section */}
            {jesterRevealedCard && (
              <div className="mb-4">
                <div className="text-yellow-400 text-sm font-semibold mb-2 text-center">
                  Jester Revealed!
                </div>
                <div className="flex justify-center">
                  <CardComponent
                    card={jesterRevealedCard}
                    size="lg"
                    glowing={true}
                  />
                </div>
                <div className="text-gray-300 text-xs text-center mt-2">
                  {jesterRevealedCard.type === 'number'
                    ? `Number ${(jesterRevealedCard as { type: 'number'; value: number }).value} - Count to select player!`
                    : 'Action card - Play continues!'}
                </div>
              </div>
            )}

            {/* Staged Cards Section */}
            {stagedCards.length > 0 && (
              <div>
                {jesterRevealedCard && (
                  <div className="border-t border-gray-600 my-3" />
                )}
                <div className="text-gray-300 text-sm font-medium mb-2 text-center">
                  {stagedCards.some(c => c.type === 'king') ? 'Select a Sleeping Queen to Wake' :
                   stagedCards.some(c => c.type === 'knight') ? 'Select an Opponent\'s Queen to Steal' :
                   stagedCards.some(c => c.type === 'potion') ? 'Select an Opponent\'s Queen to Put to Sleep' :
                   stagedCards.length === 1 ? 'Playing Card' : 'Playing Cards'}
                </div>
                <div className="flex gap-2 justify-center">
                  {stagedCards.map((card) => (
                    <CardComponent
                      key={card.id}
                      card={card}
                      size="md"
                    />
                  ))}
                </div>
                {/* Show cancel button for action cards */}
                {stagedCards.some(c => ['king', 'knight', 'potion'].includes(c.type)) && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={onDismiss}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Timer indicator */}
            {autoDismissMs > 0 && (
              <div className="mt-3">
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: autoDismissMs / 1000, ease: 'linear' }}
                  />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};