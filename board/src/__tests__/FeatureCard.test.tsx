import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  FeatureCard,
  classifyFeatureDisplayState,
  formatProgressLabel,
  type FeatureDisplayState,
} from '../components/FeatureCard';
import type { FeatureSummary, FeatureId } from '../../shared/types';

afterEach(cleanup);

const makeFeature = (overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: 'card-redesign' as FeatureId,
  name: 'card-redesign',
  hasRoadmap: true,
  hasExecutionLog: true,
  totalSteps: 7,
  completed: 3,
  failed: 0,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-03-01T12:00:00Z',
  ...overrides,
});

// ================================================================
// Pure function: classifyFeatureDisplayState
// ================================================================

describe('classifyFeatureDisplayState', () => {
  it('returns docs-only when feature has no roadmap', () => {
    const feature = makeFeature({ hasRoadmap: false, hasExecutionLog: false, totalSteps: 0 });
    expect(classifyFeatureDisplayState(feature)).toBe('docs-only');
  });

  it('returns completed when all steps are done', () => {
    const feature = makeFeature({ completed: 7, totalSteps: 7, inProgress: 0 });
    expect(classifyFeatureDisplayState(feature)).toBe('completed');
  });

  it('returns active when steps are in progress', () => {
    const feature = makeFeature({ completed: 3, inProgress: 2 });
    expect(classifyFeatureDisplayState(feature)).toBe('active');
  });

  it('returns active when some steps completed but not all', () => {
    const feature = makeFeature({ completed: 3, inProgress: 0, failed: 0, hasExecutionLog: true });
    expect(classifyFeatureDisplayState(feature)).toBe('active');
  });

  it('returns planned when has roadmap but no execution log', () => {
    const feature = makeFeature({
      hasRoadmap: true,
      hasExecutionLog: false,
      totalSteps: 10,
      completed: 0,
      inProgress: 0,
      failed: 0,
    });
    expect(classifyFeatureDisplayState(feature)).toBe('planned');
  });

  it('returns planned when has execution log but no progress', () => {
    const feature = makeFeature({
      hasRoadmap: true,
      hasExecutionLog: true,
      totalSteps: 10,
      completed: 0,
      inProgress: 0,
      failed: 0,
    });
    expect(classifyFeatureDisplayState(feature)).toBe('planned');
  });

  it('returns active when has failed steps', () => {
    const feature = makeFeature({ failed: 1, inProgress: 0, completed: 0 });
    expect(classifyFeatureDisplayState(feature)).toBe('active');
  });
});

// ================================================================
// Pure function: formatProgressLabel
// ================================================================

describe('formatProgressLabel', () => {
  it('returns "N of M" format', () => {
    expect(formatProgressLabel(3, 7)).toBe('3 of 7');
  });

  it('returns "0 of N" for no progress', () => {
    expect(formatProgressLabel(0, 10)).toBe('0 of 10');
  });

  it('returns "N of N" for completed', () => {
    expect(formatProgressLabel(5, 5)).toBe('5 of 5');
  });
});

// ================================================================
// FeatureCard component
// ================================================================

describe('FeatureCard', () => {
  it('displays feature name', () => {
    render(<FeatureCard feature={makeFeature()} />);
    expect(screen.getByText('card-redesign')).toBeInTheDocument();
  });

  it('displays progress metrics for active feature', () => {
    render(<FeatureCard feature={makeFeature()} />);
    expect(screen.getByText('3 of 7')).toBeInTheDocument();
  });

  it('displays in-progress count when steps are active', () => {
    render(<FeatureCard feature={makeFeature({ inProgress: 2 })} />);
    expect(screen.getByText(/2 in progress/i)).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn();
    render(<FeatureCard feature={makeFeature()} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows Docs only indicator when feature has no roadmap', () => {
    const feature = makeFeature({ hasRoadmap: false, totalSteps: 0, completed: 0, inProgress: 0, failed: 0 });
    render(<FeatureCard feature={feature} />);
    expect(screen.getByText('Docs only')).toBeInTheDocument();
  });

  it('has no Board or Docs buttons', () => {
    render(<FeatureCard feature={makeFeature()} />);
    expect(screen.queryByText('Board')).not.toBeInTheDocument();
    expect(screen.queryByText('Docs')).not.toBeInTheDocument();
  });

  it('shows Planned state for feature not yet started', () => {
    const feature = makeFeature({
      hasRoadmap: true,
      hasExecutionLog: false,
      totalSteps: 10,
      completed: 0,
      inProgress: 0,
      failed: 0,
    });
    render(<FeatureCard feature={feature} />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
    expect(screen.getByText('0 of 10')).toBeInTheDocument();
  });

  it('shows failed count when failures exist', () => {
    render(<FeatureCard feature={makeFeature({ failed: 1 })} />);
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it('hides failed count when no failures', () => {
    render(<FeatureCard feature={makeFeature({ failed: 0 })} />);
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });
});
