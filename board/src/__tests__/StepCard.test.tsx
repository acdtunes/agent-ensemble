import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { FileCard } from '../components/FileCard';
import type { FileCardData } from '../utils/statusMapping';

afterEach(cleanup);

const baseCard: FileCardData = {
  filename: 'server/index.ts',
  stepId: '01-04',
  stepName: 'refactor-server',
  displayColumn: 'in_progress',
  reviewCount: 0,
  worktree: false,
  isBlocked: false,
  teammateId: null,
};

describe('FileCard', () => {
  it('displays step name as primary title with prominent font weight', () => {
    render(<FileCard card={baseCard} />);
    const title = screen.getByText('refactor-server');
    expect(title).toBeInTheDocument();
    expect(title.className).toMatch(/font-(medium|semibold|bold)/);
  });

  it('displays filename as muted subtitle below title', () => {
    render(<FileCard card={baseCard} />);
    const subtitle = screen.getByText('server/index.ts');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle.className).toMatch(/text-(xs|sm)/);
    expect(subtitle.className).toMatch(/text-gray/);
  });

  it('displays step ID in top-right corner with monospace font', () => {
    render(<FileCard card={baseCard} />);
    const stepId = screen.getByText('01-04');
    expect(stepId).toBeInTheDocument();
    expect(stepId.className).toMatch(/font-mono/);
  });

  it('shows review badge with count when reviewCount > 0', () => {
    const card = { ...baseCard, reviewCount: 3 };
    render(<FileCard card={card} />);
    expect(screen.getByText('3 reviews')).toBeInTheDocument();
  });

  it('shows singular review label when reviewCount is 1', () => {
    const card = { ...baseCard, reviewCount: 1 };
    render(<FileCard card={card} />);
    expect(screen.getByText('1 review')).toBeInTheDocument();
  });

  it('hides review badge when reviewCount is 0', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.queryByText(/reviews?$/i)).not.toBeInTheDocument();
  });

  it('shows worktree badge when worktree is true', () => {
    const card = { ...baseCard, worktree: true };
    render(<FileCard card={card} />);
    expect(screen.getByText('worktree')).toBeInTheDocument();
  });

  it('hides worktree badge when worktree is false', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.queryByText(/worktree/i)).not.toBeInTheDocument();
  });

  it('shows blocked badge when isBlocked is true', () => {
    const card = { ...baseCard, isBlocked: true };
    render(<FileCard card={card} />);
    expect(screen.getByText('blocked')).toBeInTheDocument();
  });

  it('hides blocked badge when isBlocked is false', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.queryByText(/blocked/i)).not.toBeInTheDocument();
  });

  it('has data-testid file-card on root element', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.getByTestId('file-card')).toBeInTheDocument();
  });

  it('applies animation classes from displayColumn', () => {
    render(<FileCard card={{ ...baseCard, displayColumn: 'in_progress' }} />);
    expect(screen.getByTestId('file-card')).toHaveClass('animate-pulse-glow');
  });

  it('shows teammate label with color when teammateId is set', () => {
    const card = { ...baseCard, teammateId: 'crafter-03' };
    render(<FileCard card={card} />);
    const label = screen.getByText('crafter-03');
    expect(label).toBeInTheDocument();
    expect(label.className).toMatch(/text-(?!gray)/);
  });

  it('shows no teammate section when teammateId is null', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.queryByTestId('teammate-indicator')).not.toBeInTheDocument();
  });

  it('shows person icon alongside teammate label', () => {
    const card = { ...baseCard, teammateId: 'crafter-01' };
    render(<FileCard card={card} />);
    const indicator = screen.getByTestId('teammate-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator.querySelector('svg')).toBeInTheDocument();
  });

  it('calls onCardClick with stepId when card is clicked', () => {
    const onCardClick = vi.fn();
    render(<FileCard card={baseCard} onCardClick={onCardClick} />);
    fireEvent.click(screen.getByTestId('file-card'));
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledWith('01-04');
  });

  it('applies cursor-pointer when onCardClick is provided', () => {
    const onCardClick = vi.fn();
    render(<FileCard card={baseCard} onCardClick={onCardClick} />);
    expect(screen.getByTestId('file-card').className).toMatch(/cursor-pointer/);
  });

  it('does not apply cursor-pointer when onCardClick is not provided', () => {
    render(<FileCard card={baseCard} />);
    expect(screen.getByTestId('file-card').className).not.toMatch(/cursor-pointer/);
  });
});
