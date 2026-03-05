import { describe, it, expect } from 'vitest';
import { getTeammateColor, TEAMMATE_PALETTE } from '../utils/teammateColors';

describe('getTeammateColor', () => {
  it('returns consistent color from palette for any input', () => {
    // Determinism
    expect(getTeammateColor('agent-alpha')).toBe(getTeammateColor('agent-alpha'));

    // Returns valid palette color
    expect(TEAMMATE_PALETTE).toContain(getTeammateColor('crafter-01'));
    expect(TEAMMATE_PALETTE).toContain(getTeammateColor('a'));
    expect(TEAMMATE_PALETTE).toContain(getTeammateColor('very-long-id-12345'));
  });

  it('produces different colors for distinct inputs', () => {
    const colors = ['alpha', 'beta', 'gamma', 'delta'].map(getTeammateColor);
    expect(new Set(colors).size).toBeGreaterThan(1);
  });
});
