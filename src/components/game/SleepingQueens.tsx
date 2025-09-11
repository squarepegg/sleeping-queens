import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Queen } from '../../game/types';
import { CardComponent } from './CardComponent';
import { Button } from '../ui/Button';
import { 
  Crown,
  Sparkles,
  Eye,
  EyeOff,
  Zap,
  Star
} from 'lucide-react';

export interface SleepingQueensProps {
  sleepingQueens: Queen[];
  selectedQueen: Queen | null;
  onQueenSelect: (queen: Queen | null) => void;
  canSelectQueen: boolean;
  highlightQueens?: Queen[];
  className?: string;
}

export function SleepingQueens({
  sleepingQueens,
  selectedQueen,
  onQueenSelect,
  canSelectQueen,
  highlightQueens = [],
  className,
}: SleepingQueensProps) {
  const [showDetails, setShowDetails] = useState(false); // Disabled for game fairness
  const [hoveredQueen, setHoveredQueen] = useState<Queen | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sort queens by points value for better display
  const sortedQueens = useMemo(() => {
    return [...sleepingQueens].sort((a, b) => (b.points || 0) - (a.points || 0));
  }, [sleepingQueens]);

  // Group queens by point value for organized display
  const groupedQueens = useMemo(() => {
    const groups: { [key: number]: Queen[] } = {};
    sortedQueens.forEach(queen => {
      const points = queen.points || 0;
      if (!groups[points]) {
        groups[points] = [];
      }
      groups[points].push(queen);
    });
    return groups;
  }, [sortedQueens]);

  const totalPoints = useMemo(() => {
    return sleepingQueens.reduce((sum, queen) => sum + (queen.points || 0), 0);
  }, [sleepingQueens]);

  const handleQueenClick = useCallback((queen: Queen) => {
    if (!canSelectQueen) return;
    
    const isAlreadySelected = selectedQueen?.id === queen.id;
    onQueenSelect(isAlreadySelected ? null : queen);
  }, [canSelectQueen, selectedQueen, onQueenSelect]);

  const handleQueenHover = useCallback((queen: Queen | null) => {
    setHoveredQueen(queen);
  }, []);

  const isQueenHighlighted = useCallback((queen: Queen) => {
    return highlightQueens.some(q => q.id === queen.id);
  }, [highlightQueens]);

  const isQueenSelected = useCallback((queen: Queen) => {
    return selectedQueen?.id === queen.id;
  }, [selectedQueen]);

  if (sleepingQueens.length === 0) {
    return (
      <div className={clsx('text-center py-8', className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-500/20 rounded-full mb-4">
          <Crown className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-400">All queens have been awakened!</p>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-purple-500/20 border border-purple-400/50 rounded-lg">
            <Sparkles className="h-5 w-5 text-purple-300" />
            <span className="font-semibold text-purple-200">Sleeping Queens</span>
            <span className="text-sm text-purple-300 opacity-75">
              ({sleepingQueens.length} sleeping)
            </span>
          </div>
          
          <div className="flex items-center space-x-2 px-3 py-2 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
            <Star className="h-4 w-4 text-yellow-300" />
            <span className="text-sm font-medium text-yellow-200">
              {totalPoints} points available
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Zap className="h-4 w-4" />
          <span>Face Down</span>
        </div>
      </div>

      {/* Selection Instructions */}
      {canSelectQueen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg"
        >
          <div className="flex items-center space-x-2 text-blue-300">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">
              {selectedQueen ? 'Queen selected! Play your King to wake her up.' : 'Select any sleeping queen - you won\'t know which one until awakened!'}
            </span>
          </div>
        </motion.div>
      )}

      {/* Queens Display */}
      <div className="space-y-6">
        {Object.entries(groupedQueens).map(([pointsStr, queens]) => {
          const points = parseInt(pointsStr);
          
          return (
            <div key={points} className="space-y-3">
              {/* Point Group Header - Hidden for game fairness */}

              {/* Queens in this point group */}
              <div className="flex flex-wrap justify-center gap-3">
                <AnimatePresence>
                  {queens.map((queen, index) => {
                    const isSelected = isQueenSelected(queen);
                    const isHighlighted = isQueenHighlighted(queen);
                    const isHovered = hoveredQueen?.id === queen.id;

                    return (
                      <motion.div
                        key={queen.id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20 }}
                        transition={{ 
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 300,
                          damping: 25
                        }}
                        className="relative group"
                      >
<CardComponent
                          card={queen}
                          size="lg"
                          interactive={canSelectQueen}
                          selected={isSelected}
                          glowing={isHighlighted}
                          faceDown={!queen.isAwake}
                          onClick={handleQueenClick}
                          className={clsx(
                            'transition-all duration-300',
                            {
                              'ring-2 ring-purple-400 ring-opacity-75': isHighlighted,
                              'transform hover:scale-110': canSelectQueen && !isSelected,
                              'shadow-xl shadow-purple-500/25': isHovered || isSelected,
                            }
                          )}
                          onMouseEnter={() => handleQueenHover(queen)}
                          onMouseLeave={() => handleQueenHover(null)}
                        />

                        {/* Selection indicator */}
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center"
                          >
                            <Crown className="h-3 w-3 text-white" />
                          </motion.div>
                        )}

                        {/* Highlight pulse effect */}
                        {isHighlighted && (
                          <div className="absolute inset-0 bg-purple-400/20 rounded-lg animate-pulse pointer-events-none" />
                        )}

                        {/* Hover tooltip - Hidden for game fairness */}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for specific scenarios */}
      {sleepingQueens.length > 0 && canSelectQueen && !selectedQueen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-400 text-sm">
            Choose wisely - all queens are hidden until awakened!
          </p>
        </motion.div>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && showDetails && (
        <div className="mt-6 p-3 bg-gray-500/10 border border-gray-400/20 rounded-lg">
          <div className="text-xs text-gray-400 space-y-1">
            <div>Selected: {selectedQueen?.name || 'None'}</div>
            <div>Highlighted: {highlightQueens.length} queens</div>
            <div>Can Select: {canSelectQueen ? 'Yes' : 'No'}</div>
          </div>
        </div>
      )}
    </div>
  );
}