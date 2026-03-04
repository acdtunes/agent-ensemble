/**
 * Tests for FeatureBoardView — wraps KanbanBoard with context dropdowns and tabs.
 *
 * Driving port: FeatureBoardView component props
 * Acceptance criteria:
 * - Board loads and displays roadmap data for selected feature
 * - Breadcrumb shows "Overview / {project} / {feature}"
 * - Board-to-Docs tab preserves project and feature context
 * - Feature dropdown shows only board-capable features
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
  Roadmap,
  RoadmapStep,
  FeatureSummary,
  FeatureId,
} from '../../shared/types';
import {
  filterBoardCapableFeatures,
  buildFeatureBoardUrl,
  buildFeatureDocsUrl,
} from '../utils/featureBoardUtils';
import { FeatureBoardView } from '../components/FeatureBoardView';

// --- Fixtures ---

const makeStep = (id: string, name: string, status: RoadmapStep['status'] = 'pending'): RoadmapStep => ({
  id,
  name,
  description: '',
  files_to_modify: [`src/${id}.ts`],
  dependencies: [],
  criteria: [],
  status,
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
});

const makeRoadmap = (steps: RoadmapStep[]): Roadmap => ({
  roadmap: {
    project_id: 'test',
    created_at: '2026-03-01T00:00:00Z',
    total_steps: steps.length,
    phases: 1,
  },
  phases: [{ id: '01', name: 'Phase 1', steps }],
});

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

afterEach(cleanup);

// --- Pure function tests ---

describe('filterBoardCapableFeatures', () => {
  it('returns only features with hasRoadmap true', () => {
    const features = [
      makeFeature('auth-flow', { hasRoadmap: true }),
      makeFeature('docs-only', { hasRoadmap: false }),
      makeFeature('user-profile', { hasRoadmap: true }),
    ];

    const result = filterBoardCapableFeatures(features);
    expect(result).toHaveLength(2);
    expect(result.map((f) => f.featureId)).toEqual(['auth-flow', 'user-profile']);
  });

  it('returns empty array when no features have roadmaps', () => {
    const features = [makeFeature('a', { hasRoadmap: false })];
    expect(filterBoardCapableFeatures(features)).toEqual([]);
  });
});

describe('buildFeatureBoardUrl', () => {
  it('builds correct hash URL', () => {
    expect(buildFeatureBoardUrl('my-project', 'auth-flow'))
      .toBe('#/projects/my-project/features/auth-flow/board');
  });
});

describe('buildFeatureDocsUrl', () => {
  it('builds correct hash URL preserving project and feature', () => {
    expect(buildFeatureDocsUrl('my-project', 'auth-flow'))
      .toBe('#/projects/my-project/features/auth-flow/docs');
  });
});

// --- Component acceptance tests ---

describe('FeatureBoardView acceptance', () => {
  it('renders kanban board with roadmap data for selected feature', () => {
    const roadmap = makeRoadmap([
      makeStep('01-01', 'Step 1', 'approved'),
      makeStep('01-02', 'Step 2', 'in_progress'),
      makeStep('01-03', 'Step 3', 'pending'),
    ]);
    const features = [makeFeature('auth-flow'), makeFeature('user-profile')];

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // KanbanBoard renders phase lane (1-based index)
    expect(screen.getByTestId('layer-1')).toBeInTheDocument();
  });

  it('shows breadcrumb with "Overview / {project} / {feature}"', () => {
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);

    render(
      <FeatureBoardView
        projectId="agent-ensemble"
        featureId="auth-flow"
        roadmap={roadmap}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toHaveTextContent('Overview');
    expect(breadcrumb).toHaveTextContent('agent-ensemble');
    expect(breadcrumb).toHaveTextContent('auth-flow');
  });

  it('Board tab links to feature board URL preserving context', () => {
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const boardTab = screen.getByRole('link', { name: /^Board$/i });
    expect(boardTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/board');
  });

  it('Docs tab links to feature docs URL preserving context', () => {
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const docsTab = screen.getByRole('link', { name: /^Docs$/i });
    expect(docsTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/docs');
  });

  it('feature dropdown shows only board-capable features', () => {
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);
    const features = [
      makeFeature('auth-flow', { hasRoadmap: true }),
      makeFeature('docs-only', { hasRoadmap: false }),
      makeFeature('user-profile', { hasRoadmap: true }),
    ];

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const featureSelect = screen.getByTestId('feature-dropdown');
    const options = within(featureSelect).getAllByRole('option');
    const optionLabels = options.map(o => o.textContent);
    expect(optionLabels).toContain('auth-flow');
    expect(optionLabels).toContain('user-profile');
    expect(optionLabels).not.toContain('docs-only');
  });

  it('breadcrumb Overview is clickable and calls onNavigateOverview', () => {
    const onNavigateOverview = vi.fn();
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={onNavigateOverview}
        onNavigateProject={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigateOverview).toHaveBeenCalledOnce();
  });

  it('breadcrumb project name is clickable and calls onNavigateProject', () => {
    const onNavigateProject = vi.fn();
    const roadmap = makeRoadmap([makeStep('01-01', 'Step 1')]);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        roadmap={roadmap}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={onNavigateProject}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    fireEvent.click(within(breadcrumb).getByText('my-project'));
    expect(onNavigateProject).toHaveBeenCalledOnce();
  });
});
