import React from 'react';
import {Card} from '@/domain/models/Card';
import {Plus} from 'lucide-react';
import clsx from 'clsx';
import {CardComponent} from './CardComponent';

interface DrawDiscardPilesProps {
  drawPile: Card[];
  discardPile: Card[];
  className?: string;
}

/**
 * DrawDiscardPiles Component
 * 
 * Displays the draw pile and discard pile vertically (top and bottom).
 * Part of the central game area.
 */
export function DrawDiscardPiles({ drawPile, discardPile, className }: DrawDiscardPilesProps) {
  const topDiscardCard = discardPile.length > 0 ? discardPile[discardPile.length - 1] : null;

  return (
    <div className={clsx('flex flex-col items-center gap-4', className)}>
      {/* Draw Pile */}
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-2 font-medium">Draw Pile</div>
        <div className="relative">
          <div 
            className="w-20 h-28 rounded-lg border-2 border-gray-400/50 shadow-lg cursor-pointer transition-all duration-300 hover:border-gray-300/75 hover:scale-105"
            style={{
              backgroundImage: 'url(/images/sleeping-queens-game.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
          </div>
          {/* Stack effect */}
          {drawPile.length > 1 && (
            <>
              <div className="absolute inset-0 -z-10 transform translate-x-1 translate-y-1 w-20 h-28 rounded-lg bg-gray-700/50" />
              {drawPile.length > 10 && (
                <div className="absolute inset-0 -z-20 transform translate-x-2 translate-y-2 w-20 h-28 rounded-lg bg-gray-800/30" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Discard Pile */}
      <div className="text-center">
        <div className="text-xs text-gray-400 mb-2 font-medium">Discard Pile</div>
        <div className="relative">
          {topDiscardCard ? (
            <>
              <CardComponent
                card={topDiscardCard}
                size="md"
                faceDown={false}
                interactive={false}
                className="border-2 border-gray-400/50 shadow-lg w-20 h-28"
              />
              {/* Stack effect for discard pile */}
              {discardPile.length > 1 && (
                <>
                  <div className="absolute inset-0 -z-10 transform translate-x-1 translate-y-1 w-20 h-28 bg-gray-700/50 rounded-lg" />
                  {discardPile.length > 2 && (
                    <div className="absolute inset-0 -z-20 transform translate-x-2 translate-y-2 w-20 h-28 bg-gray-800/30 rounded-lg" />
                  )}
                </>
              )}
            </>
          ) : (
            <div className="w-20 h-28 border-2 border-dashed border-gray-500/50 rounded-lg flex flex-col items-center justify-center text-gray-500">
              <Plus className="h-8 w-8 mb-1" />
              <span className="text-xs">Empty</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}