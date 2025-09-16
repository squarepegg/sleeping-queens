import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronRight } from 'lucide-react';
import { Card } from '@/domain/models/Card';

interface StagingHelperProps {
  cards: Card[];
  isVisible: boolean;
  message?: string;
}

/**
 * Shows contextual help for the current player when staging cards.
 * Appears as a subtle floating helper that doesn't block game elements.
 */
export const StagingHelper: React.FC<StagingHelperProps> = ({
  cards,
  isVisible,
  message
}) => {
  if (!isVisible || cards.length === 0) return null;

  // Determine context-aware message based on staged cards
  const getHelperMessage = (): string => {
    if (message) return message;

    const cardTypes = cards.map(c => c.type);

    if (cardTypes.includes('king')) {
      return 'Click a sleeping queen to wake her';
    }
    if (cardTypes.includes('knight')) {
      return "Click an opponent's queen to steal her";
    }
    if (cardTypes.includes('potion')) {
      return "Click an opponent's queen to put her back to sleep";
    }
    if (cardTypes.includes('jester')) {
      return 'Revealing top card...';
    }
    if (cardTypes.every(c => c === 'number')) {
      if (cards.length === 2 &&
          'value' in cards[0] && 'value' in cards[1] &&
          cards[0].value === cards[1].value) {
        return 'Discarding pair...';
      }
      if (cards.length >= 3) {
        return 'Click a sleeping queen to wake with equation';
      }
      return 'Add more cards for equation or discard';
    }

    return 'Choose an action for your staged cards';
  };

  const primaryCard = cards[0];
  const additionalCount = cards.length - 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-blue-900/95 to-purple-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-blue-500/30 p-4 min-w-[320px]">
            {/* Staged cards preview */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex -space-x-2">
                {cards.slice(0, 3).map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative"
                    style={{ zIndex: cards.length - index }}
                  >
                    <div className="w-12 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg border-2 border-gray-600 shadow-lg flex items-center justify-center">
                      <div className="text-xs text-white font-bold">
                        {card.type === 'number' && 'value' in card ? card.value : card.type[0].toUpperCase()}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {cards.length > 3 && (
                  <div className="w-12 h-16 bg-gray-800/80 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                    <span className="text-xs text-gray-400">+{cards.length - 3}</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="text-sm font-medium text-blue-200">
                  {cards.length} {cards.length === 1 ? 'card' : 'cards'} staged
                </div>
                <div className="text-xs text-gray-400">
                  {cards.map(c => c.type).join(', ')}
                </div>
              </div>
            </div>

            {/* Helper message */}
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-100 leading-relaxed">
                {getHelperMessage()}
              </div>
            </div>

            {/* Visual indicator arrow pointing down to hand */}
            <motion.div
              animate={{ y: [0, 3, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2"
            >
              <div className="w-6 h-6 bg-gradient-to-r from-blue-900 to-purple-900 rotate-45 border-b border-r border-blue-500/30" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};