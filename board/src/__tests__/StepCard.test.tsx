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
  it('displays step name and step ID', () => {
    render(<StepCard card={baseCard} />);
    expect(screen.getByText('refactor-server')).toBeInTheDocument();
    expect(screen.getByText('01-04')).toBeInTheDocument();
  });

  it('calls onCardClick with stepId when card is clicked', () => {
    const onCardClick = vi.fn();
    render(<StepCard card={baseCard} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByTestId('step-card'));
    expect(onCardClick).toHaveBeenCalledWith('01-04');
  });

  describe('badge visibility', () => {
    it.each([
      { prop: 'usesWorktree', value: true, badge: 'worktree' },
      { prop: 'isBlocked', value: true, badge: 'blocked' },
    ] as const)('shows $badge badge when $prop is true', ({ prop, value, badge }) => {
      const card = { ...baseCard, [prop]: value };
      render(<StepCard card={card} />);
      expect(screen.getByText(badge)).toBeInTheDocument();
    });

    it('shows conflicts badge with tooltip when conflictsWith is non-empty', () => {
      const card = { ...baseCard, conflictsWith: ['02-01', '02-02'] };
      render(<StepCard card={card} />);
      expect(screen.getByText('conflicts: 2')).toBeInTheDocument();

      fireEvent.mouseEnter(screen.getByText('conflicts: 2'));
      expect(screen.getByRole('tooltip')).toHaveTextContent('Conflicts with: 02-01, 02-02');
    });

    it('hides badges when displayColumn is done', () => {
      const card = {
        ...baseCard,
        displayColumn: 'done' as const,
        usesWorktree: true,
        isBlocked: true,
        conflictsWith: ['02-01'],
        teammateId: 'bob'
      };
      render(<StepCard card={card} />);
      expect(screen.queryByText('worktree')).not.toBeInTheDocument();
      expect(screen.queryByText('blocked')).not.toBeInTheDocument();
      expect(screen.queryByText(/conflicts:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/bob/)).not.toBeInTheDocument();
    });

    it('shows dependency chip only when dependencyCount > 0', () => {
      render(<StepCard card={{ ...baseCard, dependencyCount: 0 }} />);
      expect(screen.queryByText(/deps?/)).not.toBeInTheDocument();

      cleanup();
      render(<StepCard card={{ ...baseCard, dependencyCount: 3 }} />);
      expect(screen.getByText('🔗 3 deps')).toBeInTheDocument();
    });
  });

  describe('teammate display', () => {
    it('does not display teammate ID or emoji in footer', () => {
      render(<StepCard card={{ ...baseCard, teammateId: 'crafter-01' }} />);
      // Cards should NOT display agent ID or emoji - removed per remove-teammates-section feature
      expect(screen.getByTestId('card-footer').textContent).not.toMatch(/crafter-01/);
      expect(screen.getByTestId('card-footer').textContent).not.toMatch(/🛠️/);
    });
  });

  describe('click-to-copy step ID', () => {
    it('copies step ID to clipboard and shows toast', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });

      render(<StepCard card={baseCard} />);
      fireEvent.click(screen.getByTestId('step-id'));

      expect(writeText).toHaveBeenCalledWith('01-04');
      await act(async () => { await Promise.resolve(); });
      expect(screen.getByRole('status')).toHaveTextContent('Copied 01-04');
    });

    it('does not propagate click to card click handler', () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      const onCardClick = vi.fn();

      render(<StepCard card={baseCard} onCardClick={onCardClick} />);
      fireEvent.click(screen.getByTestId('step-id'));

      expect(writeText).toHaveBeenCalled();
      expect(onCardClick).not.toHaveBeenCalled();
    });
  });
});
