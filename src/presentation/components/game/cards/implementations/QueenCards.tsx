import React from 'react';
import {
  Bug,
  Heart,
  Cake,
  Cherry,
  Palette,
  Star,
  Moon,
  Sun,
  Flower2,
  Sparkles
} from 'lucide-react';
import { CardRenderer, CARD_ICON_SIZES } from '../CardRegistry';

// Base Queen Card Renderer
class QueenCardRenderer implements CardRenderer {
  constructor(private icon: React.ComponentType<any>) {}

  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const Icon = this.icon;
    // Queens use the 'lg' size mapping by default
    const sizeClass = size === 'sm' ? CARD_ICON_SIZES.sm : CARD_ICON_SIZES.lg;
    return <Icon className={sizeClass} />;
  }

  getClassName(): string {
    return 'queen-card';
  }
}

// Individual Queen Renderers
export class CatQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Bug); // Using Bug icon for Cat Queen (can be changed)
  }
}

export class DogQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Heart);
  }
}

export class CakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Cake);
  }
}

export class PancakeQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Cake);
  }
}

export class LadybugQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Bug);
  }
}

export class StrawberryQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Cherry);
  }
}

export class RainbowQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Palette);
  }
}

export class HeartQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Heart);
  }
}

export class StarQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Star);
  }
}

export class MoonQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Moon);
  }
}

export class SunQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Sun);
  }
}

export class RoseQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Flower2);
  }
}

// Default Queen Renderer (for any queen without specific renderer)
export class DefaultQueenRenderer extends QueenCardRenderer {
  constructor() {
    super(Sparkles);
  }
}