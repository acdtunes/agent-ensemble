import { describe, it, expect } from 'vitest';
import { getTeammateColor, TEAMMATE_PALETTE } from '../utils/teammateColors';

describe('TEAMMATE_PALETTE', () => {
  const RESERVED_FAMILIES = ['emerald', 'orange', 'red', 'indigo'];

  it('contains no reserved color families', () => {
    for (const color of TEAMMATE_PALETTE) {
      for (const reserved of RESERVED_FAMILIES) {
        expect(color).not.toContain(reserved);
      }
    }
  });

  it('contains only Tailwind text color classes', () => {
    for (const color of TEAMMATE_PALETTE) {
      expect(color).toMatch(/^text-[a-z]+-\d+$/);
    }
  });

  it('has no duplicates', () => {
    const unique = new Set(TEAMMATE_PALETTE);
    expect(unique.size).toBe(TEAMMATE_PALETTE.length);
  });
});

describe('getTeammateColor', () => {
  it('returns a string from the palette', () => {
    const color = getTeammateColor('crafter-01');
    expect(TEAMMATE_PALETTE).toContain(color);
  });

  it('is deterministic — same input always produces same output', () => {
    const first = getTeammateColor('agent-alpha');
    const second = getTeammateColor('agent-alpha');
    expect(first).toBe(second);
  });

  it('produces different colors for distinct inputs', () => {
    const ids = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    const colors = ids.map(getTeammateColor);
    const unique = new Set(colors);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('handles single-character ids', () => {
    const color = getTeammateColor('a');
    expect(TEAMMATE_PALETTE).toContain(color);
  });

  it('handles long ids', () => {
    const longId = 'crafter-some-very-long-teammate-identifier-12345';
    const color = getTeammateColor(longId);
    expect(TEAMMATE_PALETTE).toContain(color);
  });
});
