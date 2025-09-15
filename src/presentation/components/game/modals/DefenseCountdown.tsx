import React, {useEffect, useState} from 'react';

interface DefenseCountdownProps {
  getRemainingDefenseTime: () => number;
  maxTime?: number; // Default 5000ms
}

/**
 * Countdown component for defense actions (dragon/wand blocking).
 * Extracted from GameBoard.tsx for better separation of concerns.
 */
export function DefenseCountdown({ 
  getRemainingDefenseTime, 
  maxTime = 5000 
}: DefenseCountdownProps) {
  const [remainingTime, setRemainingTime] = useState(getRemainingDefenseTime());
  
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingDefenseTime();
      setRemainingTime(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms for smooth countdown
    
    return () => clearInterval(interval);
  }, [getRemainingDefenseTime]);
  
  const seconds = Math.ceil(remainingTime / 1000);
  const percentage = Math.max(0, (remainingTime / maxTime) * 100);
  
  return (
    <div className="mb-4">
      <div className="text-center mb-2">
        <span className="text-lg font-bold text-red-600">
          {seconds}s remaining
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-red-500 h-2 rounded-full transition-all duration-100"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}