import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Card, Queen, NumberCard, ActionCard } from '../../game/types';
import { getCardDisplayName } from '../../game/cards';
import { 
  Crown, 
  Sword, 
  Shield, 
  Wand2, 
  Beaker,
  Sparkles,
  Heart,
  Star,
  Sun,
  Moon,
  Flower2,
  Bug,
  Cherry,
  Palette,
  Cake
} from 'lucide-react';

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

const QUEEN_ICONS: { [key: string]: React.ComponentType<any> } = {
  'queen-cat': Bug,
  'queen-dog': Heart,
  'queen-cake': Cake,
  'queen-pancake': Cake,
  'queen-ladybug': Bug,
  'queen-strawberry': Cherry,
  'queen-rainbow': Palette,
  'queen-heart': Heart,
  'queen-star': Star,
  'queen-moon': Moon,
  'queen-sun': Sun,
  'queen-rose': Flower2,
};

const CARD_TYPE_ICONS: { [key: string]: React.ComponentType<any> } = {
  king: Crown,
  knight: Sword,
  dragon: Shield,
  wand: Wand2,
  potion: Beaker,
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
    switch (card.type) {
      case 'queen':
        return 'queen-card';
      case 'king':
        return 'king-card';
      case 'knight':
        return 'knight-card';
      case 'dragon':
        return 'dragon-card';
      case 'wand':
        return 'wand-card';
      case 'potion':
        return 'potion-card';
      case 'number':
        return 'number-card';
      default:
        return '';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-22';
      case 'lg':
        return 'card-large';
      default:
        return 'card-base';
    }
  };

  const getIcon = () => {
    if (card.type === 'queen') {
      const IconComponent = QUEEN_ICONS[card.id] || Sparkles;
      return <IconComponent className="h-8 w-8" />;
    }
    
    const IconComponent = CARD_TYPE_ICONS[card.type];
    if (IconComponent) {
      return <IconComponent className="h-6 w-6" />;
    }

    return null;
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
      const numberCard = card as NumberCard;
      return `Value: ${numberCard.value}`;
    }

    return card.description || '';
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
      type: "spring", 
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
          // Card face
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
            <div className="flex-shrink-0 mb-1">
              {getIcon()}
            </div>
            
            <div className="flex-grow flex flex-col justify-center min-h-0">
              <div className={clsx(
                'font-semibold leading-tight',
                size === 'sm' ? 'text-[0.6rem]' : 'text-xs'
              )}>
                {getCardTitle()}
              </div>
              
              {size !== 'sm' && (
                <div className="text-[0.55rem] text-gray-600 mt-0.5 opacity-75">
                  {getCardSubtext()}
                </div>
              )}
            </div>

            {/* Corner values for number cards */}
            {card.type === 'number' && (
              <>
                <div className="absolute top-1 left-1 text-xs font-bold">
                  {(card as NumberCard).value}
                </div>
                <div className="absolute bottom-1 right-1 text-xs font-bold transform rotate-180">
                  {(card as NumberCard).value}
                </div>
              </>
            )}

            {/* Points indicator for queens */}
            {card.type === 'queen' && size !== 'sm' && (
              <div className="absolute bottom-1 left-1 right-1 text-center">
                <div className="inline-block bg-white/50 rounded-full px-1 py-0.5 text-[0.5rem] font-bold">
                  {(card as Queen).points}pts
                </div>
              </div>
            )}

            {/* Special effects overlay */}
            {(selected || isHovered) && (
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-lg pointer-events-none" />
            )}
          </div>
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