import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusLabel, getStatusTopBarColor } from '../utils/statusColors';
import { DISPLAY_COLUMNS } from '../utils/statusMapping';

describe('status color utilities', () => {
  it('getStatusColor returns valid color object for all columns', () => {
    DISPLAY_COLUMNS.forEach((column) => {
      const color = getStatusColor(column);
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('text');
      expect(color).toHaveProperty('headerBg');
    });
  });

  it('getStatusLabel returns non-empty string for all columns', () => {
    DISPLAY_COLUMNS.forEach((column) => {
      const label = getStatusLabel(column);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it('getStatusTopBarColor returns non-empty string for all columns', () => {
    DISPLAY_COLUMNS.forEach((column) => {
      const color = getStatusTopBarColor(column);
      expect(typeof color).toBe('string');
      expect(color.length).toBeGreaterThan(0);
    });
  });
});
