# Card Rendering System

This modular card rendering system allows easy customization of card appearances without cluttering a single component.

## Architecture

```
cards/
├── CardRegistry.tsx        # Central registry for card renderers
├── implementations/
│   ├── ActionCards.tsx     # King, Knight, Dragon, Wand, Potion, Jester
│   ├── QueenCards.tsx      # All Queen card variants
│   └── NumberCards.tsx     # Number cards (1-10)
└── index.ts               # Registry initialization
```

## Adding Custom Images for Cards

### Example 1: Full Card Image (like Magic Wand)

For cards where the image should replace the entire card face:

```typescript
export class WandCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    // Fallback icon if needed
    return <img src="/images/magic-wand.png" alt="Magic Wand" className="..." />;
  }

  getClassName(): string {
    return 'wand-card';
  }

  // This makes the image the entire card face
  renderFullCard(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    return (
      <div className="w-full h-full rounded-lg overflow-hidden">
        <img
          src="/images/magic-wand.png"
          alt="Magic Wand"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
}
```

### Example 2: Icon-style Image (traditional card with custom icon)

```typescript
export class DragonCardRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6',
      lg: 'h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8'
    };

    return (
      <img
        src="/images/dragon.png"
        alt="Dragon"
        className={`${sizeClasses[size]} object-contain`}
      />
    );
  }

  getClassName(): string {
    return 'dragon-card';
  }
}
```

### Example 2: Adding a custom Queen image

1. Place your image in `public/images/rose-queen.png`

2. Update `implementations/QueenCards.tsx`:

```typescript
export class RoseQueenRenderer implements CardRenderer {
  getIcon(size: 'sm' | 'md' | 'lg'): React.ReactNode {
    const sizeClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8';

    return (
      <img
        src="/images/rose-queen.png"
        alt="Rose Queen"
        className={`${sizeClass} object-contain`}
      />
    );
  }

  getClassName(): string {
    return 'queen-card rose-queen';
  }
}
```

## Benefits

1. **Separation of Concerns**: Each card type has its own renderer
2. **Easy to Extend**: Add new card types without modifying core components
3. **Image Support**: Simple to add custom images for any card
4. **Consistent Sizing**: Centralized size definitions
5. **Type Safety**: TypeScript interfaces ensure correct implementation
6. **Performance**: Renderers are created on-demand and cached

## Current Custom Images

- Magic Wand: `/images/magic-wand.png`

## Adding New Card Types

1. Create a new renderer class implementing `CardRenderer`
2. Register it in `index.ts`
3. Add any custom styling to your CSS files

The system automatically falls back to default icons if a renderer isn't found.