import { describe, it, expect } from 'vitest';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { DISPLAY_COLUMNS } from '../utils/statusMapping';

describe('getCardAnimationClasses', () => {
  it('includes pulse-glow animation only for in_progress column', () => {
    expect(getCardAnimationClasses('in_progress')).toContain('animate-pulse-glow');
  });

  it('excludes pulse-glow animation for non-active columns', () => {
    const nonActiveColumns = DISPLAY_COLUMNS.filter((c) => c !== 'in_progress');
    nonActiveColumns.forEach((column) => {
      expect(getCardAnimationClasses(column)).not.toContain('animate-pulse-glow');
    });
  });
});
