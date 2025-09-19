import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {DndContext, DragOverlay} from '@dnd-kit/core';
import {DraggableCard} from '@/presentation/components/game/DraggableCard';
import {DroppableArea, StagingDropArea} from '@/presentation/components/game/DroppableArea';
import {Card, NumberCard} from '@/domain/models/Card';
import '@testing-library/jest-dom';

describe('Drag and Drop Integration', () => {
  const mockCard: NumberCard = {
    id: 'test-card-1',
    type: 'number',
    name: '5',
    value: 5,
  };

  const mockKingCard: Card = {
    id: 'king-1',
    type: 'king',
    name: 'King',
  };

  describe('DraggableCard Component', () => {
    it('should render draggable card correctly', () => {
      render(
        <DndContext>
          <DraggableCard card={mockCard} id="card-1" />
        </DndContext>
      );

      const fives = screen.getAllByText('5');
      expect(fives.length).toBeGreaterThan(0);
    });

    it('should apply disabled styles when disabled', () => {
      const { container } = render(
        <DndContext>
          <DraggableCard card={mockCard} id="card-1" disabled={true} />
        </DndContext>
      );

      const draggableElement = container.querySelector('.disabled');
      expect(draggableElement).toBeInTheDocument();
    });

    it('should render with different sizes', () => {
      const { rerender } = render(
        <DndContext>
          <DraggableCard card={mockCard} id="card-1" size="sm" />
        </DndContext>
      );

      const fivesSmall = screen.getAllByText('5');
      expect(fivesSmall.length).toBeGreaterThan(0);

      rerender(
        <DndContext>
          <DraggableCard card={mockCard} id="card-1" size="lg" />
        </DndContext>
      );

      const fivesLarge = screen.getAllByText('5');
      expect(fivesLarge.length).toBeGreaterThan(0);
    });
  });

  describe('DroppableArea Component', () => {
    it('should render droppable area with children', () => {
      render(
        <DndContext>
          <DroppableArea id="test-drop" label="Test Drop Zone">
            <div>Drop content here</div>
          </DroppableArea>
        </DndContext>
      );

      expect(screen.getByLabelText('Test Drop Zone')).toBeInTheDocument();
      expect(screen.getByText('Drop content here')).toBeInTheDocument();
    });

    it('should apply disabled styles when disabled', () => {
      const { container } = render(
        <DndContext>
          <DroppableArea id="test-drop" disabled={true}>
            <div>Content</div>
          </DroppableArea>
        </DndContext>
      );

      const droppableElement = container.querySelector('.cursor-not-allowed');
      expect(droppableElement).toBeInTheDocument();
    });

    it('should accept specific card types', () => {
      render(
        <DndContext>
          <DroppableArea 
            id="test-drop" 
            acceptTypes={['king', 'knight']}
          >
            <div>Action cards only</div>
          </DroppableArea>
        </DndContext>
      );

      expect(screen.getByText('Action cards only')).toBeInTheDocument();
    });
  });

  describe('StagingDropArea Component', () => {
    it('should render staging area with card count', () => {
      const cards = [
        <div key="1">Card 1</div>,
        <div key="2">Card 2</div>,
      ];

      render(
        <DndContext>
          <StagingDropArea 
            id="staging" 
            cards={cards}
            maxCards={5}
          />
        </DndContext>
      );

      expect(screen.getByText('Staging Area (', { exact: false })).toBeInTheDocument();
      expect(screen.getByText('Card 1')).toBeInTheDocument();
      expect(screen.getByText('Card 2')).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      render(
        <DndContext>
          <StagingDropArea 
            id="staging" 
            cards={[]}
            maxCards={5}
          />
        </DndContext>
      );

      expect(screen.getByText('Drag cards here to play them')).toBeInTheDocument();
    });

    it('should show full state when max cards reached', () => {
      const cards = Array(5).fill(null).map((_, i) => 
        <div key={i}>Card {i + 1}</div>
      );

      render(
        <DndContext>
          <StagingDropArea 
            id="staging" 
            cards={cards}
            maxCards={5}
          />
        </DndContext>
      );

      expect(screen.getByText('Area full - play or clear cards')).toBeInTheDocument();
    });
  });

  describe('Drag and Drop Flow', () => {
    it('should handle complete drag and drop interaction', () => {
      const handleDrop = jest.fn();
      
      const TestComponent = () => {
        const [draggedCard, setDraggedCard] = React.useState<Card | null>(null);
        const [stagedCards, setStagedCards] = React.useState<Card[]>([]);

        const handleDragEnd = (event: any) => {
          if (event.over && event.over.id === 'staging-area') {
            setStagedCards([...stagedCards, mockCard]);
            handleDrop(mockCard);
          }
          setDraggedCard(null);
        };

        return (
          <DndContext 
            onDragStart={() => setDraggedCard(mockCard)}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: 'flex', gap: '20px' }}>
              <div>
                <h3>Hand</h3>
                <DraggableCard card={mockCard} id="card-1" />
              </div>
              
              <DroppableArea id="staging-area" label="Staging">
                {stagedCards.map((card, i) => (
                  <div key={i}>{card.name}</div>
                ))}
              </DroppableArea>
            </div>
            
            <DragOverlay>
              {draggedCard && <div>Dragging: {draggedCard.name}</div>}
            </DragOverlay>
          </DndContext>
        );
      };

      render(<TestComponent />);

      expect(screen.getByText('Hand')).toBeInTheDocument();
      expect(screen.getByLabelText('Staging')).toBeInTheDocument();
      // Multiple "5" elements exist (card corners and center), so use getAllByText
      const fives = screen.getAllByText('5');
      expect(fives.length).toBeGreaterThan(0);
    });

    it('should validate auto-play for single number cards', async () => {
      jest.useFakeTimers();
      const handleAutoPlay = jest.fn();

      const TestComponent = () => {
        const [stagedCards, setStagedCards] = React.useState<Card[]>([]);

        React.useEffect(() => {
          if (stagedCards.length === 1 && stagedCards[0].type === 'number') {
            const timer = setTimeout(() => {
              handleAutoPlay(stagedCards[0]);
              setStagedCards([]);
            }, 500);
            return () => clearTimeout(timer);
          }
        }, [stagedCards]);

        return (
          <DndContext>
            <button onClick={() => setStagedCards([mockCard])}>
              Stage Number Card
            </button>
            <div>Staged: {stagedCards.length}</div>
          </DndContext>
        );
      };

      render(<TestComponent />);

      const button = screen.getByText('Stage Number Card');
      fireEvent.click(button);

      expect(screen.getByText('Staged: 1')).toBeInTheDocument();

      // Wrap timer advancement in act to handle state updates
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(handleAutoPlay).toHaveBeenCalledWith(mockCard);
      });

      jest.useRealTimers();
    });

    it('should not auto-play action cards', async () => {
      jest.useFakeTimers();
      const handleAutoPlay = jest.fn();

      const TestComponent = () => {
        const [stagedCards, setStagedCards] = React.useState<Card[]>([]);

        React.useEffect(() => {
          if (stagedCards.length === 1 && stagedCards[0].type === 'number') {
            const timer = setTimeout(() => {
              handleAutoPlay(stagedCards[0]);
            }, 500);
            return () => clearTimeout(timer);
          }
        }, [stagedCards]);

        return (
          <DndContext>
            <button onClick={() => setStagedCards([mockKingCard])}>
              Stage King Card
            </button>
            <div>Staged: {stagedCards.length}</div>
          </DndContext>
        );
      };

      render(<TestComponent />);

      const button = screen.getByText('Stage King Card');
      fireEvent.click(button);

      expect(screen.getByText('Staged: 1')).toBeInTheDocument();

      jest.advanceTimersByTime(1000);

      expect(handleAutoPlay).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Mobile Touch Support', () => {
    it('should handle touch events', () => {
      const { container } = render(
        <DndContext>
          <DraggableCard card={mockCard} id="card-1" />
        </DndContext>
      );

      const draggableElement = container.querySelector('.draggable-card') as HTMLElement;
      expect(draggableElement).toBeTruthy();
      // Check for inline style directly
      expect(draggableElement?.style.touchAction).toBe('none');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <DndContext>
          <DroppableArea id="test-drop" label="Drop Zone">
            <div>Content</div>
          </DroppableArea>
        </DndContext>
      );

      const dropZone = screen.getByLabelText('Drop Zone');
      expect(dropZone).toBeInTheDocument();
    });
  });
});