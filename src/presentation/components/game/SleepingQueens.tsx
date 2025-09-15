import {useCallback, useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import clsx from 'clsx';
import {Queen} from '../../../domain/models/Card';
import {CardComponent} from './CardComponent';
import {Crown, Plus, Zap} from 'lucide-react';

export interface SleepingQueensProps {
  sleepingQueens: Queen[];
  selectedQueen: Queen | null;
  onQueenSelect: (queen: Queen | null) => void;
  canSelectQueen: boolean;
  actionType?: 'king' | 'knight' | 'potion' | 'wand';
  highlightQueens?: Queen[];
  discardPile?: any[];
  drawPile?: any[];
  isDraggingCard?: boolean;
  className?: string;
  initialQueensLayout?: (Queen | null)[];
}

export function SleepingQueens({
  sleepingQueens,
  selectedQueen,
  onQueenSelect,
  canSelectQueen,
  actionType,
  highlightQueens = [],
  discardPile = [],
  drawPile = [],
  isDraggingCard = false,
  className,
  initialQueensLayout,
}: SleepingQueensProps) {
  const [hoveredQueen, setHoveredQueen] = useState<Queen | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('[SleepingQueens] Received props:', {
      sleepingQueensCount: sleepingQueens.length,
      sleepingQueens: sleepingQueens.map(q => q.name),
      initialQueensLayoutCount: initialQueensLayout?.length,
      initialQueensLayout: initialQueensLayout?.map(q => q?.name || 'null')
    });
  }, [sleepingQueens, initialQueensLayout]);

  // Create fixed layout grid that maintains positions (including empty spaces)
  const queenBlocks = useMemo(() => {
    // Use the layout with fixed positions if provided, otherwise create from current queens
    let layoutToUse: (Queen | null)[];
    
    if (initialQueensLayout) {
      // Update the initial layout to reflect current sleeping queens
      layoutToUse = initialQueensLayout.map(initialQueen => {
        if (!initialQueen) return null;
        // Check if this queen is still sleeping
        return sleepingQueens.find(q => q.id === initialQueen.id) || null;
      });
    } else {
      // Fallback: create layout from current queens (for backward compatibility)
      layoutToUse = [...sleepingQueens];
    }
    
    const blocks: { left: (Queen | null)[], right: (Queen | null)[] }[] = [];
    for (let i = 0; i < layoutToUse.length; i += 12) {
      const block = layoutToUse.slice(i, i + 12);
      const left = block.slice(0, 6);
      const right = block.slice(6, 12);
      
      // Ensure we have full 6-slot arrays (pad with nulls if needed)
      while (left.length < 6) left.push(null);
      while (right.length < 6) right.push(null);
      
      blocks.push({ left, right });
    }
    return blocks;
  }, [sleepingQueens, initialQueensLayout]);


  const handleQueenClick = useCallback((queen: Queen) => {
    if (!canSelectQueen) return;
    
    const isAlreadySelected = selectedQueen?.id === queen.id;
    onQueenSelect(isAlreadySelected ? null : queen);
  }, [canSelectQueen, selectedQueen, onQueenSelect]);

  const handleQueenHover = useCallback((queen: Queen | null) => {
    setHoveredQueen(queen);
  }, []);

  const getSelectionText = useCallback(() => {
    if (selectedQueen) {
      switch (actionType) {
        case 'king':
          return 'Queen selected! Play your King to wake her up.';
        case 'knight':
          return 'Queen selected! Knight will steal this queen.';
        case 'potion':
          return 'Queen selected! Potion will put this queen to sleep.';
        case 'wand':
          return 'Queen selected! Magic Wand will put this queen to sleep.';
        default:
          return 'Queen selected! Play your card to continue.';
      }
    }

    switch (actionType) {
      case 'king':
        return 'Select any sleeping queen - you won\'t know which one until awakened!';
      case 'knight':
      case 'potion':
      case 'wand':
        return null; // No text needed - other messages are sufficient
      default:
        return 'Select a queen to continue';
    }
  }, [selectedQueen, actionType]);

  const getHelpText = useCallback(() => {
    switch (actionType) {
      case 'king':
        return 'Choose wisely - all queens are hidden until awakened!';
      case 'knight':
      case 'potion':
      case 'wand':
        return null; // No help text needed - the staged card message is sufficient
      default:
        return 'Choose your target carefully!';
    }
  }, [actionType]);

  const isQueenHighlighted = useCallback((queen: Queen) => {
    return highlightQueens.some(q => q.id === queen.id);
  }, [highlightQueens]);

  const isQueenSelected = useCallback((queen: Queen) => {
    return selectedQueen?.id === queen.id;
  }, [selectedQueen]);

  const renderQueenSlot = useCallback((queen: Queen | null, index: number) => {
    // Handle empty slot
    if (!queen) {
      return (
        <div key={`empty-${index}`} className="w-20 h-28 opacity-50">
          {/* Empty space placeholder - maintains layout */}
        </div>
      );
    }

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
        {/* Sleeping Queen Card */}
        <div
          onClick={() => handleQueenClick(queen)}
          onMouseEnter={() => handleQueenHover(queen)}
          onMouseLeave={() => handleQueenHover(null)}
          className={clsx(
            'w-20 h-28 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 border-2',
            {
              'border-blue-400 ring-4 ring-blue-400/50 scale-105': isSelected,
              'border-purple-400 ring-2 ring-purple-400/50': isHighlighted && !isSelected,
              'border-gray-400/50 hover:border-purple-400/75 hover:scale-105': canSelectQueen && !isSelected && !isHighlighted,
              'border-gray-600/50': !canSelectQueen && !isSelected && !isHighlighted,
              'shadow-xl shadow-purple-500/25': isHovered || isSelected,
            }
          )}
          style={{
            backgroundImage: 'url(/images/sleeping-queen.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Overlay for better visibility of selection states */}
          <div className={clsx(
            'absolute inset-0',
            {
              'bg-blue-500/20': isSelected,
              'bg-purple-500/20': isHighlighted && !isSelected,
              'bg-black/0 hover:bg-purple-500/10': canSelectQueen && !isSelected && !isHighlighted,
            }
          )} />

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
        </div>
      </motion.div>
    );
  }, [canSelectQueen, isQueenSelected, isQueenHighlighted, hoveredQueen, handleQueenClick, handleQueenHover]);

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

      {/* Selection Instructions */}
      {canSelectQueen && getSelectionText() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg"
        >
          <div className="flex items-center space-x-2 text-blue-300">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">
              {getSelectionText()}
            </span>
          </div>
        </motion.div>
      )}

      {/* Queens Display in Blocks */}
      <div className="space-y-8">
        {queenBlocks.map((block, blockIndex) => (
          <div key={blockIndex}>
            {/* Main Layout: Left Queens | Deck/Discard | Right Queens */}
            <div className="flex items-start justify-center gap-8">
              {/* Left Column (2 columns of 3 queens each) */}
              <div className="flex gap-4">
                {/* First column of left side */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {block.left.slice(0, 3).map((queen, index) => 
                      renderQueenSlot(queen, index)
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Second column of left side */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {block.left.slice(3, 6).map((queen, index) => 
                      renderQueenSlot(queen, index + 3)
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Center Area - Draw Pile and Discard Pile */}
              <div className="flex flex-col items-center gap-4">
                {/* Draw Pile */}
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Draw Pile</div>
                  <div
                    className="w-20 h-28 rounded-lg overflow-hidden border-2 border-gray-400/50 transition-all duration-300 hover:border-gray-300/75 hover:scale-105 cursor-pointer shadow-lg"
                    style={{
                      backgroundImage: 'url(/images/sleeping-queens-game.png)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  >
                  </div>
                </div>

                {/* Discard Pile - Drop Zone */}
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-2 font-medium">Discard Pile</div>
                  <div className="relative">
                    {discardPile.length > 0 ? (
                      <div className="relative rounded-lg transition-all">
                        {/* Show the top discarded card */}
                        <CardComponent
                          card={discardPile[discardPile.length - 1]}
                          size="md"
                          faceDown={false}
                          interactive={false}
                          className="border-2 border-gray-400/50 shadow-lg"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-gray-500/50 text-gray-500 flex flex-col items-center justify-center">
                        <Plus className="h-8 w-8 mb-1" />
                        <span className="text-xs">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column (2 columns of 3 queens each) */}
              <div className="flex gap-4">
                {/* First column of right side */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {block.right.slice(0, 3).map((queen, index) => 
                      renderQueenSlot(queen, index + 6)
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Second column of right side */}
                <div className="flex flex-col gap-3">
                  <AnimatePresence>
                    {block.right.slice(3, 6).map((queen, index) => 
                      renderQueenSlot(queen, index + 9)
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Separator between blocks (if more blocks follow) */}
            {blockIndex < queenBlocks.length - 1 && (
              <div className="flex justify-center py-6 mt-8">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-400/30 to-transparent"></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state for specific scenarios */}
      {sleepingQueens.length > 0 && canSelectQueen && !selectedQueen && getHelpText() && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-400 text-sm">
            {getHelpText()}
          </p>
        </motion.div>
      )}
    </div>
  );
}