import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from 'lucide-react';

interface FirstPlayerAnimationProps {
  isVisible: boolean;
  playerName: string;
  onComplete?: () => void;
}

export const FirstPlayerAnimation: React.FC<FirstPlayerAnimationProps> = ({
  isVisible,
  playerName,
  onComplete
}) => {
  const [currentDice, setCurrentDice] = useState(1);
  const [isRolling, setIsRolling] = useState(true);
  const [showResult, setShowResult] = useState(false);

  const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const DiceIcon = diceIcons[currentDice - 1];

  useEffect(() => {
    if (!isVisible) return;

    // Animate dice rolling
    const rollInterval = setInterval(() => {
      setCurrentDice(Math.floor(Math.random() * 6) + 1);
    }, 100);

    // Stop rolling after 2 seconds
    const stopRollingTimeout = setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      setShowResult(true);

      // Call onComplete after showing result for a bit
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    }, 2000);

    return () => {
      clearInterval(rollInterval);
      clearTimeout(stopRollingTimeout);
    };
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative"
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 blur-3xl opacity-50 animate-pulse" />
            </div>

            <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 rounded-3xl p-12 shadow-2xl border border-purple-500/30">
              {/* Title */}
              <motion.h2
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-3xl font-bold text-white text-center mb-8"
              >
                {isRolling ? 'Rolling for First Player...' : 'First Player Selected!'}
              </motion.h2>

              {/* Dice Container */}
              <div className="flex justify-center mb-8">
                <motion.div
                  animate={isRolling ? {
                    rotate: [0, 360],
                    scale: [1, 1.2, 1],
                  } : {
                    rotate: 0,
                    scale: 1,
                  }}
                  transition={isRolling ? {
                    rotate: {
                      duration: 0.5,
                      repeat: Infinity,
                      ease: 'linear'
                    },
                    scale: {
                      duration: 0.3,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }
                  } : {
                    duration: 0.3
                  }}
                  className="relative"
                >
                  {/* Dice background circle */}
                  <motion.div
                    animate={isRolling ? {
                      scale: [1, 1.3, 1],
                      opacity: [0.3, 0.6, 0.3],
                    } : {
                      scale: 1,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: isRolling ? Infinity : 0,
                      ease: 'easeInOut'
                    }}
                    className="absolute inset-0 bg-white rounded-full blur-2xl"
                  />

                  {/* Dice icon */}
                  <DiceIcon
                    className={`w-32 h-32 ${isRolling ? 'text-white' : 'text-yellow-400'} relative z-10 transition-colors duration-300`}
                    strokeWidth={1.5}
                  />
                </motion.div>
              </div>

              {/* Result */}
              <AnimatePresence>
                {showResult && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      damping: 15,
                      stiffness: 200,
                      delay: 0.2
                    }}
                  >
                    <motion.div
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      className="text-center"
                    >
                      <div className="text-lg text-purple-300 mb-2">The dice have spoken!</div>
                      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                        {playerName}
                      </div>
                      <div className="text-xl text-white mt-2">goes first!</div>
                    </motion.div>

                    {/* Confetti-like particles */}
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full"
                        style={{
                          left: '50%',
                          top: '50%',
                        }}
                        initial={{ x: 0, y: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos((i / 12) * Math.PI * 2) * 150,
                          y: Math.sin((i / 12) * Math.PI * 2) * 150,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 1,
                          delay: 0.3 + (i * 0.05),
                          ease: 'easeOut'
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};