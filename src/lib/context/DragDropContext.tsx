import React, { createContext, useContext, useState, useCallback } from 'react';
import { Card } from '@/game/types';

interface DragDropState {
  draggedCard: Card | null;
  dragSource: string | null;
  validDropTargets: string[];
  isDragging: boolean;
}

interface DragDropContextValue extends DragDropState {
  startDrag: (card: Card, source: string) => void;
  endDrag: () => void;
  setValidDropTargets: (targets: string[]) => void;
  canDropOn: (target: string) => boolean;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export function DragDropProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DragDropState>({
    draggedCard: null,
    dragSource: null,
    validDropTargets: [],
    isDragging: false,
  });

  const startDrag = useCallback((card: Card, source: string) => {
    // Determine valid drop targets based on card type
    const targets: string[] = [];
    
    if (card.type === 'number') {
      targets.push('staging-area', 'discard');
    } else if (['king', 'knight', 'wand', 'potion'].includes(card.type)) {
      targets.push('staging-area', 'action-zone');
    } else if (card.type === 'dragon') {
      targets.push('defense-zone', 'discard');
    } else if (card.type === 'jester') {
      targets.push('staging-area');
    }

    setState({
      draggedCard: card,
      dragSource: source,
      validDropTargets: targets,
      isDragging: true,
    });
  }, []);

  const endDrag = useCallback(() => {
    setState({
      draggedCard: null,
      dragSource: null,
      validDropTargets: [],
      isDragging: false,
    });
  }, []);

  const setValidDropTargets = useCallback((targets: string[]) => {
    setState(prev => ({ ...prev, validDropTargets: targets }));
  }, []);

  const canDropOn = useCallback((target: string) => {
    return state.validDropTargets.includes(target);
  }, [state.validDropTargets]);

  return (
    <DragDropContext.Provider
      value={{
        ...state,
        startDrag,
        endDrag,
        setValidDropTargets,
        canDropOn,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within DragDropProvider');
  }
  return context;
}