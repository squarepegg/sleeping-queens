import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Card } from '@/domain/models/Card';

interface HandOverlayProps {
  cards: Card[];
  isVisible: boolean;
  onCancel?: () => void;
}

/**
 * Overlays the player's hand area when cards are staged.
 * Provides clear guidance without floating elements.
 */
export const HandOverlay: React.FC<HandOverlayProps> = ({
  cards,
  isVisible,
  onCancel
}) => {
  if (!isVisible || cards.length === 0) return null;

  // Determine context-aware message based on staged cards
  const getActionMessage = (): { title: string; instruction: string; icon?: string } => {
    const cardTypes = cards.map(c => c.type);

    if (cardTypes.includes('king')) {
      const kingCard = cards.find(c => c.type === 'king');
      const kingName = kingCard && 'name' in kingCard ? kingCard.name : 'King';
      return {
        title: kingName || 'King Ready',
        instruction: 'Click a sleeping queen above to wake her',
        icon: '👑'
      };
    }
    if (cardTypes.includes('knight')) {
      return {
        title: 'Knight Attack',
        instruction: "Click an opponent's queen to steal her",
        icon: '⚔️'
      };
    }
    if (cardTypes.includes('potion')) {
      return {
        title: 'Sleeping Potion',
        instruction: "Click an opponent's queen to put her to sleep",
        icon: '💤'
      };
    }
    if (cardTypes.includes('jester')) {
      return {
        title: 'Jester Card',
        instruction: 'Revealing the top card of the deck...',
        icon: '🃏'
      };
    }
    if (cardTypes.every(c => c === 'number')) {
      if (cards.length === 2 &&
          'value' in cards[0] && 'value' in cards[1] &&
          cards[0].value === cards[1].value) {
        return {
          title: 'Matching Pair',
          instruction: 'Discarding cards and drawing new ones...',
          icon: '🎯'
        };
      }
      if (cards.length >= 3) {
        return {
          title: 'Math Equation',
          instruction: 'Click a sleeping queen to wake with your equation',
          icon: '🔢'
        };
      }
      return {
        title: `${cards.length} Number Card${cards.length > 1 ? 's' : ''}`,
        instruction: 'Add more cards for equation or they will be discarded',
        icon: '🎲'
      };
    }

    return {
      title: 'Cards Staged',
      instruction: 'Complete your action',
      icon: '🎴'
    };
  };

  const { title, instruction, icon } = getActionMessage();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          {/* Semi-transparent overlay to dim the hand */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-transparent rounded-lg" />

          {/* Content panel that slides up */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ delay: 0.1 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            {/* Icon and Title */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center mb-4"
            >
              {icon && <div className="text-5xl mb-3">{icon}</div>}
              <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
            </motion.div>

            {/* Staged Cards Display */}
            <div className="flex items-center gap-2 mb-4">
              {cards.slice(0, 4).map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="relative"
                >
                  <div className="w-16 h-20 bg-gradient-to-br from-white/90 to-gray-200 rounded-lg border-2 border-gray-300 shadow-xl flex flex-col items-center justify-center">
                    <div className="text-sm font-bold text-gray-800">
                      {card.type === 'number' && 'value' in card ? (
                        <span className="text-2xl">{String(card.value)}</span>
                      ) : (
                        <span className="text-xs uppercase">{card.type}</span>
                      )}
                    </div>
                    {'name' in card && (
                      <div className="text-xs text-gray-600 mt-1 px-1 text-center">
                        {card.name}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
              {cards.length > 4 && (
                <div className="w-16 h-20 bg-gray-700/50 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                  <span className="text-white text-sm">+{cards.length - 4}</span>
                </div>
              )}
            </div>

            {/* Instruction with animated arrow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 bg-blue-900/80 backdrop-blur-sm rounded-full px-6 py-3 border border-blue-400/30"
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-white font-medium">{instruction}</span>
            </motion.div>

            {/* Cancel button if provided */}
            {onCancel && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onCancel}
                className="mt-4 pointer-events-auto flex items-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Cancel</span>
              </motion.button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};