import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DefenseNotification } from '../DefenseNotification';

describe('DefenseNotification', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render dragon defense notification', () => {
    render(
      <DefenseNotification
        isVisible={true}
        defenderName="Alice"
        attackerName="Bob"
        defenseType="dragon"
        targetQueenName="Rose Queen"
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Alice played a Dragon to block Bob's Knight attack on Rose Queen!")).toBeInTheDocument();
    expect(screen.getByText('🐉 Dragon Defense!')).toBeInTheDocument();
    expect(screen.getByText('The attack was successfully blocked!')).toBeInTheDocument();
  });

  it('should render wand defense notification', () => {
    render(
      <DefenseNotification
        isVisible={true}
        defenderName="Charlie"
        attackerName="David"
        defenseType="wand"
        targetQueenName="Cat Queen"
        onDismiss={() => {}}
      />
    );

    expect(screen.getByText("Charlie played a Magic Wand to block David's Sleeping Potion on Cat Queen!")).toBeInTheDocument();
    expect(screen.getByText('✨ Magic Wand Defense!')).toBeInTheDocument();
    expect(screen.getByText('The attack was successfully blocked!')).toBeInTheDocument();
  });

  it('should have dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();

    render(
      <DefenseNotification
        isVisible={true}
        defenderName="Alice"
        attackerName="Bob"
        defenseType="dragon"
        targetQueenName="Rose Queen"
        onDismiss={onDismiss}
      />
    );

    // Should have a dismiss button
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
  });

  it('should not render when isVisible is false', () => {
    const { container } = render(
      <DefenseNotification
        isVisible={false}
        defenderName="Alice"
        attackerName="Bob"
        defenseType="dragon"
        targetQueenName="Rose Queen"
        onDismiss={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });

});