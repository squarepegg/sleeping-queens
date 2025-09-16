import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, ChevronLeft } from 'lucide-react';
import { Player } from '@/domain/models/Player';
import { LastAction } from '@/domain/models/GameState';
import { useMoveHistory } from '@/presentation/hooks/useMoveHistory';

interface MoveHistorySidebarProps {
  gameId: string | undefined;
  players: Player[];
  lastAction?: LastAction;
}

export const MoveHistorySidebar: React.FC<MoveHistorySidebarProps> = ({ gameId, players, lastAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { moveHistory, isLoading } = useMoveHistory(gameId, players, lastAction);

  const getPlayerColor = (playerId: string): string => {
    const playerIndex = players.findIndex(p => p.id === playerId);
    const colors = ['text-blue-400', 'text-green-400', 'text-yellow-400', 'text-purple-400'];
    return colors[playerIndex % colors.length];
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        className="fixed right-4 top-1/2 -translate-y-1/2 z-40 bg-gray-800/90 backdrop-blur-sm p-3 rounded-l-lg shadow-lg hover:bg-gray-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        ) : (
          <History className="w-5 h-5 text-gray-300" />
        )}
      </motion.button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40 lg:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="fixed right-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 border-l border-gray-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-400" />
                  <h2 className="text-lg font-semibold text-gray-100">Move History</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-800 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Move List */}
              <div className="overflow-y-auto h-[calc(100%-4rem)] p-4">
                {isLoading ? (
                  <div className="text-center text-gray-500 mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-3"></div>
                    <p className="text-sm">Loading move history...</p>
                  </div>
                ) : moveHistory.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No moves yet</p>
                    <p className="text-xs mt-1">Moves will appear here as the game progresses</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {moveHistory.map((entry, index) => {
                      const player = players.find(p => p.id === entry.playerId);
                      const playerColor = getPlayerColor(entry.playerId);
                      // Create a more unique key to prevent duplicate rendering issues
                      const uniqueKey = `${entry.timestamp}-${entry.playerId}-${entry.message.substring(0, 20)}`;

                      return (
                        <motion.div
                          key={uniqueKey}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
                        >
                          {/* Player Name and Time */}
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-medium text-sm ${playerColor}`}>
                              {entry.playerName || player?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(entry.timestamp)}
                            </span>
                          </div>

                          {/* Move Description */}
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {entry.message}
                          </p>

                          {/* Move Number */}
                          {index === 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs text-green-400 font-medium">Latest</span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer with game info */}
              {gameId && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-800/50 border-t border-gray-700">
                  <div className="text-xs text-gray-500">
                    <p>Game ID: {gameId.slice(0, 8)}...</p>
                    <p>{players.length} players • {moveHistory.length} moves</p>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};