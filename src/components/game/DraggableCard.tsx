import React, { CSSProperties } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/game/types';
import { CardComponent } from './CardComponent';
import clsx from 'clsx';

interface DraggableCardProps {
  card: Card;
  id: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function DraggableCard({ 
  card, 
  id, 
  disabled = false,
  className,
  size = 'md'
}: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    data: {
      card,
      type: 'card',
    },
    disabled,
  });

  // Important: Use transform for dragging but ensure visibility
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none', // Critical for mobile
    cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
    position: 'relative',
    transition: isDragging ? 'none' : 'transform 200ms ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        'draggable-card',
        isDragging && 'dragging',
        disabled && 'disabled',
        className
      )}
    >
      <CardComponent
        card={card}
        size={size}
        interactive={!disabled && !isDragging}
        className={clsx(
          isDragging && 'ring-2 ring-blue-400 ring-opacity-50'
        )}
      />
    </div>
  );
}

// Drag overlay component for better visibility
export function DragOverlay({ card }: { card: Card | null }) {
  if (!card) return null;
  
  return (
    <div style={{ cursor: 'grabbing' }}>
      <CardComponent
        card={card}
        size="md"
        interactive={false}
        className="shadow-2xl"
      />
    </div>
  );
}