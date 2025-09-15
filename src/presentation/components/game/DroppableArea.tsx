import React, {CSSProperties} from 'react';
import {useDroppable} from '@dnd-kit/core';
import clsx from 'clsx';

interface DroppableAreaProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  acceptTypes?: string[];
  disabled?: boolean;
  label?: string;
}

export function DroppableArea({
  id,
  children,
  className,
  acceptTypes = ['card'],
  disabled = false,
  label
}: DroppableAreaProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    disabled,
    data: {
      acceptTypes,
    },
  });

  // Check if the dragged item is compatible
  const canAccept = active?.data?.current?.type 
    ? acceptTypes.includes(active.data.current.type)
    : false;

  const isValidDrop = isOver && canAccept;

  const style: CSSProperties = {
    transition: 'all 200ms ease',
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'droppable-area relative',
        'border-2 border-dashed rounded-lg p-4',
        'transition-all duration-200',
        {
          'border-gray-300 bg-gray-50': !isOver && !disabled,
          'border-green-400 bg-green-50': isValidDrop,
          'border-red-400 bg-red-50': isOver && !canAccept,
          'border-gray-200 bg-gray-100 cursor-not-allowed': disabled,
        },
        className
      )}
      aria-label={label || `Drop zone ${id}`}
    >
      {label && (
        <div className="absolute -top-3 left-3 px-2 bg-white text-xs font-medium text-gray-600">
          {label}
        </div>
      )}
      
      {children}
      
      {isValidDrop && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}

// Specialized staging area that accepts multiple cards
export function StagingDropArea({
  id,
  cards,
  onCardsChange,
  maxCards = 5,
  className,
  disabled = false,
}: {
  id: string;
  cards: React.ReactNode[];
  onCardsChange?: (cards: any[]) => void;
  maxCards?: number;
  className?: string;
  disabled?: boolean;
}) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    disabled: disabled || cards.length >= maxCards,
    data: {
      acceptTypes: ['card'],
      currentCards: cards,
    },
  });

  const canAcceptMore = cards.length < maxCards;
  const isValidDrop = isOver && canAcceptMore;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'staging-area min-h-[140px]',
        'border-2 border-dashed rounded-lg p-4',
        'transition-all duration-200',
        {
          'border-blue-300 bg-blue-50': !isOver && canAcceptMore,
          'border-green-400 bg-green-50 scale-102': isValidDrop,
          'border-gray-200 bg-gray-50': !canAcceptMore,
        },
        className
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Staging Area ({cards.length}/{maxCards})
        </span>
        {cards.length === 0 && (
          <span className="text-xs text-gray-500">
            Drag cards here to play them
          </span>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {cards}
      </div>
      
      {isValidDrop && (
        <div className="mt-2 text-center">
          <span className="text-sm text-green-600 font-medium animate-pulse">
            Release to stage card
          </span>
        </div>
      )}
      
      {!canAcceptMore && cards.length > 0 && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-500">
            Area full - play or clear cards
          </span>
        </div>
      )}
    </div>
  );
}