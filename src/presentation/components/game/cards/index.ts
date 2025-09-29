// Central card registry initialization
import { CardRegistry } from './CardRegistry';
import { UnifiedCardRenderer, NumberCardRenderer } from './UnifiedCardRenderer';

// Initialize the card registry with all card types
export function initializeCardRegistry() {
  // Register all card types using the unified renderer
  CardRegistry.register('king', () => new UnifiedCardRenderer('king'));
  CardRegistry.register('queen', () => new UnifiedCardRenderer('queen'));
  CardRegistry.register('knight', () => new UnifiedCardRenderer('knight'));
  CardRegistry.register('dragon', () => new UnifiedCardRenderer('dragon'));
  CardRegistry.register('wand', () => new UnifiedCardRenderer('wand'));
  CardRegistry.register('potion', () => new UnifiedCardRenderer('potion'));
  CardRegistry.register('jester', () => new UnifiedCardRenderer('jester'));

  // Number cards use their specific renderer (no images needed)
  CardRegistry.register('number', () => new NumberCardRenderer());
}

// Initialize on module load
initializeCardRegistry();

// Export the registry for use in components
export { CardRegistry } from './CardRegistry';
export type { CardRenderer } from './CardRegistry';