import { useState, useCallback, useMemo } from 'react';
import { Card, NumberCard } from '@/game/types';
import { findMathEquations } from '@/game/utils';

interface UseCardSelectionResult {
  selectedCards: Card[];
  setSelectedCards: React.Dispatch<React.SetStateAction<Card[]>>;
  possibleActions: string[];
  canSelectQueenForKing: boolean;
  canSelectQueenForKnight: boolean;
  canSelectQueenForPotion: boolean;
  toggleCardSelection: (card: Card) => void;
  clearSelection: () => void;
}

/**
 * Custom hook to manage card selection state and possible actions.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function useCardSelection(isMyTurn: boolean): UseCardSelectionResult {
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);

  // Calculate possible actions based on selected cards
  const possibleActions = useMemo(() => {
    if (!selectedCards.length || !isMyTurn) return [];
    
    const actions: string[] = [];
    const hasKing = selectedCards.some(c => c.type === 'king');
    const hasKnight = selectedCards.some(c => c.type === 'knight');
    const hasPotion = selectedCards.some(c => c.type === 'potion');
    const numberCards = selectedCards.filter(c => c.type === 'number') as NumberCard[];
    const hasNumbers = numberCards.length;

    if (hasKing) {
      actions.push('play_king');
    }
    if (hasKnight) {
      actions.push('play_knight');
    }
    if (hasPotion) {
      actions.push('play_potion');
    }

    // Check for pairs (exactly 2 cards with same value) - treated as discard action
    if (hasNumbers === 2 && numberCards[0].value === numberCards[1].value) {
      actions.push('discard_pair');
    }

    // Check for math equations (3+ cards)
    if (hasNumbers >= 3) {
      const mathEquations = findMathEquations(numberCards);
      if (mathEquations.length > 0) {
        actions.push('play_math');
      }
    }

    return actions;
  }, [selectedCards, isMyTurn]);

  // Derived state for queen selection capabilities
  const canSelectQueenForKing = possibleActions.includes('play_king');
  const canSelectQueenForKnight = possibleActions.includes('play_knight');
  const canSelectQueenForPotion = possibleActions.includes('play_potion');

  // Toggle card selection
  const toggleCardSelection = useCallback((card: Card) => {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  }, []);

  // Clear all selected cards
  const clearSelection = useCallback(() => {
    setSelectedCards([]);
  }, []);

  return {
    selectedCards,
    setSelectedCards,
    possibleActions,
    canSelectQueenForKing,
    canSelectQueenForKnight,
    canSelectQueenForPotion,
    toggleCardSelection,
    clearSelection,
  };
}