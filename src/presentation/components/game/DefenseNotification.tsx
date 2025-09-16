import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, X } from 'lucide-react';

interface DefenseNotificationProps {
  isVisible: boolean;
  defenderName: string;
  attackerName: string;
  defenseType: 'dragon' | 'wand';
  targetQueenName?: string;
  onDismiss?: () => void;
}

/**
 * Shows a notification when a defense card is played to block an attack.
 */
export const DefenseNotification: React.FC<DefenseNotificationProps> = ({
  isVisible,
  defenderName,
  attackerName,
  defenseType,
  targetQueenName,
  onDismiss
}) => {
  const defenseDetails = {
    dragon: {
      title: '🐉 Dragon Defense!',
      icon: '🛡️',
      color: 'from-orange-600 to-red-600',
      borderColor: 'border-orange-400',
      message: `${defenderName} played a Dragon to block ${attackerName}'s Knight attack${targetQueenName ? ` on ${targetQueenName}` : ''}!`
    },
    wand: {
      title: '✨ Magic Wand Defense!',
      icon: '🪄',
      color: 'from-purple-600 to-blue-600',
      borderColor: 'border-purple-400',
      message: `${defenderName} played a Magic Wand to block ${attackerName}'s Sleeping Potion${targetQueenName ? ` on ${targetQueenName}` : ''}!`
    }
  };

  const details = defenseDetails[defenseType];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: 'spring', damping: 20 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className={`bg-gradient-to-br ${details.color} backdrop-blur-xl rounded-2xl shadow-2xl border-2 ${details.borderColor} p-6 min-w-[400px] max-w-[500px]`}>
            {/* Header with icon */}
            <div className="flex items-center justify-center mb-4">
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-5xl mr-3"
              >
                {details.icon}
              </motion.div>
              <h2 className="text-2xl font-bold text-white">
                {details.title}
              </h2>
            </div>

            {/* Shield animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <Shield className="w-16 h-16 text-white/80" />
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-20 h-20 bg-white/20 rounded-full blur-xl" />
                </motion.div>
              </div>
            </motion.div>

            {/* Message */}
            <p className="text-center text-white text-lg font-medium mb-4">
              {details.message}
            </p>

            {/* Sub-message */}
            <p className="text-center text-white/80 text-sm">
              The attack was successfully blocked!
            </p>

            {/* Dismiss button if provided */}
            {onDismiss && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={onDismiss}
                className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors pointer-events-auto"
              >
                <X className="w-4 h-4" />
                <span className="text-sm font-medium">Dismiss</span>
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};