import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FirstPlayerAnimation } from '../FirstPlayerAnimation';

describe('FirstPlayerAnimation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render when visible', () => {
    render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="Alice"
        onComplete={() => {}}
      />
    );

    expect(screen.getByText('Rolling for First Player...')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <FirstPlayerAnimation
        isVisible={false}
        playerName="Alice"
        onComplete={() => {}}
      />
    );

    expect(container.querySelector('.fixed')).not.toBeInTheDocument();
  });

  it('should show player name after dice roll', () => {
    render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="Bob"
        onComplete={() => {}}
      />
    );

    // Initially shows "Rolling for First Player..."
    expect(screen.getByText('Rolling for First Player...')).toBeInTheDocument();

    // After 2 seconds, should show the result
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('First Player Selected!')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('goes first!')).toBeInTheDocument();
  });

  it('should call onComplete after animation finishes', () => {
    const onComplete = jest.fn();

    render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="Charlie"
        onComplete={onComplete}
      />
    );

    // Animation runs for 2 seconds, then shows result for 3 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('should display dice icon during rolling', () => {
    const { container } = render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="David"
        onComplete={() => {}}
      />
    );

    // Should have a dice icon (one of the Lucide dice icons)
    const diceIcon = container.querySelector('svg');
    expect(diceIcon).toBeInTheDocument();
  });

  it('should show "The dice have spoken!" message after roll', () => {
    render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="Eve"
        onComplete={() => {}}
      />
    );

    // After dice roll completes
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    expect(screen.getByText('The dice have spoken!')).toBeInTheDocument();
  });

  it('should cleanup timers on unmount', () => {
    const onComplete = jest.fn();

    const { unmount } = render(
      <FirstPlayerAnimation
        isVisible={true}
        playerName="Frank"
        onComplete={onComplete}
      />
    );

    // Unmount before animation completes
    unmount();

    // Advance timers - onComplete should not be called
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});