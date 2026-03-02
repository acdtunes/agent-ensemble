/**
 * Tests for FeatureBoardView — wraps KanbanBoard with context dropdowns and tabs.
 *
 * Driving port: FeatureBoardView component props
 * Acceptance criteria:
 * - Board loads and displays delivery data for selected feature
 * - Feature without execution state shows all steps as queued
 * - Breadcrumb shows "Overview / {project} / {feature}"
 * - Board-to-Docs tab preserves project and feature context
 * - Feature dropdown shows only board-capable features
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
  DeliveryState,
  ExecutionPlan,
  FeatureSummary,
  FeatureId,
} from '../../shared/types';

// --- Computed path prevents static resolution before file exists ---

const COMPONENT_PATH = ['..', 'components', 'FeatureBoardView'].join('/');
const PURE_PATH = ['..', 'utils', 'featureBoardUtils'].join('/');

// --- Fixtures ---

const makePlan = (stepCount = 3): ExecutionPlan => ({
  schema_version: '1.0',
  summary: { total_steps: stepCount, total_layers: 1, max_parallelism: stepCount, requires_worktrees: false },
  layers: [{
    layer: 1,
    parallel: true,
    use_worktrees: false,
    steps: Array.from({ length: stepCount }, (_, i) => ({
      step_id: `01-0${i + 1}`,
      name: `Step ${i + 1}`,
      files_to_modify: [`src/file${i + 1}.ts`],
    })),
  }],
});

const makeState = (plan: ExecutionPlan): DeliveryState => ({
  schema_version: '1.0',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T12:00:00Z',
  plan_path: 'docs/feature/auth/roadmap.yaml',
  current_layer: 1,
  summary: { total_steps: plan.summary.total_steps, total_layers: 1, completed: 1, failed: 0, in_progress: 1 },
  steps: {
    '01-01': {
      step_id: '01-01', name: 'Step 1', layer: 1, status: 'approved',
      teammate_id: 'crafter-01', started_at: '2026-03-01T01:00:00Z',
      completed_at: '2026-03-01T02:00:00Z', review_attempts: 1, files_to_modify: ['src/file1.ts'],
    },
    '01-02': {
      step_id: '01-02', name: 'Step 2', layer: 1, status: 'in_progress',
      teammate_id: 'crafter-02', started_at: '2026-03-01T03:00:00Z',
      completed_at: null, review_attempts: 0, files_to_modify: ['src/file2.ts'],
    },
    '01-03': {
      step_id: '01-03', name: 'Step 3', layer: 1, status: 'pending',
      teammate_id: null, started_at: null,
      completed_at: null, review_attempts: 0, files_to_modify: ['src/file3.ts'],
    },
  },
  teammates: {},
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

describe('synthesizeQueuedState', () => {
  it('creates a DeliveryState from plan where all steps are pending', async () => {
    const { synthesizeQueuedState } = await import(/* @vite-ignore */ PURE_PATH);
    const plan = makePlan(3);
    const result = synthesizeQueuedState(plan);

    expect(result.summary.total_steps).toBe(3);
    expect(result.summary.completed).toBe(0);
    expect(result.summary.in_progress).toBe(0);
    expect(result.current_layer).toBe(1);

    for (const step of plan.layers[0].steps) {
      expect(result.steps[step.step_id]).toMatchObject({
        step_id: step.step_id,
        name: step.name,
        status: 'pending',
        teammate_id: null,
      });
    }
  });

  it('handles multi-layer plans', async () => {
    const { synthesizeQueuedState } = await import(/* @vite-ignore */ PURE_PATH);
    const plan: ExecutionPlan = {
      schema_version: '1.0',
      summary: { total_steps: 4, total_layers: 2, max_parallelism: 2, requires_worktrees: false },
      layers: [
        { layer: 1, parallel: true, use_worktrees: false, steps: [
          { step_id: '01-01', name: 'A', files_to_modify: [] },
          { step_id: '01-02', name: 'B', files_to_modify: [] },
        ]},
        { layer: 2, parallel: false, use_worktrees: false, steps: [
          { step_id: '02-01', name: 'C', files_to_modify: [] },
          { step_id: '02-02', name: 'D', files_to_modify: [] },
        ]},
      ],
    };

    const result = synthesizeQueuedState(plan);
    expect(result.summary.total_steps).toBe(4);
    expect(result.summary.total_layers).toBe(2);
    expect(Object.keys(result.steps)).toHaveLength(4);
    for (const stepState of Object.values(result.steps) as { status: string }[]) {
      expect(stepState.status).toBe('pending');
    }
  });
});

describe('filterBoardCapableFeatures', () => {
  it('returns only features with hasRoadmap true', async () => {
    const { filterBoardCapableFeatures } = await import(/* @vite-ignore */ PURE_PATH);
    const features = [
      makeFeature('auth-flow', { hasRoadmap: true }),
      makeFeature('docs-only', { hasRoadmap: false }),
      makeFeature('user-profile', { hasRoadmap: true }),
    ];

    const result = filterBoardCapableFeatures(features);
    expect(result).toHaveLength(2);
    expect(result.map((f: FeatureSummary) => f.featureId)).toEqual(['auth-flow', 'user-profile']);
  });

  it('returns empty array when no features have roadmaps', async () => {
    const { filterBoardCapableFeatures } = await import(/* @vite-ignore */ PURE_PATH);
    const features = [makeFeature('a', { hasRoadmap: false })];
    expect(filterBoardCapableFeatures(features)).toEqual([]);
  });
});

describe('buildFeatureBoardUrl', () => {
  it('builds correct hash URL', async () => {
    const { buildFeatureBoardUrl } = await import(/* @vite-ignore */ PURE_PATH);
    expect(buildFeatureBoardUrl('my-project', 'auth-flow'))
      .toBe('#/projects/my-project/features/auth-flow/board');
  });
});

describe('buildFeatureDocsUrl', () => {
  it('builds correct hash URL preserving project and feature', async () => {
    const { buildFeatureDocsUrl } = await import(/* @vite-ignore */ PURE_PATH);
    expect(buildFeatureDocsUrl('my-project', 'auth-flow'))
      .toBe('#/projects/my-project/features/auth-flow/docs');
  });
});

// --- Component acceptance tests ---

describe('FeatureBoardView acceptance', () => {
  it('renders kanban board with delivery data for selected feature', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(3);
    const state = makeState(plan);
    const features = [makeFeature('auth-flow'), makeFeature('user-profile')];

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={state}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // KanbanBoard renders layer lane
    expect(screen.getByTestId('layer-1')).toBeInTheDocument();
    // File cards are rendered from plan steps
    expect(screen.getAllByTestId('file-card').length).toBeGreaterThan(0);
  });

  it('shows all steps as queued when state is null (no execution log)', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(3);
    const features = [makeFeature('auth-flow')];

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    // Board still renders
    expect(screen.getByTestId('layer-1')).toBeInTheDocument();
    // All file cards should be in the Pending column
    const layer = screen.getByTestId('layer-1');
    const pendingCol = within(layer).getByTestId('column-pending');
    const fileCards = within(pendingCol).getAllByTestId('file-card');
    expect(fileCards).toHaveLength(3);
  });

  it('shows breadcrumb with "Overview / {project} / {feature}"', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(1);

    render(
      <FeatureBoardView
        projectId="nw-teams"
        featureId="auth-flow"
        plan={plan}
        state={null}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toHaveTextContent('Overview');
    expect(breadcrumb).toHaveTextContent('nw-teams');
    expect(breadcrumb).toHaveTextContent('auth-flow');
  });

  it('Board tab links to feature board URL preserving context', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(1);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const boardTab = screen.getByRole('link', { name: /^Board$/i });
    expect(boardTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/board');
  });

  it('Docs tab links to feature docs URL preserving context', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(1);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const docsTab = screen.getByRole('link', { name: /^Docs$/i });
    expect(docsTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/docs');
  });

  it('feature dropdown shows only board-capable features', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const plan = makePlan(1);
    const features = [
      makeFeature('auth-flow', { hasRoadmap: true }),
      makeFeature('docs-only', { hasRoadmap: false }),
      makeFeature('user-profile', { hasRoadmap: true }),
    ];

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
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

  it('breadcrumb Overview is clickable and calls onNavigateOverview', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const onNavigateOverview = vi.fn();
    const plan = makePlan(1);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={onNavigateOverview}
        onNavigateProject={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigateOverview).toHaveBeenCalledOnce();
  });

  it('breadcrumb project name is clickable and calls onNavigateProject', async () => {
    const { FeatureBoardView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const onNavigateProject = vi.fn();
    const plan = makePlan(1);

    render(
      <FeatureBoardView
        projectId="my-project"
        featureId="auth-flow"
        plan={plan}
        state={null}
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
