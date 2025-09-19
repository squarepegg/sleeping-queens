import React from 'react';
import { Crown, Sword, Shield, Beaker } from 'lucide-react';
import { CardRenderer, CARD_ICON_SIZES } from '../CardRegistry';

// King Card Renderer
export class KingCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Crown className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'king-card';
  }
}

// Knight Card Renderer
export class KnightCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Sword className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'knight-card';
  }
}

// Dragon Card Renderer
export class DragonCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return <Shield className={CARD_ICON_SIZES[size]} />;
  }

  getClassName(): string {
    return 'dragon-card';
  }
}

// Magic Wand Card Renderer - Uses custom image as full card
export class WandCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    // This is kept for compatibility but won't be used when renderFullCard is present
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
      lg: 'h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8'
    };

    return (
      <img
        src="/images/magic-wand.png"
        alt="Magic Wand"
        className={`${sizeClasses[size]} object-contain`}
      />
    );
  }

  getClassName(): string {
    return 'wand-card wand-card-full-image';
  }

  // Render the full card with the wand image
  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return (
      <div className="absolute inset-0 rounded-lg overflow-hidden">
        <img
          src="/images/magic-wand.png"
          alt="Magic Wand"
          className="w-full h-full object-cover"
        />
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
}

// Jester Card Renderer - Could use custom image if available
export class JesterCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    // If you have a jester image, use it here
    // return <img src="/images/jester.png" alt="Jester" className={CARD_ICON_SIZES[size]} />;

    // For now, using emoji as placeholder
    return <span className={`${CARD_ICON_SIZES[size]} flex items-center justify-center text-lg`}>🃏</span>;
  }

  getClassName(): string {
    return 'jester-card';
  }
}