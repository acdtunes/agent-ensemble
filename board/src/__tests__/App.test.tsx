import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { DeliveryState, ExecutionPlan, StateTransition, ProjectSummary, ProjectId, FeatureSummary, FeatureId } from '../../shared/types';
import type { Route } from '../hooks/useRouter';

// --- Mock hooks before importing App ---

const mockResult = vi.hoisted(() => ({
  state: null as DeliveryState | null,
  plan: null as ExecutionPlan | null,
  transitions: [] as readonly StateTransition[],
  connectionStatus: 'connecting' as 'connecting' | 'connected' | 'disconnected',
  error: null as string | null,
}));

const mockRoute = vi.hoisted(() => ({
  current: { view: 'board', projectId: 'test-project' } as Route,
}));

const mockProjectList = vi.hoisted(() => ({
  projects: [] as readonly ProjectSummary[],
  connectionStatus: 'connected' as 'connecting' | 'connected' | 'disconnected',
  error: null as string | null,
}));

const mockFeatureList = vi.hoisted(() => ({
  features: [] as readonly FeatureSummary[],
  loading: false,
  error: null as string | null,
  refetch: () => {},
}));

vi.mock('../hooks/useDeliveryState', () => ({
  useDeliveryState: () => mockResult,
}));

vi.mock('../hooks/useRouter', () => ({
  useRouter: () => mockRoute.current,
}));

vi.mock('../hooks/useProjectList', () => ({
  useProjectList: () => mockProjectList,
}));

vi.mock('../hooks/useFeatureList', () => ({
  useFeatureList: () => mockFeatureList,
}));

vi.mock('../hooks/useAddProject', () => ({
  useAddProject: () => ({
    addProject: vi.fn().mockResolvedValue({ ok: true }),
    submitting: false,
    error: null,
  }),
}));

vi.mock('../hooks/useRemoveProject', () => ({
  useRemoveProject: () => ({
    removeProject: vi.fn().mockResolvedValue({ ok: true }),
    removing: false,
    error: null,
  }),
}));

import { App } from '../App';

// --- Test fixtures (pure data) ---

const makeStep = (id: string, status: 'pending' | 'in_progress' | 'approved' = 'pending') => ({
  step_id: id,
  name: `Step ${id}`,
  layer: 1,
  status,
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  files_to_modify: ['src/app.ts'],
});

const makeState = (overrides: Partial<DeliveryState> = {}): DeliveryState => ({
  schema_version: '1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  plan_path: 'plan.yaml',
  current_layer: 1,
  summary: { total_steps: 2, total_layers: 1, completed: 1, failed: 0, in_progress: 1 },
  steps: { '01-01': makeStep('01-01', 'approved'), '01-02': makeStep('01-02', 'in_progress') },
  teammates: {
    'crafter-01': { teammate_id: 'crafter-01', current_step: '01-02', completed_steps: ['01-01'] },
  },
  ...overrides,
});

const makePlan = (): ExecutionPlan => ({
  schema_version: '1',
  summary: { total_steps: 2, total_layers: 1, max_parallelism: 2, requires_worktrees: false },
  layers: [{
    layer: 1,
    parallel: true,
    use_worktrees: false,
    steps: [
      { step_id: '01-01', name: 'Step 01-01', files_to_modify: ['src/app.ts'] },
      { step_id: '01-02', name: 'Step 01-02', files_to_modify: ['src/utils.ts'] },
    ],
  }],
});

const makeTransition = (): StateTransition => ({
  step_id: '01-01',
  from_status: 'pending',
  to_status: 'in_progress',
  teammate_id: 'crafter-01',
  timestamp: '2026-01-01T00:01:00Z',
});

const makeProjectSummary = (id: string): ProjectSummary => ({
  projectId: id as ProjectId,
  name: id,
  totalSteps: 5,
  completed: 2,
  failed: 0,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  featureCount: 0,
  features: [],
});

const setMockResult = (overrides: Partial<typeof mockResult>) => {
  Object.assign(mockResult, {
    state: null,
    plan: null,
    transitions: [],
    connectionStatus: 'connecting',
    error: null,
    ...overrides,
  });
};

const setMockProjectList = (overrides: Partial<typeof mockProjectList>) => {
  Object.assign(mockProjectList, {
    projects: [],
    connectionStatus: 'connected',
    error: null,
    ...overrides,
  });
};

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

const setMockFeatureList = (overrides: Partial<typeof mockFeatureList>) => {
  Object.assign(mockFeatureList, {
    features: [],
    loading: false,
    error: null,
    refetch: () => {},
    ...overrides,
  });
};

// --- Tests ---

afterEach(() => {
  cleanup();
  mockRoute.current = { view: 'board', projectId: 'test-project' };
  setMockFeatureList({});
});

describe('App integration — data-driven rendering', () => {
  it('renders progress header, kanban board, team panel, and activity feed when state and plan available', () => {
    setMockResult({ state: makeState(), plan: makePlan(), connectionStatus: 'connected' });

    render(<App />);

    // ProgressHeader renders via progressbar role
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // KanbanBoard renders layer
    expect(screen.getByTestId('layer-1')).toBeInTheDocument();
    // TeamPanel renders teammate
    expect(screen.getByText('crafter-01')).toBeInTheDocument();
    // ActivityFeed section is present
    expect(screen.getByLabelText(/activity/i)).toBeInTheDocument();
  });

  it('shows activity feed entries when transitions present', () => {
    setMockResult({
      state: makeState(),
      plan: makePlan(),
      transitions: [makeTransition()],
      connectionStatus: 'connected',
    });

    render(<App />);

    const activitySection = screen.getByLabelText(/activity/i);
    // ActivityFeed renders "from_status → to_status" text
    expect(activitySection).toHaveTextContent(/pending → in_progress/);
  });
});

describe('App integration — placeholder state', () => {
  it('shows placeholder when state is null (server unreachable)', () => {
    setMockResult({ state: null, plan: null, connectionStatus: 'connecting' });

    render(<App />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('layer-1')).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for server/i)).toBeInTheDocument();
  });
});

describe('App integration — connection status indicator', () => {
  it.each([
    ['connecting', /connecting/i],
    ['connected', /connected/i],
    ['disconnected', /disconnected/i],
  ] as const)('displays %s status in header', (status, expectedPattern) => {
    setMockResult({
      state: status === 'connecting' ? null : makeState(),
      plan: status === 'connecting' ? null : makePlan(),
      connectionStatus: status,
    });

    render(<App />);

    const header = screen.getByRole('banner');
    expect(header).toHaveTextContent(expectedPattern);
  });

  it('shows error message when WebSocket error occurs', () => {
    setMockResult({
      state: null,
      plan: null,
      connectionStatus: 'disconnected',
      error: 'WebSocket error',
    });

    render(<App />);

    expect(screen.getByText(/websocket error/i)).toBeInTheDocument();
  });
});

describe('App integration — routing', () => {
  it('renders overview dashboard with project grid when route is overview and projects exist', () => {
    mockRoute.current = { view: 'overview' };
    setMockProjectList({ projects: [makeProjectSummary('my-app'), makeProjectSummary('api-server')] });

    render(<App />);

    expect(screen.getByTestId('project-grid')).toBeInTheDocument();
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(screen.getByText('api-server')).toBeInTheDocument();
    expect(screen.queryByTestId('layer-1')).not.toBeInTheDocument();
  });

  it('renders empty state when route is overview and no projects registered', () => {
    mockRoute.current = { view: 'overview' };
    setMockProjectList({ projects: [] });

    render(<App />);

    expect(screen.getByText(/no projects registered/i)).toBeInTheDocument();
  });

  it('renders board view with back navigation link when route is board', () => {
    setMockResult({ state: makeState(), plan: makePlan(), connectionStatus: 'connected' });

    render(<App />);

    const backLink = screen.getByRole('link', { name: /overview/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '#/');
  });

  it('renders project feature view with feature data when route is project', () => {
    mockRoute.current = { view: 'project', projectId: 'nw-teams' };
    setMockFeatureList({
      features: [makeFeature('card-redesign'), makeFeature('doc-viewer')],
    });

    render(<App />);

    expect(screen.getByText('card-redesign')).toBeInTheDocument();
    expect(screen.getByText('doc-viewer')).toBeInTheDocument();
    expect(screen.getByText('nw-teams')).toBeInTheDocument();
  });

  it('renders empty feature state when route is project and no features', () => {
    mockRoute.current = { view: 'project', projectId: 'empty-proj' };
    setMockFeatureList({ features: [] });

    render(<App />);

    expect(screen.getByText(/no features/i)).toBeInTheDocument();
  });
});
