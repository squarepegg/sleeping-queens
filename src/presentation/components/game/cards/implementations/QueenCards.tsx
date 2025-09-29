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

// Base Queen Card Renderer
class QueenCardRenderer implements CardRenderer {
  constructor(
    private icon: React.ComponentType<any>,
    private imagePath?: string
  ) {}

  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const Icon = this.icon;
    // Queens use the 'lg' size mapping by default
    const sizeClass = size === 'sm' ? CARD_ICON_SIZES.sm : CARD_ICON_SIZES.lg;
    return <Icon className={sizeClass} />;
  }

  getClassName(): string {
    return 'queen-card';
  }

  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    if (!this.imagePath) {
      // Fallback to icon rendering
      return null;
    }

    return (
      <div className="absolute inset-0 overflow-hidden rounded-lg">
        <div className="absolute inset-0 scale-125 origin-center">
          <Image
            src={this.imagePath}
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
    super(Cat, '/images/queens/cat-queen.png');
  }
}

export class DogQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Dog, '/images/queens/dog-queen.png');
  }
}

export class CakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Cake, '/images/queens/cake-queen.png');
  }
}

export class PancakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Cake, '/images/queens/pancake-queen.png');
  }
}

export class LadybugQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Bug, '/images/queens/ladybug-queen.png');
  }
}

export class StarfishQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Fish, '/images/queens/starfish-queen.png');
  }
}

export class RainbowQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Palette, '/images/queens/rainbow-queen.png');
  }
}

export class HeartQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Heart, '/images/queens/heart-queen.png');
  }
}

export class PeacockQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Feather, '/images/queens/peacock-queen.png');
  }
}

export class MoonQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Moon, '/images/queens/moon-queen.png');
  }
}

export class SunflowerQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Flower, '/images/queens/sunflower-queen.png');
  }
}

export class RoseQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Flower2, '/images/queens/rose-queen.png');
  }
}

// Default Queen Renderer (for any queen without specific renderer)
export class DefaultQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Sparkles);
  }
}