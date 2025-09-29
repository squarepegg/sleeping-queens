import React from 'react';
import { render, screen } from '@testing-library/react';
import { InfoDrawer } from '../InfoDrawer';
import { Card } from '@/domain/models/Card';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock CardComponent
jest.mock('../CardComponent', () => ({
  CardComponent: ({ card }: { card: Card }) => (
    <div data-testid="card-component">{card.name || card.type}</div>
  )
}));

describe('InfoDrawer', () => {
  const mockCards: Card[] = [
    { id: 'card-1', type: 'king', name: 'Fire King' }
  ];

  describe('Basic rendering', () => {
    it('should render when open', () => {
      render(
        <InfoDrawer
          isOpen={true}
          cards={mockCards}
          message="Test message"
          playerName="Alice"
        />
      );

      expect(screen.getByText("Alice's Turn")).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <InfoDrawer
          isOpen={false}
          cards={mockCards}
          message="Test message"
          playerName="Alice"
        />
      );

      expect(screen.queryByText("Alice's Turn")).not.toBeInTheDocument();
    });

    it('should show Cards Drawn header for drawn cards', () => {
      render(
        <InfoDrawer
          isOpen={true}
          cards={mockCards}
          message="Here are the cards you picked up:"
          playerName="Cards Drawn"
        />
      );

      expect(screen.getByText('You Picked Up')).toBeInTheDocument();
    });
  });

  describe('Action Details rendering', () => {
    it('should render action details when provided', () => {
      const actionDetails = [
        {
          action: 'Played King',
          detail: 'Fire King',
          cards: [{ id: 'king-1', type: 'king' as const, name: 'Fire King' }]
        },
        {
          action: 'Woke Queen',
          detail: 'Pancake Queen (10 points)',
          cards: [{ id: 'queen-1', type: 'queen' as const, name: 'Pancake Queen', points: 10, isAwake: true }]
        },
        {
          action: 'Drew card',
          detail: 'Replacement card drawn'
        }
      ];

      render(
        <InfoDrawer
          isOpen={true}
          cards={[]}
          message="Player completed their turn"
          playerName="Alice"
          actionDetails={actionDetails}
        />
      );

      // Check that the friendly message is rendered
      expect(screen.getByText('Woke Pancake Queen (10 points) with Fire King!')).toBeInTheDocument();

      // Check that cards are rendered in action details
      const cardComponents = screen.getAllByTestId('card-component');
      expect(cardComponents).toHaveLength(2); // King and Queen cards
    });

    it('should not render action details section when not provided', () => {
      render(
        <InfoDrawer
          isOpen={true}
          cards={mockCards}
          message="Simple action"
          playerName="Bob"
        />
      );

      // Should not have the action details container
      expect(screen.queryByText('Played King:')).not.toBeInTheDocument();
      expect(screen.queryByText('Drew card:')).not.toBeInTheDocument();
    });

    it('should handle action details without cards', () => {
      const actionDetails = [
        {
          action: 'Game Event',
          detail: 'Something happened'
        }
      ];

      render(
        <InfoDrawer
          isOpen={true}
          cards={[]}
          message="Event occurred"
          actionDetails={actionDetails}
        />
      );

      // Should show the fallback message when no specific action is recognized
      expect(screen.getByText('Event occurred')).toBeInTheDocument();
    });

    it('should handle Rose Queen bonus in action details', () => {
      const actionDetails = [
        {
          action: 'Played King',
          detail: 'Fire King',
          cards: [{ id: 'king-1', type: 'king' as const, name: 'Fire King' }]
        },
        {
          action: 'Woke Queen',
          detail: 'Rose Queen (5 points)',
          cards: [{ id: 'queen-1', type: 'queen' as const, name: 'Rose Queen', points: 5, isAwake: true }]
        },
        {
          action: 'Rose Queen Bonus',
          detail: 'Choose another queen to wake!'
        }
      ];

      render(
        <InfoDrawer
          isOpen={true}
          cards={[]}
          message="Rose Queen bonus activated!"
          actionDetails={actionDetails}
        />
      );

      // Check for the friendly Rose Queen message
      expect(screen.getByText(/Rose Queen bonus activated - choose another queen!/)).toBeInTheDocument();
    });

    it('should handle Queen conflict in action details', () => {
      const actionDetails = [
        {
          action: 'Played King',
          detail: 'Fire King',
          cards: [{ id: 'king-1', type: 'king' as const, name: 'Fire King' }]
        },
        {
          action: 'Woke Queen',
          detail: 'Dog Queen (5 points)',
          cards: [{ id: 'queen-1', type: 'queen' as const, name: 'Dog Queen', points: 5, isAwake: true }]
        },
        {
          action: 'Queen Conflict',
          detail: "Cat Queen and Dog Queen can't be together! Dog Queen went back to sleep"
        }
      ];

      render(
        <InfoDrawer
          isOpen={true}
          cards={[]}
          message="Queen conflict occurred"
          actionDetails={actionDetails}
        />
      );

      // Check for the friendly conflict message
      expect(screen.getByText(/Cat Queen and Dog Queen can't be together!/)).toBeInTheDocument();
    });
  });

  describe('Mixed content rendering', () => {
    it('should render both cards and action details', () => {
      const actionDetails = [
        {
          action: 'Discarded cards',
          detail: 'Discarded matching pair and drew 2 new cards'
        }
      ];

      const cards = [
        { id: 'num-1', type: 'number' as const, name: '5', value: 5 },
        { id: 'num-2', type: 'number' as const, name: '5', value: 5 }
      ];

      render(
        <InfoDrawer
          isOpen={true}
          cards={cards}
          message="Discarded matching pair"
          actionDetails={actionDetails}
        />
      );

      // Check the friendly message
      expect(screen.getByText('Discarded matching pair and drew 2 new cards')).toBeInTheDocument();

      // Check main cards display
      const cardComponents = screen.getAllByTestId('card-component');
      expect(cardComponents.length).toBeGreaterThanOrEqual(2); // At least the two main cards
    });
  });
});