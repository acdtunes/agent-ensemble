import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Roadmap, ProjectSummary, ProjectId, FeatureSummary } from '../../shared/types';
import type { Route } from '../hooks/useRouter';

// --- Mock hooks before importing App ---

const mockResult = vi.hoisted(() => ({
  roadmap: null as Roadmap | null,
  transitions: [] as readonly unknown[],
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

vi.mock('../hooks/useRoadmapState', () => ({
  useRoadmapState: () => mockResult,
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

const makeProjectSummary = (id: string): ProjectSummary => ({
  projectId: id as ProjectId,
  name: id,
  totalSteps: 5,
  done: 2,
  inProgress: 1,
  currentLayer: 1,
  updatedAt: '2026-01-01T00:00:00Z',
  featureCount: 0,
  features: [],
});

const setMockResult = (overrides: Partial<typeof mockResult>) => {
  Object.assign(mockResult, {
    roadmap: null,
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

// --- Tests ---

afterEach(() => {
  cleanup();
  mockRoute.current = { view: 'board', projectId: 'test-project' };
});

describe('App integration', () => {
  it('shows error message when WebSocket error occurs', () => {
    setMockResult({
      roadmap: null,
      connectionStatus: 'disconnected',
      error: 'WebSocket error',
    });

    render(<App />);

    expect(screen.getByText(/websocket error/i)).toBeInTheDocument();
  });

  it('shows placeholder when roadmap is null (server unreachable)', () => {
    setMockResult({ roadmap: null, connectionStatus: 'connecting' });

    render(<App />);

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('phase-01')).not.toBeInTheDocument();
    expect(screen.getByText(/waiting for server/i)).toBeInTheDocument();
  });

  it('renders overview dashboard with project grid when route is overview and projects exist', () => {
    mockRoute.current = { view: 'overview' };
    setMockProjectList({ projects: [makeProjectSummary('my-app'), makeProjectSummary('api-server')] });

    render(<App />);

    expect(screen.getByTestId('project-grid')).toBeInTheDocument();
    expect(screen.getByText('my-app')).toBeInTheDocument();
    expect(screen.getByText('api-server')).toBeInTheDocument();
    expect(screen.queryByTestId('phase-01')).not.toBeInTheDocument();
  });
});
