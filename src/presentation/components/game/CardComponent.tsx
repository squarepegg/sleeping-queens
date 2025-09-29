import {forwardRef, useState} from 'react';
import {motion} from 'framer-motion';
import clsx from 'clsx';
import {Card, NumberCard, Queen} from '@/domain/models/Card';
import {getCardDisplayName} from '@/domain/factories/CardFactory';
import {Sparkles} from 'lucide-react';
import {CardRegistry} from './cards';

export interface CardComponentProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  glowing?: boolean;
  onClick?: (card: Card) => void;
  onDoubleClick?: (card: Card) => void;
  className?: string;
  style?: React.CSSProperties;
  draggable?: boolean;
  onDragStart?: (card: Card) => void;
}

// Card type to CSS class mapping (keeping for backward compatibility)
const CARD_TYPE_CLASSES: { [key: string]: string } = {
  queen: 'queen-card',
  king: 'king-card',
  knight: 'knight-card',
  dragon: 'dragon-card',
  wand: 'wand-card',
  potion: 'potion-card',
  jester: 'jester-card',
  number: 'number-card',
};

export const CardComponent = forwardRef<HTMLDivElement, CardComponentProps>(({
  card,
  size = 'md',
  interactive = false,
  selected = false,
  disabled = false,
  faceDown = false,
  glowing = false,
  onClick,
  onDoubleClick,
  className,
  style,
  draggable = false,
  onDragStart,
}, ref) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick(card);
    }
  };

  const handleDoubleClick = () => {
    if (!disabled && onDoubleClick) {
      onDoubleClick(card);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(card);
    }
  };

  const getCardTypeClass = () => {
    // Try to get from renderer first
    const renderer = CardRegistry.getRenderer(card);
    if (renderer) {
      return renderer.getClassName();
    }
    // Fallback to default mapping
    return CARD_TYPE_CLASSES[card.type] || '';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-22';
      case 'lg':
        return 'card-base'; // Use card-base for all cards to ensure consistent sizing
      default:
        return 'card-base';
    }
  };

  const getIcon = () => {
    // Use the card registry to get the appropriate renderer
    const renderer = CardRegistry.getRenderer(card);
    if (renderer) {
      return renderer.getIcon(size);
    }

    // Fallback to sparkles icon if no renderer found
    return <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />;
  };

  const getCardTitle = () => {
    if (card.type === 'queen') {
      return (card as Queen).name;
    }
    return getCardDisplayName(card);
  };

  const getCardSubtext = () => {
    if (card.type === 'queen') {
      const queen = card as Queen;
      return `${queen.points} points`;
    }
    
    if (card.type === 'number') {
      // Don't show "Value: x" since the number is already displayed in corners
      return '';
    }

    // Don't show descriptions for action cards
    return '';
  };

  const motionProps = {
    whileHover: interactive && !disabled ? { 
      y: -8, 
      scale: 1.05,
      rotateY: 5,
    } : undefined,
    whileTap: interactive && !disabled ? { 
      scale: 0.95 
    } : undefined,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 20
    },
  };

  return (
    <motion.div
      ref={ref}
      className={clsx(
        getSizeClass(),
        getCardTypeClass(),
        {
          'card-hoverable': interactive && !disabled,
          'card-selectable': selected,
          'cursor-pointer': interactive && !disabled,
          'cursor-not-allowed opacity-50': disabled,
          'ring-2 ring-yellow-400 ring-opacity-75 shadow-lg shadow-yellow-400/50': glowing,
          'transform rotate-y-180': faceDown,
        },
        className
      )}
      style={style}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      draggable={draggable && !disabled}
      onDragStart={handleDragStart as any}
      {...motionProps}
    >
      <div className={clsx('card-content', {
        'pointer-events-none': faceDown
      })}>
        {faceDown ? (
          // Card back design
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-800 rounded-lg flex items-center justify-center border-2 border-purple-400">
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-purple-200 mx-auto mb-2" />
              <div className="text-xs text-purple-200 font-medieval">
                Sleeping<br/>Queens
              </div>
            </div>
          </div>
        ) : (
          // Check if card has full rendering
          (() => {
            const renderer = CardRegistry.getRenderer(card);

            if (renderer?.renderFullCard) {
              const fullCardContent = renderer.renderFullCard(size, card);
              if (fullCardContent) {
                // Use full card rendering only if it returns content
                return (
                  <>
                    {fullCardContent}
                    {/* Special effects overlay */}
                    {(selected || isHovered) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-lg pointer-events-none" />
                    )}
                  </>
                );
              }
            }

            // Default card face rendering
            return (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
                <div className="flex-shrink-0 mb-1">
                  {getIcon()}
                </div>

                <div className="flex-grow flex flex-col justify-center min-h-0">
                  <div className={clsx(
                    'font-semibold leading-tight',
                    size === 'sm' ? 'text-[0.5rem] sm:text-[0.6rem]' : 'text-xs-responsive sm:text-xs'
                  )}>
                    {getCardTitle()}
                  </div>

                  {size !== 'sm' && (
                    <div className="text-[0.5rem] sm:text-[0.55rem] text-gray-600 mt-0.5 opacity-75">
                      {getCardSubtext()}
                    </div>
                  )}
                </div>

                {/* Corner values for number cards - Responsive */}
                {card.type === 'number' && (
                  <>
                    <div className="absolute top-0.5 sm:top-1 left-0.5 sm:left-1 text-xs-responsive sm:text-xs font-bold">
                      {(card as NumberCard).value}
                    </div>
                    <div className="absolute bottom-0.5 sm:bottom-1 right-0.5 sm:right-1 text-xs-responsive sm:text-xs font-bold transform rotate-180">
                      {(card as NumberCard).value}
                    </div>
                  </>
                )}

                {/* Points badge for queen cards */}
                {card.type === 'queen' && (
                  <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-yellow-400 text-black text-xs-responsive sm:text-xs font-bold w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center border border-purple-800">
                    {(card as Queen).points}
                  </div>
                )}

                {/* Special effects overlay */}
                {(selected || isHovered) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-lg pointer-events-none" />
                )}
              </div>
            );
          })()
        )}

        {/* Selection indicator */}
        {selected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
        )}

        {/* Glow effect */}
        {glowing && (
          <div className="absolute inset-0 bg-yellow-400/20 rounded-lg animate-pulse pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
});

CardComponent.displayName = 'CardComponent';