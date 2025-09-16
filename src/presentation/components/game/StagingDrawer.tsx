import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, AlertCircle, Sparkles, Clock } from 'lucide-react';
import { Card } from '@/domain/models/Card';
// Card display will be handled inline

interface StagingDrawerProps {
  isOpen: boolean;
  cards: Card[];
  message: string;
  actionLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  timeRemaining?: number;
  playerName?: string;
  isProcessing?: boolean;
}

export const StagingDrawer: React.FC<StagingDrawerProps> = ({
  isOpen,
  cards,
  message,
  actionLabel = 'Confirm',
  onConfirm,
  onCancel,
  timeRemaining,
  playerName,
  isProcessing = false
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Drawer - No backdrop so game remains interactive */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 25,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed bottom-0 left-0 right-0 z-50"
          >
            <div className="bg-gradient-to-t from-gray-900 via-gray-900/98 to-gray-900/95 backdrop-blur-xl border-t border-gray-700/50 shadow-2xl">
              {/* Drag Handle */}
              <div className="flex justify-center py-2">
                <div className="w-12 h-1 bg-gray-600 rounded-full" />
              </div>

              {/* Content Container */}
              <div className="px-6 pb-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-5 h-5 text-yellow-400" />
                    </motion.div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        {playerName ? `${playerName}'s Turn` : 'Opponent\'s Turn'}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {message || 'Selecting cards to play...'}
                      </p>
                    </div>
                  </div>

                  {/* Timer */}
                  {timeRemaining !== undefined && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full"
                    >
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-blue-300">
                        {timeRemaining}s
                      </span>
                    </motion.div>
                  )}

                  {/* Close button */}
                  {onCancel && !isProcessing && (
                    <button
                      onClick={onCancel}
                      className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Cards Display */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {cards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex-shrink-0"
                      >
                        <div className="relative">
                          {/* Card glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 blur-xl rounded-lg" />

                          <div className="relative bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-white">{card.type}</div>
                              {'value' in card && (
                                <div className="text-lg text-gray-300 mt-1">{card.value}</div>
                              )}
                              {'name' in card && (
                                <div className="text-sm text-gray-400 mt-1">{card.name}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Info message - either waiting or completed */}
                {cards.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 justify-center text-green-400"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-medium">Action completed!</span>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 justify-center text-gray-400"
                  >
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span className="text-sm">Waiting for {playerName || 'opponent'} to complete their action...</span>
                  </motion.div>
                )}
              </div>

              {/* Bottom safe area for mobile */}
              <div className="h-safe-area-bottom" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};