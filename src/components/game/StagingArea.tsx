import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Player } from '@/game/types';
import { Crown, Sword, Shield, Sparkles, Hash } from 'lucide-react';
import clsx from 'clsx';

interface StagingAreaProps {
  stagedCard?: {
    cards: Card[];
    playerId: string;
    action: string;
  };
  players: Player[];
  currentUserId?: string;
  className?: string;
}

/**
 * StagingArea Component
 * 
 * Displays staged cards that are waiting for further action.
 * Visible to all players to understand game flow.
 */
export function StagingArea({ stagedCard, players, currentUserId, className }: StagingAreaProps) {
  if (!stagedCard || stagedCard.cards.length === 0) {
    return (
      <div className={clsx('bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50 p-4', className)}>
        <div className="text-center text-gray-500 text-sm">
          No cards staged
        </div>
      </div>
    );
  }

  const stagingPlayer = players.find(p => p.id === stagedCard.playerId);
  const isCurrentUser = stagedCard.playerId === currentUserId;

  const getCardIcon = (card: Card) => {
    switch (card.type) {
      case 'king':
        return <Crown className="h-8 w-8 text-yellow-400" />;
      case 'knight':
        return <Sword className="h-8 w-8 text-red-400" />;
      case 'dragon':
        return <Shield className="h-8 w-8 text-green-400" />;
      case 'wand':
      case 'potion':
        return <Sparkles className="h-8 w-8 text-purple-400" />;
      case 'jester':
        return (
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
            J
          </div>
        );
      case 'number':
        return (
          <div className="w-8 h-8 bg-blue-600 rounded border border-blue-400 flex items-center justify-center text-white text-sm font-bold">
            {(card as any).value}
          </div>
        );
      default:
        return <Hash className="h-8 w-8 text-gray-400" />;
    }
  };

  const getActionMessage = () => {
    const action = stagedCard.action;
    const card = stagedCard.cards[0];
    
    if (isCurrentUser) {
      switch (action) {
        case 'play_knight':
          return "Knight ready! Select an opponent's queen to steal";
        case 'play_king':
          return "King ready! Select a sleeping queen to wake";
        case 'play_potion':
          return "Potion ready! Select an opponent's queen to put to sleep";
        case 'play_jester':
          return "Jester ready! Will reveal a card from the deck";
        default:
          return `Cards staged to ${action}`;
      }
    } else {
      return (
        <>
          <strong className="text-yellow-300">{stagingPlayer?.name}</strong> is preparing to{' '}
          <strong className="text-blue-300">{action}</strong>
        </>
      );
    }
  };

  return (
    <div className={clsx('bg-yellow-500/10 backdrop-blur-sm rounded-lg border-2 border-yellow-400/30 p-4', className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={stagedCard.cards.map(c => c.id).join('-')}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {/* Staged Cards Display */}
          <div className="flex justify-center items-center gap-3">
            {stagedCard.cards.map((card, index) => (
              <motion.div
                key={`${card.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="p-3 bg-red-500/20 rounded-lg border-2 border-red-400 shadow-lg">
                  {getCardIcon(card)}
                </div>
                {card.name && card.name !== card.type && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black/50 px-1 rounded">
                    {card.name}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Action Message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm font-medium text-yellow-200"
          >
            {getActionMessage()}
          </motion.p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}