import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X, Sparkles } from 'lucide-react';

interface DragonBlockModalProps {
  isOpen: boolean;
  attackerName: string;
  targetQueenName: string;
  onPlayDragon: () => Promise<void>;
  onAllowAttack: () => Promise<void>;
}

/**
 * Modal for dragon blocking knight attacks.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function DragonBlockModal({
  isOpen,
  attackerName,
  targetQueenName,
  onPlayDragon,
  onAllowAttack
}: DragonBlockModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-md"
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 blur-3xl opacity-30 animate-pulse" />
            </div>

            <div className="relative bg-gradient-to-br from-gray-900 via-purple-900/90 to-red-900/90 rounded-3xl p-8 shadow-2xl border border-red-500/30">
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 rounded-t-3xl" />

              {/* Dragon Icon */}
              <div className="flex justify-center mb-6">
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                    rotate: [-5, 5, -5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="text-6xl"
                >
                  🐉
                </motion.div>
              </div>

              {/* Title */}
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-2xl font-bold text-center mb-4"
              >
                <span className="text-red-400">Knight Attack!</span>
              </motion.h2>

              {/* Message */}
              <div className="space-y-3 mb-8">
                <p className="text-center text-white text-lg">
                  <span className="text-yellow-300 font-semibold">{attackerName}</span> is trying to steal your{' '}
                  <span className="text-purple-300 font-semibold">{targetQueenName}</span>!
                </p>
                <p className="text-center text-gray-300 text-sm">
                  Play a Dragon to defend your queen, or let the knight succeed.
                </p>
              </div>

              {/* Sparkles decoration */}
              <div className="absolute top-4 right-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                </motion.div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPlayDragon}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Shield className="w-5 h-5" />
                  <span>Play Dragon</span>
                  <span className="text-2xl">🐉</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onAllowAttack}
                  className="flex-1 px-6 py-3 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 font-semibold rounded-xl border border-gray-600 transition-all"
                >
                  Allow Attack
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}