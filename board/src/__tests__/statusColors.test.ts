import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusLabel, getStatusTopBarColor } from '../utils/statusColors';
import { DISPLAY_COLUMNS } from '../utils/statusMapping';

describe('status color utilities', () => {
  it.each(DISPLAY_COLUMNS)('getStatusColor returns color object for %s', (column) => {
    const color = getStatusColor(column);
    expect(color).toHaveProperty('bg');
    expect(color).toHaveProperty('border');
    expect(color).toHaveProperty('text');
    expect(color).toHaveProperty('headerBg');
  });

  it.each([
    ['pending', 'Pending'],
    ['in_progress', 'In Progress'],
    ['review', 'Review'],
    ['done', 'Done'],
  ] as const)('getStatusLabel(%s) = %s', (column, expected) => {
    expect(getStatusLabel(column)).toBe(expected);
  });

  it.each(DISPLAY_COLUMNS)('getStatusTopBarColor returns string for %s', (column) => {
    expect(typeof getStatusTopBarColor(column)).toBe('string');
    expect(getStatusTopBarColor(column).length).toBeGreaterThan(0);
  });
});
