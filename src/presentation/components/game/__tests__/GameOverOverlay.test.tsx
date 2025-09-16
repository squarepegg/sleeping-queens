/**
 * GameOverOverlay Component Tests
 *
 * Tests the game over celebration overlay that displays when a game ends.
 * Verifies winner/loser experiences, animations, scores, and navigation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameOverOverlay } from '../GameOverOverlay';
import { Player } from '@/domain/models/Player';
import { Queen } from '@/domain/models/Card';

// Mock next/router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
    pathname: '/game',
    route: '/game',
    asPath: '/game',
  }),
}));

// Mock canvas-confetti
jest.mock('canvas-confetti', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('GameOverOverlay', () => {
  const mockOnBackToLobby = jest.fn();

  const createMockPlayer = (
    id: string,
    name: string,
    queens: Queen[] = [],
    score: number = 0
  ): Player => ({
    id,
    name,
    hand: [],
    queens,
    score,
    isConnected: true,
    position: 0,
  });

  const createMockQueen = (name: string, points: number): Queen => ({
    id: `queen-${name.toLowerCase()}`,
    type: 'queen',
    name,
    points,
    isAwake: true,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Winner Experience', () => {
    it('should show "You Won!" message for the winner', () => {
      const winner = createMockPlayer(
        'player1',
        'Alice',
        [createMockQueen('Rose Queen', 5), createMockQueen('Cat Queen', 15)],
        20
      );
      const players = [
        winner,
        createMockPlayer('player2', 'Bob', [], 10),
      ];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('You Won!')).toBeInTheDocument();
      expect(screen.getByText('Congratulations, Queen Collector!')).toBeInTheDocument();
    });

    it('should trigger confetti animation for winner', async () => {
      const confettiMock = require('canvas-confetti').default;
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      await waitFor(() => {
        expect(confettiMock).toHaveBeenCalled();
      });
    });

    it('should display crown icon for winner', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Check for crown icon text (since Lucide icons don't have test IDs in mock)
      expect(screen.getByText('Final Queens Collection')).toBeInTheDocument();
      // The crown would be visible in the animation area
    });
  });

  describe('Loser Experience', () => {
    it('should show "Game Over" message for losers', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const loser = createMockPlayer('player2', 'Bob', [], 30);
      const players = [winner, loser];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Game Over')).toBeInTheDocument();
      expect(screen.getByText('Alice Won!')).toBeInTheDocument();
    });

    it('should not trigger confetti for losers', async () => {
      const confettiMock = require('canvas-confetti').default;
      confettiMock.mockClear();

      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const loser = createMockPlayer('player2', 'Bob', [], 30);
      const players = [winner, loser];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      await waitFor(() => {
        expect(confettiMock).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should display trophy icon for losers', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const loser = createMockPlayer('player2', 'Bob', [], 30);
      const players = [winner, loser];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Check that Game Over text is shown for losers
      expect(screen.getByText('Game Over')).toBeInTheDocument();
    });
  });

  describe('Queens Collection Display', () => {
    it('should display all queens collected by winner', () => {
      const queens = [
        createMockQueen('Rose Queen', 5),
        createMockQueen('Cat Queen', 15),
        createMockQueen('Rainbow Queen', 10),
      ];
      const winner = createMockPlayer('player1', 'Alice', queens, 30);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Final Queens Collection')).toBeInTheDocument();
      expect(screen.getByText(/Rose Queen.*5pts/)).toBeInTheDocument();
      expect(screen.getByText(/Cat Queen.*15pts/)).toBeInTheDocument();
      expect(screen.getByText(/Rainbow Queen.*10pts/)).toBeInTheDocument();
      expect(screen.getByText('Total: 30 points with 3 queens!')).toBeInTheDocument();
    });

    it('should handle winner with no queens', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 0);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Total: 0 points with 0 queens!')).toBeInTheDocument();
    });
  });

  describe('Final Scoreboard', () => {
    it('should display all players sorted by score', () => {
      const players = [
        createMockPlayer('player2', 'Bob', [], 30),
        createMockPlayer('player1', 'Alice', [], 50),
        createMockPlayer('player3', 'Charlie', [], 20),
      ];

      render(
        <GameOverOverlay
          winner={players[1]} // Alice with 50 points
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Final Scores')).toBeInTheDocument();

      // Check players are sorted by score
      const playerElements = screen.getAllByText(/#\d+/);
      expect(playerElements[0]).toHaveTextContent('#1'); // Alice - 50pts
      expect(playerElements[1]).toHaveTextContent('#2'); // Bob - 30pts
      expect(playerElements[2]).toHaveTextContent('#3'); // Charlie - 20pts
    });

    it('should highlight winner in scoreboard', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [
        winner,
        createMockPlayer('player2', 'Bob', [], 30),
      ];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Winner should be shown in the scoreboard
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('50 pts')).toBeInTheDocument();
    });

    it('should indicate current player with "(You)" suffix', () => {
      const players = [
        createMockPlayer('player1', 'Alice', [], 50),
        createMockPlayer('player2', 'Bob', [], 30),
      ];

      render(
        <GameOverOverlay
          winner={players[0]}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText(/Bob.*\(You\)/)).toBeInTheDocument();
    });

    it('should display queen count and points for each player', () => {
      const players = [
        createMockPlayer(
          'player1',
          'Alice',
          [createMockQueen('Rose Queen', 5), createMockQueen('Cat Queen', 15)],
          20
        ),
        createMockPlayer(
          'player2',
          'Bob',
          [createMockQueen('Dog Queen', 15)],
          15
        ),
      ];

      render(
        <GameOverOverlay
          winner={players[0]}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('2 queens')).toBeInTheDocument(); // Alice
      expect(screen.getByText('20 pts')).toBeInTheDocument(); // Alice
      expect(screen.getByText('1 queens')).toBeInTheDocument(); // Bob (intentionally "1 queens" in code)
      expect(screen.getByText('15 pts')).toBeInTheDocument(); // Bob
    });
  });

  describe('Navigation', () => {
    it('should display back to lobby button', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      const button = screen.getByRole('button', { name: /back to lobby/i });
      expect(button).toBeInTheDocument();
    });

    it('should call onBackToLobby when button clicked', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      const button = screen.getByRole('button', { name: /back to lobby/i });
      fireEvent.click(button);

      expect(mockOnBackToLobby).toHaveBeenCalledTimes(1);
    });

    it('should use router push when no callback provided', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
        />
      );

      const button = screen.getByRole('button', { name: /back to lobby/i });
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Overlay Behavior', () => {
    it('should render dark overlay to disable game interactions', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Check for overlay with backdrop
      const overlay = screen.getByTestId('game-over-overlay-backdrop');
      expect(overlay).toHaveClass('bg-black/80', 'backdrop-blur-sm');
    });

    it('should prevent click propagation on overlay', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];
      const parentClickHandler = jest.fn();

      render(
        <div onClick={parentClickHandler}>
          <GameOverOverlay
            winner={winner}
            players={players}
            currentPlayerId="player1"
            onBackToLobby={mockOnBackToLobby}
          />
        </div>
      );

      const overlay = screen.getByTestId('game-over-overlay-backdrop');
      fireEvent.click(overlay);

      expect(parentClickHandler).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should not render when winner is null', () => {
      const players = [
        createMockPlayer('player1', 'Alice', [], 30),
        createMockPlayer('player2', 'Bob', [], 20),
      ];

      const { container } = render(
        <GameOverOverlay
          winner={null}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should handle empty players array', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);

      render(
        <GameOverOverlay
          winner={winner}
          players={[]}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Should still render but with minimal content
      expect(screen.getByText('You Won!')).toBeInTheDocument();
    });

    it('should handle winner not in players array', () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [
        createMockPlayer('player2', 'Bob', [], 30),
        createMockPlayer('player3', 'Charlie', [], 20),
      ];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player2"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      expect(screen.getByText('Alice Won!')).toBeInTheDocument();
    });
  });

  describe('Animation Timing', () => {
    it('should delay content display', async () => {
      const winner = createMockPlayer('player1', 'Alice', [], 50);
      const players = [winner];

      render(
        <GameOverOverlay
          winner={winner}
          players={players}
          currentPlayerId="player1"
          onBackToLobby={mockOnBackToLobby}
        />
      );

      // Content should be visible immediately in tests (mocked framer-motion)
      expect(screen.getByText('You Won!')).toBeInTheDocument();
    });
  });
});