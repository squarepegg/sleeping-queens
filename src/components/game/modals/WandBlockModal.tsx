import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { DefenseCountdown } from './DefenseCountdown';

interface WandBlockModalProps {
  isOpen: boolean;
  attackerName: string;
  targetQueenName: string;
  getRemainingDefenseTime: () => number;
  onPlayWand: () => Promise<void>;
  onAllowAttack: () => Promise<void>;
}

/**
 * Modal for wand blocking sleeping potion attacks.
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function WandBlockModal({
  isOpen,
  attackerName,
  targetQueenName,
  getRemainingDefenseTime,
  onPlayWand,
  onAllowAttack
}: WandBlockModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Can't close without choosing
      title="Sleeping Potion Attack!"
    >
      <div className="space-y-4">
        <p className="text-center">
          <strong>{attackerName}</strong> is trying to put your <strong>{targetQueenName}</strong> to sleep!
        </p>
        <p className="text-center text-sm text-gray-600">
          You can play a Magic Wand to block this attack, or let it happen.
        </p>
        
        <DefenseCountdown getRemainingDefenseTime={getRemainingDefenseTime} />
        
        <div className="flex space-x-3">
          <Button
            onClick={onPlayWand}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          >
            🪄 Play Wand (Block Attack)
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