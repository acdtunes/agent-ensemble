import { describe, it, expect } from 'vitest';
import { getCardAnimationClasses } from '../utils/animationClasses';
import { DISPLAY_COLUMNS, type DisplayColumn } from '../utils/statusMapping';

describe('getCardAnimationClasses', () => {
  it('includes transition classes for all display columns', () => {
    for (const column of DISPLAY_COLUMNS) {
      const classes = getCardAnimationClasses(column);
      expect(classes).toContain('transition-all');
      expect(classes).toContain('duration-300');
      expect(classes).toContain('ease-in-out');
    }
  });

  it('includes pulse-glow animation for in_progress column', () => {
    const classes = getCardAnimationClasses('in_progress');
    expect(classes).toContain('animate-pulse-glow');
  });

  it('excludes pulse-glow animation for non-in_progress columns', () => {
    const others: DisplayColumn[] = ['pending', 'review', 'done'];
    for (const column of others) {
      const classes = getCardAnimationClasses(column);
      expect(classes).not.toContain('animate-pulse-glow');
    }
  });

  it('includes hover brightness for interactive cards', () => {
    const classes = getCardAnimationClasses('pending');
    expect(classes).toContain('hover:brightness-110');
  });
});
