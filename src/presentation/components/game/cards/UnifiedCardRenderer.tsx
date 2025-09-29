import React from 'react';
import Image from 'next/image';
import {
  Crown, Sword, Shield, Wand, Beaker, Sparkles,
  Bug, Heart, Cake, Cat, Dog, Palette, Star, Moon, Sun, Flower2, Fish, Feather, Flower
} from 'lucide-react';
import { CardRenderer, CARD_ICON_SIZES } from './CardRegistry';

// Central image mapping for all card types
const CARD_IMAGE_MAP: { [key: string]: string } = {
  // Kings
  'king-1': '/images/kings/bubblegum-king.png',
  'king-2': '/images/kings/chess-king.png',
  'king-3': '/images/kings/cookie-king.png',
  'king-4': '/images/kings/fire-king.png',
  'king-5': '/images/kings/hat-king.png',
  'king-6': '/images/kings/puzzle-king.png',
  'king-7': '/images/kings/tie-dye-king.png',
  'king-8': '/images/kings/turtle-king.png',

  // Queens - Card IDs match the format from CardFactory.ts
  'queen-cat': '/images/queens/cat-queen.png',
  'queen-dog': '/images/queens/dog-queen.png',
  'queen-cake': '/images/queens/cake-queen.png',
  'queen-pancake': '/images/queens/pancake-queen.png',
  'queen-ladybug': '/images/queens/ladybug-queen.png',
  'queen-starfish': '/images/queens/starfish-queen.png',
  'queen-rainbow': '/images/queens/rainbow-queen.png',
  'queen-heart': '/images/queens/heart-queen.png',
  'queen-peacock': '/images/queens/peacock-queen.png',
  'queen-moon': '/images/queens/moon-queen.png',
  'queen-sunflower': '/images/queens/sunflower-queen.png',
  'queen-rose': '/images/queens/rose-queen.png',

  // Knights
  'knight-1': '/images/actions/knight-1.png',
  'knight-2': '/images/actions/knight-2.png',
  'knight-3': '/images/actions/knight-3.png',
  'knight-4': '/images/actions/knight-4.png',

  // Dragons
  'dragon-1': '/images/actions/dragon-1.png',
  'dragon-2': '/images/actions/dragon-2.png',
  'dragon-3': '/images/actions/dragon-3.png',
  'dragon-4': '/images/actions/dragon-4.png',

  // Wands - All wand cards use the same magic-wand image
  'wand-1': '/images/actions/magic-wand.png',
  'wand-2': '/images/actions/magic-wand.png',
  'wand-3': '/images/actions/magic-wand.png',

  // Potions - All potion cards use the same sleeping-potion image
  'potion-1': '/images/actions/sleeping-potion.png',
  'potion-2': '/images/actions/sleeping-potion.png',
  'potion-3': '/images/actions/sleeping-potion.png',
  'potion-4': '/images/actions/sleeping-potion.png',

  // Jesters - All jester cards use the same jester image
  'jester-1': '/images/actions/jester.png',
  'jester-2': '/images/actions/jester.png',
  'jester-3': '/images/actions/jester.png',
  'jester-4': '/images/actions/jester.png',
  'jester-5': '/images/actions/jester.png',
};

// Icon mapping for fallbacks
const CARD_ICON_MAP: { [key: string]: React.ComponentType<any> } = {
  'king': Crown,
  'queen': Sparkles,
  'knight': Sword,
  'dragon': Shield,
  'wand': Wand,
  'potion': Beaker,
  'jester': Sparkles,
  'number': Sparkles,
};

// Specific queen icons (for variety when images aren't available)
const QUEEN_SPECIFIC_ICONS: { [key: string]: React.ComponentType<any> } = {
  'queen-cat': Cat,
  'queen-dog': Dog,
  'queen-cake': Cake,
  'queen-pancake': Cake,
  'queen-ladybug': Bug,
  'queen-starfish': Fish,
  'queen-rainbow': Palette,
  'queen-heart': Heart,
  'queen-peacock': Feather,
  'queen-moon': Moon,
  'queen-sunflower': Flower,
  'queen-rose': Flower2,
};

// Unified Card Renderer for all card types
export class UnifiedCardRenderer implements CardRenderer {
  constructor(private cardType: string) {}

  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const sizeClass = CARD_ICON_SIZES[size];

    // Use general icon for the card type (specific icons are handled in renderFullCard)
    const Icon = CARD_ICON_MAP[this.cardType] || Sparkles;
    return <Icon className={sizeClass} />;
  }

  getClassName(): string {
    return `${this.cardType}-card`;
  }

  renderFullCard(size: 'sm' | 'md' | 'lg', card?: any): React.ReactNode {
    if (!card?.id) {
      return null;
    }

    // Try to get the image path for this specific card
    const imagePath = CARD_IMAGE_MAP[card.id];

    if (!imagePath) {
      // No image available, fall back to icon rendering
      return null;
    }

    // Use 150% zoom for Kings and Queens, normal zoom for others
    const scale = (this.cardType === 'king' || this.cardType === 'queen') ? 'scale-150' : 'scale-125';

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className={`absolute inset-0 ${scale} origin-center`}>
          <Image
            src={imagePath}
            alt={`${this.cardType} Card`}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Points badge for queen cards */}
        {this.cardType === 'queen' && card?.points && (
          <div className="absolute bottom-1 sm:bottom-2 right-1 sm:right-2 bg-yellow-400 text-black text-xs-responsive sm:text-xs font-bold w-5 sm:w-6 h-5 sm:h-6 rounded-full flex items-center justify-center border border-purple-800 z-10">
            {card.points}
          </div>
        )}
      </div>
    );
  }
}

// Specific renderer for number cards (they don't need images)
export class NumberCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Sparkles className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'number-card';
  }

  renderFullCard(): React.ReactNode {
    // Number cards use default text rendering, no full card image
    return null;
  }
}