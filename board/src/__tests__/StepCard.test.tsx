import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { StepCard } from '../components/StepCard';
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
  stepName: 'refactor-server',
  displayColumn: 'in_progress',
  fileCount: 1,
  files: ['server/index.ts'],
  reviewCount: 0,
  usesWorktree: false,
  isBlocked: false,
  teammateId: null,
  dependencyCount: 0,
  conflictsWith: [],
};

describe('StepCard', () => {
  it('displays step name as primary title with prominent font weight', () => {
    render(<StepCard card={baseCard} />);
    const title = screen.getByText('refactor-server');
    expect(title).toBeInTheDocument();
    expect(title.className).toMatch(/font-(medium|semibold|bold)/);
  });

  it('displays file count in metadata chip with pill styling', () => {
    render(<StepCard card={baseCard} />);
    const fileChip = screen.getByText('1 file');
    expect(fileChip).toBeInTheDocument();
    expect(fileChip.className).toMatch(/text-xs/);
    expect(fileChip.className).toMatch(/bg-gray-800/);
  });

  it('displays plural files label for multiple files in chip', () => {
    const card = { ...baseCard, fileCount: 3, files: ['a.ts', 'b.ts', 'c.ts'] };
    render(<StepCard card={card} />);
    expect(screen.getByText('3 files')).toBeInTheDocument();
  });

  it('displays zero files label in chip when no files', () => {
    const card = { ...baseCard, fileCount: 0, files: [] };
    render(<StepCard card={card} />);
    expect(screen.getByText('0 files')).toBeInTheDocument();
  });

  describe('teammate emoji footer', () => {
    it('shows step ID right-aligned in footer with monospace font when no teammate', () => {
      render(<StepCard card={baseCard} />);
      const footer = screen.getByTestId('card-footer');
      const stepId = screen.getByText('01-04');
      expect(footer).toContainElement(stepId);
      expect(stepId.className).toMatch(/font-mono/);
      expect(footer.className).toMatch(/justify-between/);
    });

    it('shows emoji and colored teammate name when teammateId is set', () => {
      render(<StepCard card={{ ...baseCard, teammateId: 'crafter-01' }} />);
      const footer = screen.getByTestId('card-footer');
      // Should show role-based emoji + name
      expect(footer.textContent).toMatch(/🛠️\s*crafter-01/);
    });

    it('shows both teammate and step ID in footer row when teammate present', () => {
      render(<StepCard card={{ ...baseCard, teammateId: 'crafter-01' }} />);
      const footer = screen.getByTestId('card-footer');
      expect(footer).toContainElement(screen.getByText(/crafter-01/));
      expect(footer).toContainElement(screen.getByText('01-04'));
      expect(footer.className).toMatch(/justify-between/);
    });

    it('hides teammate in done column', () => {
      render(<StepCard card={{ ...baseCard, displayColumn: 'done', teammateId: 'bob' }} />);
      expect(screen.queryByText(/bob/)).not.toBeInTheDocument();
      expect(screen.getByTestId('card-footer')).toBeInTheDocument();
    });
  });

  it('does not render review count badge even when reviewCount > 0', () => {
    const card = { ...baseCard, reviewCount: 3 };
    render(<StepCard card={card} />);
    expect(screen.queryByText(/reviews?$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/3 review/)).not.toBeInTheDocument();
  });

  it.each([
    { usesWorktree: true, visible: true },
    { usesWorktree: false, visible: false },
  ])('worktree badge: usesWorktree=$usesWorktree', ({ usesWorktree, visible }) => {
    const card = { ...baseCard, usesWorktree };
    render(<StepCard card={card} />);
    if (visible) {
      expect(screen.getByText('worktree')).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/worktree/i)).not.toBeInTheDocument();
    }
  });

  it.each([
    { isBlocked: true, visible: true },
    { isBlocked: false, visible: false },
  ])('blocked badge: isBlocked=$isBlocked', ({ isBlocked, visible }) => {
    const card = { ...baseCard, isBlocked };
    render(<StepCard card={card} />);
    if (visible) {
      expect(screen.getByText('blocked')).toBeInTheDocument();
    } else {
      expect(screen.queryByText(/blocked/i)).not.toBeInTheDocument();
    }
  });

  it('has data-testid step-card on root element', () => {
    render(<StepCard card={baseCard} />);
    expect(screen.getByTestId('step-card')).toBeInTheDocument();
  });

  it('applies animation classes from displayColumn', () => {
    render(<StepCard card={{ ...baseCard, displayColumn: 'in_progress' }} />);
    expect(screen.getByTestId('step-card')).toHaveClass('animate-pulse-glow');
  });

  it('shows teammate in footer when teammateId is set, footer always present', () => {
    const { unmount } = render(<StepCard card={{ ...baseCard, teammateId: 'crafter-03' }} />);
    expect(screen.getByText(/crafter-03/)).toBeInTheDocument();
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
    unmount();

    render(<StepCard card={baseCard} />);
    expect(screen.getByTestId('card-footer')).toBeInTheDocument();
  });

  it('calls onCardClick with stepId when card is clicked', () => {
    const onCardClick = vi.fn();
    render(<StepCard card={baseCard} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByTestId('step-card'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledWith('01-04');
  });

  it('applies cursor-pointer when onCardClick is provided', () => {
    const onCardClick = vi.fn();
    render(<StepCard card={baseCard} onCardClick={onCardClick} />);
    expect(screen.getByTestId('step-card').className).toMatch(/cursor-pointer/);
  });

  it('does not apply cursor-pointer when onCardClick is not provided', () => {
    render(<StepCard card={baseCard} />);
    expect(screen.getByTestId('step-card').className).not.toMatch(/cursor-pointer/);
  });

  describe('metadata chips', () => {
    it('displays file chip with emoji and pill styling', () => {
      const card = { ...baseCard, fileCount: 5 };
      render(<StepCard card={card} />);
      const fileChip = screen.getByText('5 files');
      expect(fileChip).toBeInTheDocument();
      expect(fileChip.className).toMatch(/bg-gray-800/);
      expect(fileChip.className).toMatch(/rounded-full/);
    });

    it('displays dep chip with emoji and pill styling when dependencyCount > 0', () => {
      const card = { ...baseCard, dependencyCount: 3 };
      render(<StepCard card={card} />);
      const depChip = screen.getByText('🔗 3 deps');
      expect(depChip).toBeInTheDocument();
      expect(depChip.className).toMatch(/bg-gray-800/);
      expect(depChip.className).toMatch(/rounded-full/);
    });

    it('hides dep chip when dependencyCount is 0', () => {
      const card = { ...baseCard, dependencyCount: 0 };
      render(<StepCard card={card} />);
      expect(screen.queryByText(/🔗/)).not.toBeInTheDocument();
    });

    it.each([
      { fileCount: 1, expected: '1 file' },
      { fileCount: 0, expected: '0 files' },
      { fileCount: 10, expected: '10 files' },
    ])('file chip shows singular/plural: $expected', ({ fileCount, expected }) => {
      const card = { ...baseCard, fileCount };
      render(<StepCard card={card} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
    });

    it.each([
      { dependencyCount: 1, expected: '🔗 1 dep' },
      { dependencyCount: 5, expected: '🔗 5 deps' },
    ])('dep chip shows singular/plural: $expected', ({ dependencyCount, expected }) => {
      const card = { ...baseCard, dependencyCount };
      render(<StepCard card={card} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  });

  describe('conflict badge', () => {
    it('displays conflicts badge with count when conflictsWith is non-empty', () => {
      const card = { ...baseCard, conflictsWith: ['02-01', '02-02'] };
      render(<StepCard card={card} />);
      expect(screen.getByText('conflicts: 2')).toBeInTheDocument();
    });

    it('does not display conflicts badge when conflictsWith is empty', () => {
      const card = { ...baseCard, conflictsWith: [] };
      render(<StepCard card={card} />);
      expect(screen.queryByText(/conflicts:/)).not.toBeInTheDocument();
    });

    it('displays singular count for single conflict', () => {
      const card = { ...baseCard, conflictsWith: ['02-01'] };
      render(<StepCard card={card} />);
      expect(screen.getByText('conflicts: 1')).toBeInTheDocument();
    });

    it('hides conflicts badge when displayColumn is done regardless of conflict data', () => {
      const card = { ...baseCard, displayColumn: 'done' as const, conflictsWith: ['02-01', '02-02'] };
      render(<StepCard card={card} />);
      expect(screen.queryByText(/conflicts:/)).not.toBeInTheDocument();
    });

    it('hides worktree badge when displayColumn is done', () => {
      const card = { ...baseCard, displayColumn: 'done' as const, usesWorktree: true };
      render(<StepCard card={card} />);
      expect(screen.queryByText('worktree')).not.toBeInTheDocument();
    });

    it('hides blocked badge when displayColumn is done', () => {
      const card = { ...baseCard, displayColumn: 'done' as const, isBlocked: true };
      render(<StepCard card={card} />);
      expect(screen.queryByText('blocked')).not.toBeInTheDocument();
    });

    it('shows conflicts badge with amber/warning styling', () => {
      const card = { ...baseCard, conflictsWith: ['02-01'] };
      render(<StepCard card={card} />);
      const badge = screen.getByText('conflicts: 1');
      expect(badge.className).toMatch(/amber|orange|yellow/);
    });

    describe('conflict tooltip', () => {
      it('shows tooltip with conflicting step IDs on badge hover', async () => {
        const card = { ...baseCard, conflictsWith: ['02-01', '02-02'] };
        render(<StepCard card={card} />);
        const badge = screen.getByText('conflicts: 2');
        fireEvent.mouseEnter(badge);
        expect(screen.getByRole('tooltip')).toHaveTextContent('Conflicts with: 02-01, 02-02');
      });

      it('hides tooltip on mouse leave', async () => {
        const card = { ...baseCard, conflictsWith: ['02-01'] };
        render(<StepCard card={card} />);
        const badge = screen.getByText('conflicts: 1');
        fireEvent.mouseEnter(badge);
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        fireEvent.mouseLeave(badge);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('conflict highlight', () => {
    it('applies highlight styling when isHighlighted is true', () => {
      const card = { ...baseCard, conflictsWith: ['02-01'] };
      render(<StepCard card={card} isHighlighted={true} />);
      const stepCard = screen.getByTestId('step-card');
      expect(stepCard.className).toMatch(/ring-2|ring-amber|border-amber/);
    });

    it('does not apply highlight styling when isHighlighted is false', () => {
      const card = { ...baseCard, conflictsWith: ['02-01'] };
      render(<StepCard card={card} isHighlighted={false} />);
      const stepCard = screen.getByTestId('step-card');
      expect(stepCard.className).not.toMatch(/ring-amber/);
    });

    it('does not apply highlight styling when isHighlighted is undefined', () => {
      const card = { ...baseCard, conflictsWith: ['02-01'] };
      render(<StepCard card={card} />);
      const stepCard = screen.getByTestId('step-card');
      expect(stepCard.className).not.toMatch(/ring-amber/);
    });
  });

  describe('tall card layout', () => {
    it('has minimum height of 160px', () => {
      render(<StepCard card={baseCard} />);
      expect(screen.getByTestId('step-card').className).toMatch(/min-h-\[160px\]/);
    });

    it('uses flex-col layout', () => {
      render(<StepCard card={baseCard} />);
      expect(screen.getByTestId('step-card').className).toMatch(/flex/);
      expect(screen.getByTestId('step-card').className).toMatch(/flex-col/);
    });

    it('has no left border', () => {
      render(<StepCard card={baseCard} />);
      expect(screen.getByTestId('step-card').className).not.toMatch(/border-l/);
    });

    it('allows step name to wrap instead of truncate', () => {
      render(<StepCard card={baseCard} />);
      const stepName = screen.getByText('refactor-server');
      expect(stepName.className).not.toMatch(/truncate/);
    });

    it.each([
      { displayColumn: 'pending', expectedBorder: 'border-t-gray-500' },
      { displayColumn: 'in_progress', expectedBorder: 'border-t-yellow-400' },
      { displayColumn: 'review', expectedBorder: 'border-t-violet-400' },
      { displayColumn: 'done', expectedBorder: 'border-t-green-400' },
    ] as const)('has 4px top border with $displayColumn status color', ({ displayColumn, expectedBorder }) => {
      const card = { ...baseCard, displayColumn };
      render(<StepCard card={card} />);
      const stepCard = screen.getByTestId('step-card');
      expect(stepCard.className).toMatch(/border-t-4/);
      expect(stepCard.className).toContain(expectedBorder);
    });
  });

});
