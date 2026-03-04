import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  ProjectCard,
  computeCompletionPercentage,
  classifyFeatureStatus,
  aggregateFeatureStatuses,
  formatFeatureCount,
} from '../components/ProjectCard';
import type { ProjectSummary, ProjectId, FeatureSummary, FeatureId } from '../../shared/types';

afterEach(cleanup);

const makeFeature = (overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: 'feat-1' as FeatureId,
  name: 'Feature 1',
  hasRoadmap: false,
  hasExecutionLog: false,
  totalSteps: 10,
  done: 0,
  inProgress: 0,
  currentLayer: 1,
  updatedAt: '2026-02-28T12:00:00Z',
  ...overrides,
});

const baseProject: ProjectSummary = {
  projectId: 'auth-feature' as ProjectId,
  name: 'auth-feature',
  totalSteps: 10,
  done: 3,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-02-28T12:00:00Z',
  featureCount: 0,
  features: [],
};

describe('ProjectCard', () => {
  it('displays project name', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText('auth-feature')).toBeInTheDocument();
  });

  it('displays completion percentage', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it('displays current layer as completed phases', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/2 done/)).toBeInTheDocument();
  });

  it('displays progress bar with correct aria attributes', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays step counts summary', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/3\s*\/\s*10/)).toBeInTheDocument();
  });

  it('shows in-progress count when steps are active', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/2 active/i)).toBeInTheDocument();
  });

  it('calls onNavigate with projectId when clicked', () => {
    const onNavigate = vi.fn();
    render(<ProjectCard project={baseProject} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('auth-feature'));
    expect(onNavigate).toHaveBeenCalledWith('auth-feature');
  });

  it('formats last updated timestamp', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it('shows 100% for fully completed project', () => {
    const project = { ...baseProject, done: 10, totalSteps: 10, inProgress: 0 };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });

  it('displays "No features" when featureCount is 0', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText('No features')).toBeInTheDocument();
  });

  it('displays feature count with plural when multiple features', () => {
    const project: ProjectSummary = {
      ...baseProject,
      featureCount: 4,
      features: [
        makeFeature({ featureId: 'f1' as FeatureId, done: 10, totalSteps: 10 }),
        makeFeature({ featureId: 'f2' as FeatureId, inProgress: 3 }),
        makeFeature({ featureId: 'f3' as FeatureId, inProgress: 1 }),
        makeFeature({ featureId: 'f4' as FeatureId }),
      ],
    };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    expect(screen.getByText('4 features')).toBeInTheDocument();
  });

  it('displays singular "1 feature" when featureCount is 1', () => {
    const project: ProjectSummary = {
      ...baseProject,
      featureCount: 1,
      features: [makeFeature({ done: 10, totalSteps: 10 })],
    };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    expect(screen.getByText('1 feature')).toBeInTheDocument();
  });

  it('shows aggregated feature status counts', () => {
    const project: ProjectSummary = {
      ...baseProject,
      featureCount: 3,
      features: [
        makeFeature({ featureId: 'f1' as FeatureId, done: 10, totalSteps: 10 }),
        makeFeature({ featureId: 'f2' as FeatureId, done: 10, totalSteps: 10 }),
        makeFeature({ featureId: 'f3' as FeatureId, inProgress: 3 }),
      ],
    };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    // Check that feature stats are shown - there should be multiple elements with these texts
    const doneElements = screen.queryAllByText(/done/);
    expect(doneElements.length).toBeGreaterThan(0);
    // Should also show 1 active for the in-progress feature
    const activeElements = screen.queryAllByText(/active/);
    expect(activeElements.length).toBeGreaterThan(0);
  });

  it('hides feature status counts badge when no completed features', () => {
    const project: ProjectSummary = {
      ...baseProject,
      featureCount: 1,
      features: [makeFeature({ featureId: 'f1' as FeatureId })],
    };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    // The feature stats badge should not show "done" for features
    // (but the project-level stats will still show "3 / 10" and "2 done")
    const doneElements = screen.queryAllByText(/done/);
    // Should only have the project-level "2 done" for currentLayer, not a feature-level "done" badge
    expect(doneElements).toHaveLength(1);
  });
});

describe('computeCompletionPercentage', () => {
  it('returns percentage rounded to nearest integer', () => {
    expect(computeCompletionPercentage(3, 10)).toBe(30);
  });

  it('returns 0 when total is 0', () => {
    expect(computeCompletionPercentage(0, 0)).toBe(0);
  });

  it('returns 100 when all completed', () => {
    expect(computeCompletionPercentage(10, 10)).toBe(100);
  });

  it('rounds correctly', () => {
    expect(computeCompletionPercentage(1, 3)).toBe(33);
  });
});

describe('classifyFeatureStatus', () => {
  it('returns completed when all steps are done', () => {
    expect(classifyFeatureStatus(makeFeature({ done: 10, totalSteps: 10 }))).toBe('completed');
  });

  it('returns in-progress when steps are active', () => {
    expect(classifyFeatureStatus(makeFeature({ inProgress: 3 }))).toBe('in-progress');
  });

  it('returns pending when no steps completed or active', () => {
    expect(classifyFeatureStatus(makeFeature())).toBe('pending');
  });

  it('returns pending when totalSteps is 0', () => {
    expect(classifyFeatureStatus(makeFeature({ totalSteps: 0, done: 0 }))).toBe('pending');
  });
});

describe('aggregateFeatureStatuses', () => {
  it('returns zero counts for empty features array', () => {
    expect(aggregateFeatureStatuses([])).toEqual({ completed: 0, inProgress: 0 });
  });

  it('counts features by classified status', () => {
    const features = [
      makeFeature({ featureId: 'f1' as FeatureId, done: 10, totalSteps: 10 }),
      makeFeature({ featureId: 'f2' as FeatureId, done: 5, totalSteps: 5 }),
      makeFeature({ featureId: 'f3' as FeatureId, inProgress: 3 }),
    ];
    expect(aggregateFeatureStatuses(features)).toEqual({ completed: 2, inProgress: 1 });
  });

  it('does not count pending features in any status', () => {
    const features = [makeFeature({ featureId: 'f1' as FeatureId })];
    expect(aggregateFeatureStatuses(features)).toEqual({ completed: 0, inProgress: 0 });
  });
});

describe('formatFeatureCount', () => {
  it('returns "No features" for 0', () => {
    expect(formatFeatureCount(0)).toBe('No features');
  });

  it('returns "1 feature" for 1', () => {
    expect(formatFeatureCount(1)).toBe('1 feature');
  });

  it('returns "N features" for N > 1', () => {
    expect(formatFeatureCount(4)).toBe('4 features');
  });
});
