import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Trophy } from 'lucide-react';
import { Player } from '@/game/types';

interface WinModalProps {
  isOpen: boolean;
  onClose: () => void;
  winner: Player | null;
}

/**
 * Modal displayed when the game ends with a winner.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function WinModal({ isOpen, onClose, winner }: WinModalProps) {
  if (!isOpen || !winner) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Game Over!"
    >
      <div className="text-center py-6">
        <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {winner.name} Wins!
        </h2>
        <p className="text-gray-600 mb-6">
          Congratulations on collecting enough queens and points!
        </p>
        <Button
          onClick={() => window.location.href = '/lobby'}
          size="lg"
        >
          Back to Lobby
        </Button>
      </div>
    </Modal>
  );
}