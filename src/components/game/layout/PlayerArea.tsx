import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Users, Trophy, UserCheck, Clock, Wifi, WifiOff } from 'lucide-react';
import { useGameState } from '../../../lib/context/GameStateContextNew';
import { useAuth } from '../../../lib/hooks/useAuth';
import { Player } from '../../../game/types';

interface PlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isCurrentUser: boolean;
  isHost: boolean;
  position: number;
}

function PlayerCard({ player, isCurrentPlayer, isCurrentUser, isHost, position }: PlayerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: position * 0.1 }}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-300
        ${isCurrentPlayer 
          ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/20' 
          : 'border-white/20 bg-white/5'
        }
        ${isCurrentUser ? 'ring-2 ring-blue-400' : ''}
      `}
    >
      {/* Player Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          {isHost && (
            <Crown className="h-4 w-4 text-yellow-400" />
          )}
          <span className={`font-medium ${isCurrentPlayer ? 'text-yellow-200' : 'text-white'}`}>
            {player.name}
          </span>
          {isCurrentUser && (
            <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
              You
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {player.isConnected ? (
            <UserCheck className="h-4 w-4 text-green-400" />
          ) : (
            <Clock className="h-4 w-4 text-yellow-400" />
          )}
        </div>
      </div>

      {/* Player Stats */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Score:</span>
          <span className="font-bold text-white">{player.score}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Queens:</span>
          <span className="font-bold text-purple-300">{player.queens?.length || 0}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Cards:</span>
          <span className="font-bold text-blue-300">{player.hand?.length || 0}</span>
        </div>
      </div>

      {/* Queens Display */}
      {player.queens && player.queens.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-gray-300 mb-2">Queens:</div>
          <div className="flex flex-wrap gap-1">
            {player.queens.map((queen, index) => (
              <div
                key={queen.id || index}
                className="w-6 h-8 bg-purple-500/20 border border-purple-400/30 rounded text-xs flex items-center justify-center text-purple-200"
                title={queen.name}
              >
                👑
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Player Indicator */}
      {isCurrentPlayer && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"
        >
          <div className="w-3 h-3 bg-yellow-600 rounded-full animate-pulse"></div>
        </motion.div>
      )}
    </motion.div>
  );
}

export function PlayerArea() {
  const { state, gameState, currentPlayer } = useGameState();
  const { user } = useAuth();

  if (!gameState || !user) {
    return (
      <div className="glass-effect rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-white/5 rounded"></div>
            <div className="h-16 bg-white/5 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-lg p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Players
        </h2>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          {state.connectionStatus === 'connected' ? (
            <Wifi className="h-4 w-4 text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-400" />
          )}
          <span className="text-xs text-gray-300">
            {state.connectionStatus}
          </span>
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {gameState.players.map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            isCurrentPlayer={currentPlayer?.id === player.id}
            isCurrentUser={player.id === user.id}
            isHost={index === 0}
            position={index}
          />
        ))}
      </div>

      {/* Game Progress */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="text-sm text-gray-300">
          <div className="flex justify-between items-center mb-2">
            <span>Turn:</span>
            <span className="text-white font-medium">
              {gameState.currentPlayerIndex + 1} / {gameState.players.length}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Phase:</span>
            <span className="text-white font-medium capitalize">
              {gameState.phase}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}