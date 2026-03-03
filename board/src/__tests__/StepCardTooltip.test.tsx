import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StepCardTooltip } from '../components/StepCardTooltip';
import type { StepCardData } from '../utils/statusMapping';

afterEach(cleanup);

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const baseCard: StepCardData = {
  stepId: '01-04',
  stepName: 'refactor-server-authentication-module',
  displayColumn: 'in_progress',
  fileCount: 3,
  files: ['server/auth.ts', 'server/middleware.ts', 'server/types.ts'],
  reviewCount: 2,
  worktree: false,
  isBlocked: false,
  teammateId: null,
  dependencyCount: 0,
};

describe('StepCardTooltip', () => {
  describe('content display', () => {
    it('shows full step name without truncation', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent('refactor-server-authentication-module');
      // Verify it's not truncated (no ellipsis styling)
      expect(tooltip.querySelector('[class*="truncate"]')).not.toBeInTheDocument();
    });

    it('lists all files from files array', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      expect(screen.getByText('server/auth.ts')).toBeInTheDocument();
      expect(screen.getByText('server/middleware.ts')).toBeInTheDocument();
      expect(screen.getByText('server/types.ts')).toBeInTheDocument();
    });

    it('shows dependency count', async () => {
      const cardWithDeps: StepCardData = {
        ...baseCard,
        dependencyCount: 3,
      };

      render(
        <StepCardTooltip card={cardWithDeps}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      expect(screen.getByText(/3 dependenc/i)).toBeInTheDocument();
    });

    it('shows review count', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      expect(screen.getByText(/2 review/i)).toBeInTheDocument();
    });
  });

  describe('hover behavior', () => {
    it('appears after 300ms hover delay', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));

      // Before 300ms - tooltip should not be visible
      act(() => { vi.advanceTimersByTime(299); });
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

      // At 300ms - tooltip should appear
      act(() => { vi.advanceTimersByTime(1); });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });

    it('dismisses on mouse leave', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.mouseLeave(screen.getByRole('button'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('cancels pending tooltip if mouse leaves before delay completes', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(200); });
      fireEvent.mouseLeave(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(200); });

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty files array gracefully', async () => {
      const emptyFilesCard: StepCardData = {
        ...baseCard,
        files: [],
        fileCount: 0,
      };

      render(
        <StepCardTooltip card={emptyFilesCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('refactor-server-authentication-module');
    });

    it('shows zero dependency count when no dependencies', async () => {
      render(
        <StepCardTooltip card={baseCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      expect(screen.getByText(/0 dependenc/i)).toBeInTheDocument();
    });

    it('shows zero reviews when reviewCount is 0', async () => {
      const noReviewsCard: StepCardData = {
        ...baseCard,
        reviewCount: 0,
      };

      render(
        <StepCardTooltip card={noReviewsCard}>
          <button>Trigger</button>
        </StepCardTooltip>
      );

      fireEvent.mouseEnter(screen.getByRole('button'));
      act(() => { vi.advanceTimersByTime(300); });

      expect(screen.getByText(/0 review/i)).toBeInTheDocument();
    });
  });
});
