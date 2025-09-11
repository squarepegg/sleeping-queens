import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { Card, Player, NumberCard, Queen } from '../../game/types';
import { CardComponent } from './CardComponent';
import { Button } from '../ui/Button';
import { findMathEquations, formatMathEquation } from '../../game/utils';
import { 
  Hand,
  Calculator,
  Trash2,
  Eye,
  EyeOff,
  RotateCcw,
  PlayCircle,
  Crown
} from 'lucide-react';

export interface PlayerHandProps {
  player: Player;
  isCurrentPlayer: boolean;
  isCurrentTurn: boolean;
  selectedCards: Card[];
  onCardSelect: (card: Card) => void;
  onPlayCards: (cards: Card[], action: string) => void;
  onDiscardCards: (cards: Card[]) => void;
  selectedQueen?: Queen | null;
  onQueenSelect?: (queen: Queen) => void;
  canSelectQueen?: boolean;
  className?: string;
}

export function PlayerHand({
  player,
  isCurrentPlayer,
  isCurrentTurn,
  selectedCards,
  onCardSelect,
  onPlayCards,
  onDiscardCards,
  selectedQueen,
  onQueenSelect,
  canSelectQueen = false,
  className,
}: PlayerHandProps) {
  const [isExpanded, setIsExpanded] = useState(isCurrentPlayer);
  const [mathMode, setMathMode] = useState(false);

  const hand = player.hand || [];
  const queens = player.queens || [];
  
  // Group cards by type for better organization
  const groupedCards = useMemo(() => {
    const groups: { [key: string]: Card[] } = {
      action: [],
      number: [],
    };
    
    hand.forEach(card => {
      if (card.type === 'number') {
        groups.number.push(card);
      } else {
        groups.action.push(card);
      }
    });
    
    // Sort numbers by value
    groups.number.sort((a, b) => (a.value || 0) - (b.value || 0));
    
    return groups;
  }, [hand]);

  // Find possible math equations
  const mathEquations = useMemo(() => {
    if (!mathMode) return [];
    const numberCards = selectedCards.filter(card => card.type === 'number') as NumberCard[];
    return findMathEquations(numberCards);
  }, [selectedCards, mathMode]);

  const canPlayMath = mathMode && mathEquations.length > 0 && selectedCards.length >= 3;
  const canDiscard = selectedCards.length > 0;

  const handleCardClick = useCallback((card: Card) => {
    if (!isCurrentPlayer) return;
    onCardSelect(card);
  }, [isCurrentPlayer, onCardSelect]);

  const handlePlayMath = useCallback(() => {
    if (!canPlayMath) return;
    const numberCards = selectedCards.filter(card => card.type === 'number');
    onPlayCards(numberCards, 'math');
    setMathMode(false);
  }, [canPlayMath, selectedCards, onPlayCards]);

  const handleDiscard = useCallback(() => {
    if (!canDiscard) return;
    onDiscardCards(selectedCards);
  }, [canDiscard, selectedCards, onDiscardCards]);


  const renderCard = useCallback((card: Card, index: number) => {
    const isSelected = selectedCards.some(c => c.id === card.id);
    const isActionCard = ['king', 'knight', 'dragon', 'wand', 'potion'].includes(card.type);
    
    return (
      <div
        key={card.id}
        className={clsx(
          'transition-all duration-200',
          {
            'hover:-translate-y-2': isCurrentPlayer,
            'cursor-pointer': isCurrentPlayer && isCurrentTurn,
          }
        )}
      >
        <CardComponent
          card={card}
          size="md"
          interactive={isCurrentPlayer}
          selected={isSelected}
          disabled={!isCurrentPlayer || !isCurrentTurn}
          onClick={handleCardClick}
          className={clsx({
            'ring-2 ring-blue-400': mathMode && card.type === 'number',
            'ring-2 ring-green-400': isActionCard && isCurrentPlayer && isCurrentTurn,
          })}
        />
      </div>
    );
  }, [selectedCards, isCurrentPlayer, isCurrentTurn, mathMode, handleCardClick]);

  if (!isCurrentPlayer && hand.length === 0) {
    return null;
  }

  return (
    <div className={clsx('relative', className)}>
        {/* Hand Controls - Only show expand/collapse button */}
        {isCurrentPlayer && hand.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Queens Display - Always visible to all players */}
        {queens.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-400/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-3">
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">
                Awakened Queens ({queens.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {queens.map((queen, index) => {
                const isSelected = selectedQueen?.id === queen.id;
                const isSelectable = canSelectQueen && !isCurrentPlayer; // Can only target other players' queens
                
                return (
                  <motion.div
                    key={queen.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative flex flex-col items-center"
                  >
                    <CardComponent
                      card={queen}
                      size="md"
                      faceDown={false}
                      glowing={isSelected}
                      interactive={isSelectable}
                      selected={isSelected}
                      onClick={isSelectable ? () => onQueenSelect?.(queen) : undefined}
                      className={clsx(
                        isSelectable && 'cursor-pointer hover:scale-105 transition-transform',
                        !isSelectable && 'cursor-default'
                      )}
                    />
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs px-1 rounded-full font-bold">
                      {queen.points}
                    </div>
                    {isSelectable && (
                      <div className="absolute inset-0 border-2 border-dashed border-red-400/50 rounded-lg pointer-events-none" />
                    )}
                    {/* Queen Name */}
                    <div className="mt-1 text-xs text-yellow-200 font-medium text-center max-w-[80px] truncate">
                      {queen.name}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hand Cards */}
        <AnimatePresence>
          {(isCurrentPlayer && isExpanded) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className={clsx(
                  'flex flex-wrap gap-2 p-4 rounded-lg border-2 border-dashed',
                  isCurrentPlayer 
                    ? 'border-blue-400/30 bg-blue-500/5'
                    : 'border-gray-400/30 bg-gray-500/5',
                  'min-h-[120px]'
                )}
              >
                    {/* Action Cards */}
                    {groupedCards.action.length > 0 && (
                      <div className="flex flex-wrap gap-2 mr-4">
                        <div className="w-full text-xs text-gray-400 mb-1">Action Cards</div>
                        {groupedCards.action.map((card, index) => 
                          renderCard(card, index)
                        )}
                      </div>
                    )}

                    {/* Number Cards */}
                    {groupedCards.number.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <div className="w-full text-xs text-gray-400 mb-1">Number Cards</div>
                        {groupedCards.number.map((card, index) => 
                          renderCard(card, groupedCards.action.length + index)
                        )}
                      </div>
                    )}

                    {hand.length === 0 && (
                      <div className="flex items-center justify-center w-full h-20 text-gray-500">
                        <span className="text-sm">No cards in hand</span>
                      </div>
                    )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hand Controls */}
        {isCurrentPlayer && isCurrentTurn && selectedCards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-lg border border-white/20"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white">
                {selectedCards.length} card{selectedCards.length !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedCards.forEach(card => onCardSelect(card))}
                className="text-gray-400 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Clear
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {/* Math Mode Toggle */}
              {selectedCards.some(card => card.type === 'number') && (
                <Button
                  variant={mathMode ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setMathMode(!mathMode)}
                  className="flex items-center space-x-2"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Math Mode</span>
                </Button>
              )}

              {/* Math Equation Display */}
              {mathMode && mathEquations.length > 0 && (
                <div className="flex-1 min-w-0 px-3 py-2 bg-green-500/20 border border-green-400/50 rounded-lg">
                  <div className="text-xs text-green-300 font-medium">
                    Valid Equation: {formatMathEquation(selectedCards as NumberCard[])}
                  </div>
                </div>
              )}

              {/* Play Math Button */}
              {mathMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePlayMath}
                  disabled={!canPlayMath}
                  className="flex items-center space-x-2"
                >
                  <PlayCircle className="h-4 w-4" />
                  <span>Play Equation</span>
                </Button>
              )}

              {/* Discard Button */}
              <Button
                variant="danger"
                size="sm"
                onClick={handleDiscard}
                disabled={!canDiscard}
                className="flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Discard</span>
              </Button>
            </div>

            {/* Math Mode Instructions */}
            {mathMode && (
              <div className="mt-3 p-2 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                <p className="text-xs text-blue-300">
                  Select 3+ number cards to create math equations (addition, subtraction, multiplication).
                  Example: 2 + 3 = 5 (select cards with values 2, 3, and 5)
                </p>
              </div>
            )}
          </motion.div>
        )}
    </div>
  );
}