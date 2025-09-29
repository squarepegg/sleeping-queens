// Central card registry initialization
import { CardRegistry } from './CardRegistry';
import {
  KingCardRenderer,
  KnightCardRenderer,
  DragonCardRenderer,
  WandCardRenderer,
  PotionCardRenderer,
  JesterCardRenderer
} from './implementations/ActionCards';

import {
  CatQueenRenderer,
  DogQueenRenderer,
  CakeQueenRenderer,
  PancakeQueenRenderer,
  LadybugQueenRenderer,
  StarfishQueenRenderer,
  RainbowQueenRenderer,
  HeartQueenRenderer,
  PeacockQueenRenderer,
  MoonQueenRenderer,
  SunflowerQueenRenderer,
  RoseQueenRenderer,
  DefaultQueenRenderer
} from './implementations/QueenCards';

import { NumberCardRenderer } from './implementations/NumberCards';

// Initialize the card registry with all card types
export function initializeCardRegistry() {
  // Register action cards
  CardRegistry.register('king', () => new KingCardRenderer());
  CardRegistry.register('knight', () => new KnightCardRenderer());
  CardRegistry.register('dragon', () => new DragonCardRenderer());
  CardRegistry.register('wand', () => new WandCardRenderer());
  CardRegistry.register('potion', () => new PotionCardRenderer());
  CardRegistry.register('jester', () => new JesterCardRenderer());

  // Register number cards
  CardRegistry.register('number', () => new NumberCardRenderer());

  // Register specific queens
  CardRegistry.registerSpecific('queen-cat', () => new CatQueenRenderer());
  CardRegistry.registerSpecific('queen-dog', () => new DogQueenRenderer());
  CardRegistry.registerSpecific('queen-cake', () => new CakeQueenRenderer());
  CardRegistry.registerSpecific('queen-pancake', () => new PancakeQueenRenderer());
  CardRegistry.registerSpecific('queen-ladybug', () => new LadybugQueenRenderer());
  CardRegistry.registerSpecific('queen-starfish', () => new StarfishQueenRenderer());
  CardRegistry.registerSpecific('queen-rainbow', () => new RainbowQueenRenderer());
  CardRegistry.registerSpecific('queen-heart', () => new HeartQueenRenderer());
  CardRegistry.registerSpecific('queen-peacock', () => new PeacockQueenRenderer());
  CardRegistry.registerSpecific('queen-moon', () => new MoonQueenRenderer());
  CardRegistry.registerSpecific('queen-sunflower', () => new SunflowerQueenRenderer());
  CardRegistry.registerSpecific('queen-rose', () => new RoseQueenRenderer());

  // Register default queen renderer for any unknown queens
  CardRegistry.register('queen', () => new DefaultQueenRenderer());
}

// Initialize on module load
initializeCardRegistry();

// Export the registry for use in components
export { CardRegistry } from './CardRegistry';
export type { CardRenderer } from './CardRegistry';