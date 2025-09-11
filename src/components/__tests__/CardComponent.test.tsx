import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardComponent } from '../game/CardComponent';
import { Queen, NumberCard, Card } from '../../game/types';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, whileHover, whileTap, transition, ...props }: any, ref: any) => 
      <div ref={ref} {...props}>{children}</div>
    )
  }
}));

describe('CardComponent', () => {
  const mockOnClick = jest.fn();
  const mockOnDoubleClick = jest.fn();
  const mockOnDragStart = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
    mockOnDoubleClick.mockClear();
    mockOnDragStart.mockClear();
  });

  describe('Queen Cards', () => {
    const queenCard: Queen = {
      id: 'queen-test',
      type: 'queen',
      name: 'Test Queen',
      points: 15,
      isAwake: true
    };

    test('should render queen card with correct information', () => {
      render(
        <CardComponent
          card={queenCard}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      expect(screen.getByText('Test Queen')).toBeInTheDocument();
      expect(screen.getByText('15pts')).toBeInTheDocument();
    });

    test('should handle queen card click', () => {
      render(
        <CardComponent
          card={queenCard}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = screen.getByText('Test Queen').closest('div');
      fireEvent.click(card!);
      
      expect(mockOnClick).toHaveBeenCalledWith(queenCard);
    });

    test('should show queen card as selected', () => {
      const { container } = render(
        <CardComponent
          card={queenCard}
          selected={true}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('card-selectable');
    });

    test('should show queen card as glowing', () => {
      const { container } = render(
        <CardComponent
          card={queenCard}
          glowing={true}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('ring-yellow-400');
    });
  });

  describe('Number Cards', () => {
    const numberCard: NumberCard = {
      id: 'number-7',
      type: 'number',
      value: 7,
      name: '7'
    };

    test('should render number card with value', () => {
      render(<CardComponent card={numberCard} />);

      // Should show value in multiple places (center and corners)
      const valueElements = screen.getAllByText('7');
      expect(valueElements.length).toBeGreaterThanOrEqual(1);
    });

    test('should handle number card double click', () => {
      const { container } = render(
        <CardComponent
          card={numberCard}
          interactive={true}
          onDoubleClick={mockOnDoubleClick}
        />
      );

      const card = container.firstChild as HTMLElement;
      fireEvent.doubleClick(card);
      
      expect(mockOnDoubleClick).toHaveBeenCalledWith(numberCard);
    });
  });

  describe('Action Cards', () => {
    const kingCard: Card = {
      id: 'king-test',
      type: 'king',
      name: 'King',
      description: 'Wake up a sleeping queen'
    };

    test('should render action card with name', () => {
      render(<CardComponent card={kingCard} />);

      expect(screen.getByText('King')).toBeInTheDocument();
    });

    test('should show appropriate icon for card type', () => {
      const { container } = render(<CardComponent card={kingCard} />);
      
      // Should have crown icon for king
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Card States', () => {
    const testCard: Card = {
      id: 'test-card',
      type: 'king',
      name: 'Test Card'
    };

    test('should render card face down', () => {
      render(<CardComponent card={testCard} faceDown={true} />);

      expect(screen.getByText(/Sleeping/)).toBeInTheDocument();
      expect(screen.getByText(/Queens/)).toBeInTheDocument();
      expect(screen.queryByText('Test Card')).not.toBeInTheDocument();
    });

    test('should be disabled when specified', () => {
      const { container } = render(
        <CardComponent
          card={testCard}
          disabled={true}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);
      
      expect(mockOnClick).not.toHaveBeenCalled();
      expect(card).toHaveClass('cursor-not-allowed', 'opacity-50');
    });

    test('should be draggable when enabled', () => {
      const { container } = render(
        <CardComponent
          card={testCard}
          draggable={true}
          onDragStart={mockOnDragStart}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveAttribute('draggable', 'true');
      
      fireEvent.dragStart(card);
      expect(mockOnDragStart).toHaveBeenCalledWith(testCard);
    });
  });

  describe('Card Sizing', () => {
    const testCard: Card = {
      id: 'test-card',
      type: 'king',
      name: 'Test Card'
    };

    test('should render small card', () => {
      const { container } = render(
        <CardComponent card={testCard} size="sm" />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('w-16');
    });

    test('should render large card', () => {
      const { container } = render(
        <CardComponent card={testCard} size="lg" />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card-large');
    });

    test('should render medium card by default', () => {
      const { container } = render(
        <CardComponent card={testCard} />
      );

      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('card-base');
    });
  });

  describe('Card Styling', () => {
    test('should apply queen card styling', () => {
      const queenCard: Queen = {
        id: 'queen-test',
        type: 'queen',
        name: 'Test Queen',
        points: 15,
        isAwake: true
      };

      const { container } = render(<CardComponent card={queenCard} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('queen-card');
    });

    test('should apply king card styling', () => {
      const kingCard: Card = {
        id: 'king-test',
        type: 'king',
        name: 'King'
      };

      const { container } = render(<CardComponent card={kingCard} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('king-card');
    });

    test('should apply number card styling', () => {
      const numberCard: NumberCard = {
        id: 'number-test',
        type: 'number',
        value: 5,
        name: '5'
      };

      const { container } = render(<CardComponent card={numberCard} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain('number-card');
    });
  });

  describe('Accessibility', () => {
    const testCard: Card = {
      id: 'test-card',
      type: 'king',
      name: 'Test Card'
    };

    test('should be keyboard accessible when interactive', () => {
      const { container } = render(
        <CardComponent
          card={testCard}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-pointer');
    });

    test('should not be interactive when disabled', () => {
      const { container } = render(
        <CardComponent
          card={testCard}
          disabled={true}
          interactive={true}
          onClick={mockOnClick}
        />
      );

      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('cursor-not-allowed');
    });
  });
});