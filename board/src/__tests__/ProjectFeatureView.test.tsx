import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectFeatureView } from '../components/ProjectFeatureView';
import type { FeatureSummary, FeatureId } from '../../shared/types';

afterEach(cleanup);

const makeFeature = (id: string, overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: id as FeatureId,
  name: id,
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

const testFeatures: readonly FeatureSummary[] = [
  makeFeature('card-redesign', { completed: 3, totalSteps: 7, inProgress: 2 }),
  makeFeature('doc-viewer', { completed: 2, totalSteps: 5, inProgress: 1 }),
  makeFeature('kanban-board', { hasRoadmap: false, totalSteps: 0, completed: 0, inProgress: 0, failed: 0 }),
];

describe('ProjectFeatureView', () => {
  it('renders breadcrumb with Overview / projectId', () => {
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('nw-teams')).toBeInTheDocument();
  });

  it('clicking Overview breadcrumb calls onNavigateOverview', () => {
    const onNavigateOverview = vi.fn();
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={onNavigateOverview}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigateOverview).toHaveBeenCalledOnce();
  });

  it('renders one feature card per feature', () => {
    const { container } = render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText('card-redesign')).toBeInTheDocument();
    expect(screen.getByText('doc-viewer')).toBeInTheDocument();
    expect(screen.getByText('kanban-board')).toBeInTheDocument();
    const grid = container.querySelector('[data-testid="feature-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid!.children.length).toBe(3);
  });

  it('calls onNavigateFeatureBoard with featureId when Board clicked', () => {
    const onNavigateFeatureBoard = vi.fn();
    const features = [makeFeature('card-redesign', { hasRoadmap: true })];
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={onNavigateFeatureBoard}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Board'));
    expect(onNavigateFeatureBoard).toHaveBeenCalledWith('card-redesign');
  });

  it('calls onNavigateFeatureDocs with featureId when Docs clicked', () => {
    const onNavigateFeatureDocs = vi.fn();
    const features = [makeFeature('kanban-board', { hasRoadmap: false, totalSteps: 0, completed: 0, inProgress: 0, failed: 0 })];
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={onNavigateFeatureDocs}
      />,
    );
    fireEvent.click(screen.getByText('Docs'));
    expect(onNavigateFeatureDocs).toHaveBeenCalledWith('kanban-board');
  });

  it('renders empty state when no features', () => {
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={[]}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText(/no features/i)).toBeInTheDocument();
  });
});
