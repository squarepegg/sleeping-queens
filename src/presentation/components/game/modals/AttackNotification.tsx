import React from 'react';
import {Modal} from '@/presentation/components/ui/Modal';
import {DefenseCountdown} from './DefenseCountdown';

interface AttackNotificationProps {
  isOpen: boolean;
  title: string;
  attackerName: string;
  targetPlayerName: string;
  targetQueenName?: string;
  message?: string;
  waitingMessage?: string;
  getRemainingDefenseTime: () => number;
}

/**
 * Generic notification modal for players watching an attack
 * Shows for players who can't defend or aren't involved
 */
export function AttackNotification({
  isOpen,
  title,
  attackerName,
  targetPlayerName,
  targetQueenName,
  message,
  waitingMessage,
  getRemainingDefenseTime
}: AttackNotificationProps) {
  if (!isOpen) return null;

  const defaultMessage = targetQueenName
    ? `${attackerName} is attacking ${targetPlayerName}'s ${targetQueenName}!`
    : `${attackerName} is attacking ${targetPlayerName}!`;

  const defaultWaitingMessage = "Waiting to see if anyone blocks the attack...";

  return (
    <Modal
      isOpen={true}
      onClose={() => {}} // Can't close - just informational
      title={title}
    >
      <div className="space-y-4">
        <p className="text-center">
          <strong>{message || defaultMessage}</strong>
        </p>
        <p className="text-center text-sm text-gray-600">
          {waitingMessage || defaultWaitingMessage}
        </p>

        <DefenseCountdown getRemainingDefenseTime={getRemainingDefenseTime} />
      </div>
    </Modal>
  );
}