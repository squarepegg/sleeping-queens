import React from 'react';
import { Card } from '@/domain/models/Card';

// Card renderer interface
export interface CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode;
  getClassName(): string;
  renderFullCard?(size: 'sm' | 'md' | 'lg'): React.ReactNode; // Optional full card rendering
}

// Size mappings for consistent sizing across all card types
export const CARD_ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
  lg: 'h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8'
} as const;

// Card registry to manage all card renderers
class CardRegistryClass {
  private renderers: Map<string, () => CardRenderer> = new Map();

  register(type: string, rendererFactory: () => CardRenderer): void {
    this.renderers.set(type, rendererFactory);
  }

  registerSpecific(id: string, rendererFactory: () => CardRenderer): void {
    this.renderers.set(`specific:${id}`, rendererFactory);
  }

  getRenderer(card: Card): CardRenderer | null {
    // First check for specific card ID (e.g., specific queens)
    const specificRenderer = this.renderers.get(`specific:${card.id}`);
    if (specificRenderer) {
      return specificRenderer();
    }

    // Then check for card type
    const typeRenderer = this.renderers.get(card.type);
    if (typeRenderer) {
      return typeRenderer();
    }

    return null;
  }

  clear(): void {
    this.renderers.clear();
  }
}

export const CardRegistry = new CardRegistryClass();