import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion } from 'framer-motion';

interface PlayAreaDropZoneProps {
  isCurrentTurn: boolean;
  canPlayCards: boolean;
}

export const PlayAreaDropZone: React.FC<PlayAreaDropZoneProps> = ({
  isCurrentTurn,
  canPlayCards
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'play-area',
    disabled: !isCurrentTurn || !canPlayCards
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        absolute inset-0 flex items-center justify-center
        transition-all duration-300
        pointer-events-none
        ${isOver && canPlayCards ? 'bg-green-500/10' : ''}
        ${isOver && !canPlayCards ? 'bg-red-500/10' : ''}
      `}
    >
      {/* Visual indicator when dragging */}
      {isOver && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`
            absolute inset-x-4 inset-y-4
            border-4 border-dashed rounded-2xl
            flex items-center justify-center
            pointer-events-none
            ${canPlayCards ? 'border-green-500' : 'border-red-500'}
          `}
        >
          <div className={`
            px-6 py-3 rounded-lg
            ${canPlayCards ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}
            font-semibold text-lg
          `}>
            {canPlayCards ? 'Drop to Play Card' : 'Not Your Turn'}
          </div>
        </motion.div>
      )}

      {/* Center play area indicator */}
      {!isOver && isCurrentTurn && canPlayCards && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-gray-600 text-sm">
            Drag cards here to play
          </div>
        </div>
      )}
    </div>
  );
};