/**
 * Tests for StatusFilterControls — toggle button group for status filtering.
 *
 * Driving port: StatusFilterControls component
 * Test Budget: 3 behaviors × 2 = 6 max unit tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatusFilterControls } from '../components/StatusFilterControls';
import type { StatusFilterOption } from '../utils/featureStatusFilter';

afterEach(cleanup);

const testOptions: readonly StatusFilterOption[] = [
  { value: 'all', label: 'All', count: 10 },
  { value: 'active', label: 'Active', count: 4 },
  { value: 'planned', label: 'Planned', count: 3 },
  { value: 'completed', label: 'Completed', count: 3 },
];

describe('StatusFilterControls', () => {
  // --- Behavior 1: Renders all options with labels and counts ---
  it('renders all filter options with labels and counts', () => {
    render(
      <StatusFilterControls
        options={testOptions}
        selected="all"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'All (10)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active (4)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planned (3)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Completed (3)' })).toBeInTheDocument();
  });

  // --- Behavior 2: Selected option is visually distinct (aria-pressed) ---
  it('marks selected option with aria-pressed="true"', () => {
    render(
      <StatusFilterControls
        options={testOptions}
        selected="active"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'All (10)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Active (4)' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Planned (3)' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Completed (3)' })).toHaveAttribute('aria-pressed', 'false');
  });

  // --- Behavior 3: Clicking option calls onSelect with value ---
  it('calls onSelect with filter value when clicked', () => {
    const onSelect = vi.fn();
    render(
      <StatusFilterControls
        options={testOptions}
        selected="all"
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Planned (3)' }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith('planned');
  });

  // --- Behavior 4: Group has accessible label ---
  it('has accessible group label', () => {
    render(
      <StatusFilterControls
        options={testOptions}
        selected="all"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('group', { name: 'Filter by status' })).toBeInTheDocument();
  });
});
