import React from 'react';
import { CardRenderer } from '../CardRegistry';

// Number Card Renderer
export class NumberCardRenderer implements CardRenderer {
  getIcon(): React.ReactNode {
    // Number cards don't have icons, they display their value
    return null;
  }

  getClassName(): string {
    return 'number-card';
  }
}