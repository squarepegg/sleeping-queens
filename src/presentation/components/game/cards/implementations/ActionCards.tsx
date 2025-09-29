import React from 'react';
import Image from 'next/image';
import { Crown, Sword, Shield, Beaker } from 'lucide-react';
import { CardRenderer, CARD_ICON_SIZES } from '../CardRegistry';

// Map king IDs to their specific images
const KING_IMAGE_MAP: { [key: string]: string } = {
  'king-1': '/images/kings/bubblegum-king.png',
  'king-2': '/images/kings/chess-king.png',
  'king-3': '/images/kings/cookie-king.png',
  'king-4': '/images/kings/fire-king.png',
  'king-5': '/images/kings/hat-king.png',
  'king-6': '/images/kings/puzzle-king.png',
  'king-7': '/images/kings/tie-dye-king.png',
  'king-8': '/images/kings/turtle-king.png',
};

// King Card Renderer
export class KingCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Crown className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'king-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg', card?: any): React.ReactNode {
    // Map card ID directly to its corresponding image
    const cardId = card?.id || 'king-1';
    const imagePath = KING_IMAGE_MAP[cardId] || KING_IMAGE_MAP['king-1'];

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src={imagePath}
            alt="King Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Map knight IDs to their specific images
const KNIGHT_IMAGE_MAP: { [key: string]: string } = {
  'knight-1': '/images/actions/knight-1.png',
  'knight-2': '/images/actions/knight-2.png',
  'knight-3': '/images/actions/knight-3.png',
  'knight-4': '/images/actions/knight-4.png',
};

// Knight Card Renderer
export class KnightCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Sword className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'knight-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg', card?: any): React.ReactNode {
    // Map card ID directly to its corresponding image
    const cardId = card?.id || 'knight-1';
    const imagePath = KNIGHT_IMAGE_MAP[cardId] || KNIGHT_IMAGE_MAP['knight-1'];

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src={imagePath}
            alt="Knight Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Map dragon IDs to their specific images
// Note: We have 4 dragon images but only 3 dragon cards in the game
const DRAGON_IMAGE_MAP: { [key: string]: string } = {
  'dragon-1': '/images/actions/dragon-1.png',
  'dragon-2': '/images/actions/dragon-2.png',
  'dragon-3': '/images/actions/dragon-3.png',
};

// Dragon Card Renderer
export class DragonCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Shield className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'dragon-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg', card?: any): React.ReactNode {
    // Map card ID directly to its corresponding image
    const cardId = card?.id || 'dragon-1';
    const imagePath = DRAGON_IMAGE_MAP[cardId] || DRAGON_IMAGE_MAP['dragon-1'];

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src={imagePath}
            alt="Dragon Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Magic Wand Card Renderer
export class WandCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
      lg: 'h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8'
    };

    return (
      <img
        src="/images/actions/magic-wand.png"
        alt="Magic Wand"
        className={`${sizeClasses[size]} object-contain`}
      />
    );
  }

  getClassName(): string {
    return 'wand-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src="/images/actions/magic-wand.png"
            alt="Magic Wand Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Potion Card Renderer
export class PotionCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Beaker className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'potion-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src="/images/actions/sleeping-potion.png"
            alt="Sleeping Potion Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Jester Card Renderer
export class JesterCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <span className={`${CARD_ICON_SIZES[size]} flex items-center justify-center text-lg`}>🃏</span>;
  }

  getClassName(): string {
    return 'jester-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-150 origin-center">
          <Image
            src="/images/actions/jester.png"
            alt="Jester Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}