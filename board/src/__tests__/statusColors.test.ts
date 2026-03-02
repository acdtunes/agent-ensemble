import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusLabel } from '../utils/statusColors';
import { DISPLAY_COLUMNS, type DisplayColumn } from '../utils/statusMapping';

describe('getStatusColor', () => {
  it('returns color object with bg, border, text, headerBg for all display columns', () => {
    for (const column of DISPLAY_COLUMNS) {
      const color = getStatusColor(column);
      expect(color).toHaveProperty('bg');
      expect(color).toHaveProperty('border');
      expect(color).toHaveProperty('text');
      expect(color).toHaveProperty('headerBg');
    }
  });

  it('returns distinct colors for each display column', () => {
    const colors = DISPLAY_COLUMNS.map((col) => getStatusColor(col));
    const uniqueBgs = new Set(colors.map((c) => c.bg));
    expect(uniqueBgs.size).toBe(DISPLAY_COLUMNS.length);
  });

  it('uses yellow tones for in_progress column', () => {
    const color = getStatusColor('in_progress');
    expect(color.bg).toContain('yellow');
  });

  it('uses green tones for done column', () => {
    const color = getStatusColor('done');
    expect(color.bg).toContain('green');
  });
});

describe('getStatusLabel', () => {
  it('returns human-readable labels for all display columns', () => {
    const expectedLabels: Record<DisplayColumn, string> = {
      pending: 'Pending',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
    };

    for (const column of DISPLAY_COLUMNS) {
      expect(getStatusLabel(column)).toBe(expectedLabels[column]);
    }
  });

  it('does not return legacy labels (Claimed, Approved, Failed)', () => {
    const allLabels = DISPLAY_COLUMNS.map(getStatusLabel);
    expect(allLabels).not.toContain('Claimed');
    expect(allLabels).not.toContain('Approved');
    expect(allLabels).not.toContain('Failed');
  });
});
