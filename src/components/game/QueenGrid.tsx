import React from 'react';
import { Queen } from '@/game/types';
import { CardComponent } from './CardComponent';
import { useDroppable } from '@dnd-kit/core';
import clsx from 'clsx';
import { Crown, Moon, Star } from 'lucide-react';

interface QueenGridProps {
  queens: Queen[];
  selectedQueen?: Queen | null;
  onQueenSelect?: (queen: Queen) => void;
  canSelectQueen?: boolean;
  className?: string;
  title?: string;
}

export function QueenGrid({
  queens,
  selectedQueen,
  onQueenSelect,
  canSelectQueen = false,
  className,
  title = "Sleeping Queens"
}: QueenGridProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'queen-grid',
    disabled: !canSelectQueen,
  });

  return (
    <div 
      ref={setNodeRef}
      className={clsx(
        'queen-grid p-4 rounded-lg',
        'bg-gradient-to-br from-purple-900/30 to-pink-900/30',
        'border-2 border-purple-400/30',
        isOver && canSelectQueen && 'border-yellow-400 bg-yellow-500/10',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-center mb-3">
          <Crown className="h-5 w-5 text-yellow-400 mr-2" />
          <h3 className="text-lg font-semibold text-purple-200">{title}</h3>
          <Crown className="h-5 w-5 text-yellow-400 ml-2" />
        </div>
      )}

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {queens.map((queen) => (
          <QueenCard
            key={queen.id}
            queen={queen}
            isSelected={selectedQueen?.id === queen.id}
            onSelect={onQueenSelect}
            canSelect={canSelectQueen}
          />
        ))}
      </div>

      {queens.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Moon className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">All queens have been awakened!</p>
        </div>
      )}
    </div>
  );
}

interface QueenCardProps {
  queen: Queen;
  isSelected: boolean;
  onSelect?: (queen: Queen) => void;
  canSelect: boolean;
}

function QueenCard({ queen, isSelected, onSelect, canSelect }: QueenCardProps) {
  const handleClick = () => {
    if (canSelect && onSelect) {
      onSelect(queen);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'relative transition-all duration-200',
        canSelect && 'cursor-pointer hover:scale-105',
        isSelected && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-purple-900',
        !canSelect && 'cursor-not-allowed opacity-75'
      )}
    >
      {/* Points badge */}
      <div className="absolute -top-2 -right-2 z-10">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold text-white">{queen.points}</span>
        </div>
      </div>

      {/* Special queen indicator */}
      {queen.points >= 20 && (
        <div className="absolute -top-2 -left-2 z-10">
          <Star className="h-6 w-6 text-yellow-400 fill-yellow-400 animate-pulse" />
        </div>
      )}

      <CardComponent
        card={queen}
        size="sm"
        faceDown={!queen.isAwake}
        interactive={canSelect}
        glowing={isSelected}
        className={clsx(
          'transition-transform duration-200',
          canSelect && 'hover:shadow-xl'
        )}
      />

      {/* Queen name */}
      <div className="mt-1 text-center">
        <p className="text-xs text-purple-200 font-medium truncate">
          {queen.name}
        </p>
      </div>
    </div>
  );
}

// Awakened Queens Display
export function AwakenedQueens({
  queens,
  playerName,
  score,
  isCurrentPlayer = false,
  className,
}: {
  queens: Queen[];
  playerName: string;
  score: number;
  isCurrentPlayer?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'awakened-queens p-3 rounded-lg',
        'bg-gradient-to-br from-yellow-900/20 to-orange-900/20',
        'border-2 border-yellow-400/30',
        isCurrentPlayer && 'ring-2 ring-blue-400/50',
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <Crown className="h-4 w-4 text-yellow-400 mr-1" />
          <span className="text-sm font-medium text-yellow-300">
            {playerName}'s Queens
          </span>
        </div>
        <div className="flex items-center bg-yellow-500/20 px-2 py-1 rounded">
          <Star className="h-3 w-3 text-yellow-400 mr-1" />
          <span className="text-sm font-bold text-yellow-300">{score} pts</span>
        </div>
      </div>

      {queens.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {queens.map((queen) => (
            <div key={queen.id} className="relative">
              <div className="absolute -top-1 -right-1 z-10">
                <div className="bg-yellow-500 rounded-full w-5 h-5 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {queen.points}
                  </span>
                </div>
              </div>
              <CardComponent
                card={queen}
                size="sm"
                faceDown={false}
                interactive={false}
                className="w-12 h-16"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-2 text-gray-500 text-xs">
          No queens awakened yet
        </div>
      )}
    </div>
  );
}