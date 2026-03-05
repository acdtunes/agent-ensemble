import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StatusGroupHeader, formatGroupLabel } from '../components/StatusGroupHeader';

afterEach(cleanup);

describe('formatGroupLabel', () => {
  it.each([
    ['Active', 3, 'Active (3)'],
    ['Completed', 0, 'Completed (0)'],
  ])('formats "%s" with count %d as "%s"', (groupName, count, expected) => {
    expect(formatGroupLabel(groupName, count)).toBe(expected);
  });
});

describe('StatusGroupHeader', () => {
  it('renders as accessible heading with group name and count', () => {
    render(<StatusGroupHeader groupName="Active" count={3} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Active (3)');
  });
});
