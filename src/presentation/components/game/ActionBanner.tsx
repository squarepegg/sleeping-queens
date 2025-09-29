import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, X } from 'lucide-react';
import { Card } from '@/domain/models/Card';

export type ActionType = 'king' | 'jester' | 'rose_bonus' | 'dragon_blocked' | 'wand_blocked';

interface ActionBannerProps {
  actionType: ActionType;
  cards?: Card[];
  playerName?: string;
  attackerName?: string;
  queenName?: string;
  revealedValue?: number;
  isVisible: boolean;
  onCancel?: () => void;
  isOwnAction?: boolean; // Whether the current player initiated this action
}

/**
 * Reusable banner component for various game actions
 */
export const ActionBanner: React.FC<ActionBannerProps> = ({
  actionType,
  cards = [],
  playerName,
  attackerName,
  queenName,
  revealedValue,
  isVisible,
  onCancel,
  isOwnAction = false
}) => {
  if (!isVisible) return null;

  // Determine context-aware message and icon based on action type
  const getActionDisplay = (): { title: string; instruction: string; icon: string } => {
    switch (actionType) {
      case 'king':
        const kingCard = cards[0];
        const kingName = kingCard && 'name' in kingCard ? kingCard.name : 'King';
        return {
          title: kingName || 'King Ready',
          instruction: 'Click a sleeping queen above to wake her',
          icon: '👑'
        };

      case 'jester':
        if (revealedValue !== undefined) {
          const playerText = isOwnAction ? 'You' : playerName || 'A player';
          const verb = isOwnAction ? '' : 's'; // "You played" vs "Player plays"
          return {
            title: 'Lucky You!',
            instruction: `${playerText} played a Jester which revealed a ${revealedValue}! Select a queen to wake`,
            icon: '🎭'
          };
        }
        return {
          title: 'Jester Bonus!',
          instruction: 'Select a sleeping queen to wake',
          icon: '🎭'
        };

      case 'rose_bonus':
        return {
          title: 'Rose Queen Bonus!',
          instruction: 'You get an extra queen! Select one to wake',
          icon: '🌹'
        };

      case 'dragon_blocked':
        return {
          title: 'Knight Blocked!',
          instruction: attackerName && queenName
            ? `${attackerName}'s attempt to steal ${queenName} was blocked by your Dragon!`
            : 'Your Dragon successfully blocked the Knight attack!',
          icon: '🐉'
        };

      case 'wand_blocked':
        return {
          title: 'Potion Blocked!',
          instruction: attackerName && queenName
            ? `${attackerName}'s attempt to put ${queenName} to sleep was blocked by your Magic Wand!`
            : 'Your Magic Wand successfully blocked the Sleeping Potion!',
          icon: '🪄'
        };

      default:
        return {
          title: 'Action Required',
          instruction: 'Complete your action',
          icon: '🎴'
        };
    }
  };

  const { title, instruction, icon } = getActionDisplay();

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

            {/* Cards Display (if applicable) */}
            {cards.length > 0 && actionType === 'king' && (
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
            )}

            {/* Instruction with animated arrow */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 bg-blue-900/80 backdrop-blur-sm rounded-full px-6 py-3 border border-blue-400/30"
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span className="text-white font-medium">{instruction}</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <ArrowRight className="w-5 h-5 text-blue-300" />
              </motion.div>
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