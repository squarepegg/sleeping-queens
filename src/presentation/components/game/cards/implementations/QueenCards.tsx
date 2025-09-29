import React from 'react';
import Image from 'next/image';
import {
  Bug,
  Heart,
  Cake,
  Cat,
  Dog,
  Palette,
  Star,
  Moon,
  Sun,
  Flower2,
  Sparkles,
  Fish,
  Feather,
  Flower
} from 'lucide-react';
import { CardRenderer, CARD_ICON_SIZES } from '../CardRegistry';

// Map queen IDs to their specific images
const QUEEN_IMAGE_MAP: { [key: string]: string } = {
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
};

// Queen Card Renderer
export class QueenCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    // Queens use the 'lg' size mapping by default
    const sizeClass = size === 'sm' ? CARD_ICON_SIZES.sm : CARD_ICON_SIZES.lg;
    return <Sparkles className={sizeClass} />;
  }

  getClassName(): string {
    return 'queen-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg', card?: any): React.ReactNode {
    // Map card ID directly to its corresponding image
    const cardId = card?.id;
    const imagePath = QUEEN_IMAGE_MAP[cardId];

    if (!imagePath) {
      // Fallback to icon rendering
      return null;
    }

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-125 origin-center">
          <Image
            src={imagePath}
            alt="Queen Card"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    );
  }
}

// Individual Queen Renderers
export class CatQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class DogQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class CakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class PancakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class LadybugQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class StarfishQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class RainbowQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class HeartQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class PeacockQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class MoonQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class SunflowerQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

export class RoseQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}

// Default Queen Renderer (for any queen without specific renderer)
export class DefaultQueenRenderer extends QueenCardRenderer {
  constructor() {
    super();
  }
}