import React from 'react';
import { motion } from 'framer-motion';
import { useGameState } from '../../../lib/context/GameStateContextNew';
import { useAuth } from '../../../lib/hooks/useAuth';

interface GameLayoutProps {
  playerArea: React.ReactNode;
  gameCenter: React.ReactNode;
  gameControls: React.ReactNode;
  gameStatus: React.ReactNode;
  modals?: React.ReactNode;
}

export function GameLayout({
  playerArea,
  gameCenter,
  gameControls,
  gameStatus,
  modals
}: GameLayoutProps) {
  const { gameState } = useGameState();
  const { user } = useAuth();

  if (!gameState || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl animate-pulse-slow delay-1000"></div>
      </div>

      {/* Main Game Container */}
      <div className="relative z-10 min-h-screen">
        {/* Header with Game Status */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="p-4 glass-effect border-b border-white/10"
        >
          <div className="max-w-7xl mx-auto">
            {gameStatus}
          </div>
        </motion.header>

        {/* Main Game Grid */}
        <motion.main
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="p-4 max-w-7xl mx-auto"
        >
          <div className="grid grid-cols-12 gap-4 min-h-[calc(100vh-120px)]">
            {/* Players Area - Left Sidebar */}
            <div className="col-span-12 lg:col-span-3 order-3 lg:order-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-full"
              >
                {playerArea}
              </motion.div>
            </div>

            {/* Main Game Center */}
            <div className="col-span-12 lg:col-span-6 order-1 lg:order-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="h-full flex flex-col"
              >
                {gameCenter}
              </motion.div>
            </div>

            {/* Game Controls - Right Sidebar */}
            <div className="col-span-12 lg:col-span-3 order-2 lg:order-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="h-full"
              >
                {gameControls}
              </motion.div>
            </div>
          </div>
        </motion.main>
      </div>

      {/* Modals and Overlays */}
      {modals}
    </div>
  );
}