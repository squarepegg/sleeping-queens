import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Home } from 'lucide-react';
import { Player } from '@/domain/models/Player';
import { useRouter } from 'next/router';
import confetti from 'canvas-confetti';

interface GameOverOverlayProps {
  winner: Player | null;
  players: Player[];
  currentPlayerId: string;
  onBackToLobby?: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  winner,
  players,
  currentPlayerId,
  onBackToLobby
}) => {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const isWinner = winner?.id === currentPlayerId;

  useEffect(() => {
    if (!winner) return;

    // Show content after a short delay
    setTimeout(() => setShowContent(true), 500);

    // Trigger confetti for the winner AFTER the overlay has animated in
    if (isWinner) {
      // Delay confetti to start after the overlay animation completes
      const confettiDelay = setTimeout(() => {
        // Multiple confetti bursts
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = {
          startVelocity: 30,
          spread: 360,
          ticks: 60,
          zIndex: 100  // Higher z-index to appear above the overlay
        };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval: any = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);

          // Confetti from left
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#ff69b4', '#ba55d3', '#9370db', '#8a2be2', '#ffd700']
          });

          // Confetti from right
          confetti({
            ...defaults,
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#ff69b4', '#ba55d3', '#9370db', '#8a2be2', '#ffd700']
          });
        }, 250);

        // Clean up interval after duration
        setTimeout(() => clearInterval(interval), duration);
      }, 800); // Wait 800ms for overlay to fully animate in

      // Clean up timeout if component unmounts
      return () => clearTimeout(confettiDelay);
    }
  }, [winner, isWinner]);

  const handleBackToLobby = () => {
    if (onBackToLobby) {
      onBackToLobby();
    } else {
      router.push('/');
    }
  };

  if (!winner) return null;

  // Calculate final scores for display
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <AnimatePresence>
      {winner && (
        <>
          {/* Dark overlay to disable game interactions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={(e) => e.stopPropagation()}
            data-testid="game-over-overlay-backdrop"
          />

          {/* Game Over Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-br from-purple-900/95 via-indigo-900/95 to-pink-900/95 rounded-3xl p-8 shadow-2xl border-2 border-purple-500/50 max-w-2xl w-full mx-4 pointer-events-auto">

              {/* Crown Animation for Winner */}
              {isWinner && showContent && (
                <motion.div
                  initial={{ y: -100, opacity: 0, rotate: -180 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.3, damping: 10 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <Crown className="w-24 h-24 text-yellow-400 drop-shadow-lg" data-testid="crown-icon" />
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                    </motion.div>
                  </div>
                </motion.div>
              )}

              {/* Trophy for Losers */}
              {!isWinner && showContent && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.3 }}
                  className="flex justify-center mb-6"
                >
                  <Trophy className="w-20 h-20 text-gray-400" data-testid="trophy-icon" />
                </motion.div>
              )}

              {/* Main Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center mb-6"
              >
                {isWinner ? (
                  <>
                    <h1 className="text-5xl font-bold text-yellow-400 mb-2 animate-pulse">
                      You Won!
                    </h1>
                    <p className="text-2xl text-yellow-200">
                      Congratulations, Queen Collector!
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Game Over
                    </h1>
                    <p className="text-2xl text-purple-200">
                      {winner.name} Won!
                    </p>
                  </>
                )}
              </motion.div>

              {/* Queen Collection Display */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-6"
              >
                <h3 className="text-lg font-semibold text-purple-200 mb-3 text-center">
                  Final Queens Collection
                </h3>
                <div className="bg-black/30 rounded-xl p-4">
                  {winner.queens && winner.queens.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-3">
                      {winner.queens.map((queen, index) => (
                        <motion.div
                          key={queen.id}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                          className="bg-purple-600/50 px-3 py-1 rounded-lg text-white text-sm font-medium border border-purple-400/50"
                        >
                          {queen.name} ({queen.points}pts)
                        </motion.div>
                      ))}
                    </div>
                  )}
                  <p className="text-center text-yellow-300 font-bold text-xl">
                    Total: {winner.score} points with {winner.queens?.length || 0} queens!
                  </p>
                </div>
              </motion.div>

              {/* Final Scoreboard */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="mb-6"
              >
                <h3 className="text-lg font-semibold text-purple-200 mb-3 text-center">
                  Final Scores
                </h3>
                <div className="space-y-2">
                  {sortedPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        player.id === winner.id
                          ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 border border-yellow-400/50'
                          : 'bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-white/50">
                          #{index + 1}
                        </span>
                        <span className={`font-medium ${
                          player.id === winner.id ? 'text-yellow-300' : 'text-white'
                        }`}>
                          {player.name}
                          {player.id === currentPlayerId && ' (You)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-purple-200">
                          {player.queens?.length || 0} queens
                        </span>
                        <span className={`font-bold ${
                          player.id === winner.id ? 'text-yellow-300' : 'text-white'
                        }`}>
                          {player.score} pts
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Back to Lobby Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="flex justify-center"
              >
                <button
                  onClick={handleBackToLobby}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                  <Home className="w-5 h-5" />
                  Back to Lobby
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};