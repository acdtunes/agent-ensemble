import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  StatusGroupHeader,
  formatGroupLabel,
} from '../components/StatusGroupHeader';

afterEach(cleanup);

// ================================================================
// Pure function: formatGroupLabel
// ================================================================

describe('formatGroupLabel', () => {
  it.each([
    ['Active', 3, 'Active (3)'],
    ['Completed', 0, 'Completed (0)'],
    ['Planned', 15, 'Planned (15)'],
  ])('formats "%s" with count %d as "%s"', (groupName, count, expected) => {
    expect(formatGroupLabel(groupName, count)).toBe(expected);
  });
});

// ================================================================
// StatusGroupHeader component
// ================================================================

describe('StatusGroupHeader', () => {
  it('displays group name with count in parentheses', () => {
    render(<StatusGroupHeader groupName="Active" count={3} />);
    expect(screen.getByText('Active (3)')).toBeInTheDocument();
  });

  it('renders as a heading element for accessibility', () => {
    render(<StatusGroupHeader groupName="Completed" count={5} />);
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('applies full-width grid span styling', () => {
    render(<StatusGroupHeader groupName="Planned" count={2} />);
    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toHaveClass('col-span-full');
  });

  it('visually distinguishes with distinct background and typography', () => {
    render(<StatusGroupHeader groupName="Active" count={1} />);
    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toHaveClass('bg-gray-800/50');
    expect(header).toHaveClass('text-gray-200');
  });
});
