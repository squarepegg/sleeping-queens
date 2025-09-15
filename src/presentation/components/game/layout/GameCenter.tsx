import React, {useEffect, useState} from 'react';
import {motion} from 'framer-motion';
import {AlertCircle, Crown, Layers, MessageCircle} from 'lucide-react';
import {useGameState} from '@/lib/context/GameStateContext';
import {SleepingQueens} from '../SleepingQueens';
import {Card, Queen} from '@/domain/models/Card';

interface DiscardPileProps {
  discardPile: Card[];
}

function DiscardPile({ discardPile }: DiscardPileProps) {
  const topCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;
  
  return (
    <div className="glass-effect rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white flex items-center">
          <Layers className="h-4 w-4 mr-2" />
          Discard Pile ({discardPile.length})
        </h3>
      </div>
      
      <div className="flex justify-center">
        <div className="relative w-16 h-24">
          {/* Pile base */}
          <div className="absolute inset-0 bg-gray-700 border-2 border-gray-600 rounded-lg"></div>
          
          {/* Top card if available */}
          {topCard && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 border-2 border-purple-400 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg"
            >
              <div className="text-center">
                <div className="text-sm">
                  {topCard.type === 'number' ? topCard.value : topCard.type}
                </div>
                {topCard.name && topCard.name !== topCard.type && (
                  <div className="text-xs opacity-80">{topCard.name}</div>
                )}
              </div>
            </motion.div>
          )}
          
          {/* Empty pile indicator */}
          {!topCard && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
              Empty
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface GameMessageProps {
  message: string;
}

function GameMessage({ message }: GameMessageProps) {
  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="glass-effect rounded-lg p-3 border-l-4 border-blue-400"
    >
      <div className="flex items-start space-x-2">
        <MessageCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-100">{message}</p>
      </div>
    </motion.div>
  );
}

export function GameCenter() {
  const { gameState, lastError } = useGameState();
  const [initialQueensLayout, setInitialQueensLayout] = useState<(Queen | null)[]>([]);

  // Debug logging
  useEffect(() => {
    if (gameState?.sleepingQueens) {
      console.log('[GameCenter] Sleeping queens count:', gameState.sleepingQueens.length);
      console.log('[GameCenter] Sleeping queens:', gameState.sleepingQueens.map(q => q.name));
    }
  }, [gameState?.sleepingQueens]);

  // Capture the initial queens layout when the game starts
  // This ensures we maintain all 12 positions even as queens are awakened
  useEffect(() => {
    if (gameState?.sleepingQueens && initialQueensLayout.length === 0) {
      // On first load, if we have 12 queens, save them as the initial layout
      if (gameState.sleepingQueens.length === 12) {
        console.log('[GameCenter] Setting initial layout with 12 queens');
        setInitialQueensLayout([...gameState.sleepingQueens]);
      } else if (gameState.sleepingQueens.length > 0) {
        // If we don't have 12 queens initially (game already in progress),
        // we need to reconstruct the full 12-slot layout
        // This is a fallback - ideally the backend should provide the initial layout
        console.log('[GameCenter] Setting initial layout with', gameState.sleepingQueens.length, 'queens (filling to 12)');
        const layout: (Queen | null)[] = [];
        for (let i = 0; i < 12; i++) {
          layout.push(gameState.sleepingQueens[i] || null);
        }
        setInitialQueensLayout(layout);
      }
    }
  }, [gameState?.sleepingQueens]);

  if (!gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading game center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Error Display - using context lastError, not gameState */}
      {lastError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-3"
        >
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-300 text-sm">{lastError}</p>
          </div>
        </motion.div>
      )}

      {/* Main Game Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sleeping Queens - Takes up most space */}
        <div className="lg:col-span-2">
          <div className="glass-effect rounded-lg p-4 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Crown className="h-5 w-5 mr-2 text-yellow-400" />
                Sleeping Queens ({gameState.sleepingQueens.length})
              </h3>
            </div>
            
            <div className="h-full min-h-[300px]">
              <SleepingQueens
                sleepingQueens={gameState.sleepingQueens}
                selectedQueen={null}
                onQueenSelect={() => {}}
                canSelectQueen={false}
                initialQueensLayout={initialQueensLayout.length > 0 ? initialQueensLayout : undefined}
              />
            </div>
          </div>
        </div>

        {/* Side Panel with Discard Pile and Game Info */}
        <div className="space-y-4">
          {/* Discard Pile */}
          <DiscardPile discardPile={gameState.discardPile} />
          
          {/* Game Stats */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Game Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Cards in Deck:</span>
                <span className="text-white font-medium">
                  {gameState.deck?.length || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Queens Awake:</span>
                <span className="text-purple-300 font-medium">
                  {gameState.players.reduce((total, p) => total + (p.queens?.length || 0), 0)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Queens Sleeping:</span>
                <span className="text-yellow-300 font-medium">
                  {gameState.sleepingQueens.length}
                </span>
              </div>
            </div>
          </div>

          {/* Win Conditions */}
          <div className="glass-effect rounded-lg p-4">
            <h3 className="text-sm font-medium text-white mb-3">Win Conditions</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-300">Queens needed:</span>
                <span className="text-white font-medium">
                  {gameState.players.length <= 2 ? '5' : '4'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-300">Points needed:</span>
                <span className="text-white font-medium">
                  {gameState.players.length <= 2 ? '50' : '40'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}