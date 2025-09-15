import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DefenseCountdown } from './DefenseCountdown';

interface DragonBlockModalProps {
  isOpen: boolean;
  attackerName: string;
  targetQueenName: string;
  getRemainingDefenseTime: () => number;
  onPlayDragon: () => Promise<void>;
  onAllowAttack: () => Promise<void>;
}

/**
 * Modal for dragon blocking knight attacks.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function DragonBlockModal({
  isOpen,
  attackerName,
  targetQueenName,
  getRemainingDefenseTime,
  onPlayDragon,
  onAllowAttack
}: DragonBlockModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Can't close without choosing
      title="Knight Attack!"
    >
      <div className="space-y-4">
        <p className="text-center">
          <strong>{attackerName}</strong> is trying to steal your <strong>{targetQueenName}</strong>!
        </p>
        <p className="text-center text-sm text-gray-600">
          You can play a Dragon to block this attack, or let it happen.
        </p>
        
        <DefenseCountdown getRemainingDefenseTime={getRemainingDefenseTime} />
        
        <div className="flex space-x-3">
          <Button
            onClick={onPlayDragon}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            🐉 Play Dragon (Block Attack)
          </Button>
          <Button
            onClick={onAllowAttack}
            variant="secondary"
            className="flex-1"
          >
            Allow Attack
          </Button>
        </div>
      </div>
    </Modal>
  );
}