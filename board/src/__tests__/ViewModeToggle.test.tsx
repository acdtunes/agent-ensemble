/**
 * Tests for ViewModeToggle — card/list view toggle control.
 *
 * Driving port: ViewModeToggle component
 * Test Budget: 2 behaviors × 2 = 4 max unit tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ViewModeToggle } from '../components/ViewModeToggle';

afterEach(cleanup);

describe('ViewModeToggle', () => {
  // --- Behavior 1: Renders both mode buttons with aria-pressed state ---
  it.each([
    ['card' as const, 'Card', 'List'],
    ['list' as const, 'List', 'Card'],
  ])(
    'renders %s mode as pressed, other as unpressed',
    (mode, pressedLabel, unpressedLabel) => {
      render(<ViewModeToggle mode={mode} onToggle={vi.fn()} />);

      expect(screen.getByRole('button', { name: pressedLabel })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(screen.getByRole('button', { name: unpressedLabel })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    },
  );

  // --- Behavior 2: Calls onToggle with correct mode value ---
  it('calls onToggle with mode value when button clicked', () => {
    const onToggle = vi.fn();
    render(<ViewModeToggle mode="card" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(onToggle).toHaveBeenCalledWith('list');

    fireEvent.click(screen.getByRole('button', { name: 'Card' }));
    expect(onToggle).toHaveBeenCalledWith('card');
  });

  // --- Behavior 3: Accessible group label ---
  it('has accessible group label', () => {
    render(<ViewModeToggle mode="card" onToggle={vi.fn()} />);

    expect(screen.getByRole('group', { name: 'View mode' })).toBeInTheDocument();
  });

  // --- Behavior 4: Pointer cursor on buttons ---
  it('has cursor-pointer on both toggle buttons', () => {
    render(<ViewModeToggle mode="card" onToggle={vi.fn()} />);

    const cardButton = screen.getByRole('button', { name: 'Card' });
    const listButton = screen.getByRole('button', { name: 'List' });

    expect(cardButton).toHaveClass('cursor-pointer');
    expect(listButton).toHaveClass('cursor-pointer');
  });
});
