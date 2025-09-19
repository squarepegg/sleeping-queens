import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayerDiceRollProps {
  isVisible: boolean;
  players: Array<{ id: string; name: string }>;
  selectedPlayerId: string;
  gameId?: string;
  onComplete?: () => void;
}

export const PlayerDiceRoll: React.FC<PlayerDiceRollProps> = ({
  isVisible,
  players,
  selectedPlayerId,
  gameId,
  onComplete
}) => {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(true);
  const [showResult, setShowResult] = useState(false);
  const [hasLoggedSelection, setHasLoggedSelection] = useState(false);

  // Sort players for consistency
  const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));
  const selectedIndex = sortedPlayers.findIndex(p => p.id === selectedPlayerId);
  const selectedPlayer = sortedPlayers[selectedIndex];

  useEffect(() => {
    if (!isVisible) return;

    // Cycle through players during selection
    const rollInterval = setInterval(() => {
      setCurrentPlayerIndex((prev) => (prev + 1) % sortedPlayers.length);
    }, 200);

    // Stop rolling after 3 seconds and show the selected player
    const stopRollingTimeout = setTimeout(() => {
      clearInterval(rollInterval);
      setCurrentPlayerIndex(selectedIndex);
      setIsRolling(false);
      setShowResult(true);

      // Log the first player selection to the API (only once)
      if (gameId && selectedPlayer && !hasLoggedSelection) {
        setHasLoggedSelection(true);
        fetch(`/api/games/${gameId}/log-first-player`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            firstPlayerId: selectedPlayer.id,
            playerName: selectedPlayer.name,
          }),
        })
        .then(response => {
          if (!response.ok) {
            console.error('Failed to log first player selection:', response.status);
          } else {
            console.log('Successfully logged first player selection');
          }
        })
        .catch(error => {
          console.error('Failed to log first player selection:', error);
        });
      }

      // Call onComplete after showing result
      setTimeout(() => {
        onComplete?.();
      }, 3000);
    }, 3000);

    return () => {
      clearInterval(rollInterval);
      clearTimeout(stopRollingTimeout);
    };
  }, [isVisible, onComplete, sortedPlayers.length, selectedIndex, selectedPlayer, gameId]);

  const currentPlayer = sortedPlayers[currentPlayerIndex];

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
                {isRolling ? (
                  <>
                    <div className="text-lg text-purple-300 mb-2">Who goes first?</div>
                    <div>The Sleepy Moon is Choosing...</div>
                  </>
                ) : (
                  'First Player Selected!'
                )}
              </motion.h2>

              {/* Moon Container */}
              <div className="flex justify-center mb-8">
                <div className="relative w-32 h-32">
                  {/* Sleeping Moon Face */}
                  <motion.div
                    animate={isRolling ? {
                      y: [0, -10, 0],
                      rotate: [-5, 5, -5],
                    } : {
                      y: 0,
                      rotate: 0,
                    }}
                    transition={isRolling ? {
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    } : {
                      duration: 0.3
                    }}
                    className="relative"
                  >
                    {/* Moon glow */}
                    <motion.div
                      animate={isRolling ? {
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                      } : {
                        scale: 1.3,
                        opacity: 0.6,
                      }}
                      transition={{
                        duration: 1,
                        repeat: isRolling ? Infinity : 0,
                        ease: 'easeInOut'
                      }}
                      className="absolute inset-0 bg-yellow-200 rounded-full blur-2xl"
                    />

                    {/* Moon face */}
                    <div className="relative text-8xl">
                      {isRolling ? '🌙' : '🌝'}
                    </div>

                    {/* Sleeping Z's when rolling */}
                    {isRolling && (
                      <>
                        <motion.span
                          className="absolute -top-2 -right-4 text-2xl"
                          animate={{
                            y: [-5, -15, -5],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: 0,
                          }}
                        >
                          💤
                        </motion.span>
                        <motion.span
                          className="absolute top-0 -right-8 text-lg"
                          animate={{
                            y: [-5, -12, -5],
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: 0.5,
                          }}
                        >
                          z
                        </motion.span>
                      </>
                    )}

                    {/* Stars around moon */}
                    {[...Array(3)].map((_, i) => (
                      <motion.span
                        key={i}
                        className="absolute text-2xl"
                        style={{
                          left: `${50 + 60 * Math.cos(i * Math.PI * 2 / 3)}%`,
                          top: `${50 + 60 * Math.sin(i * Math.PI * 2 / 3)}%`,
                        }}
                        animate={{
                          opacity: isRolling ? [0, 1, 0] : 1,
                          scale: isRolling ? [0.8, 1.2, 0.8] : 1,
                        }}
                        transition={{
                          duration: 1.5,
                          delay: i * 0.3,
                          repeat: isRolling ? Infinity : 0,
                        }}
                      >
                        ✨
                      </motion.span>
                    ))}
                  </motion.div>
                </div>
              </div>

              {/* Show all players during rolling */}
              {isRolling && (
                <div className="flex justify-center gap-3 mb-6">
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      animate={{
                        scale: index === currentPlayerIndex ? 1.2 : 0.9,
                        opacity: index === currentPlayerIndex ? 1 : 0.4,
                      }}
                      transition={{ duration: 0.1 }}
                      className={`
                        px-3 py-1 rounded-lg text-sm font-semibold
                        ${index === currentPlayerIndex 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-purple-900/50 text-purple-300'}
                      `}
                    >
                      {player.name}
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Result */}
              <AnimatePresence>
                {showResult && selectedPlayer && (
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
                      <div className="text-lg text-purple-300 mb-2">The sleepy moon has awakened!</div>
                      <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500">
                        {selectedPlayer.name}
                      </div>
                      <div className="text-2xl text-white mt-2">shall begin the quest! 🌙✨</div>
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