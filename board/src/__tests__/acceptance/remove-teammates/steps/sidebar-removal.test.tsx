/**
 * Acceptance Test: Remove Teammates Sidebar (Step 01-01)
 *
 * Validates that the BoardContent component no longer displays
 * the Teammates sidebar section and the Kanban board spans full width.
 *
 * Acceptance Criteria:
 *   - Board view has no sidebar section
 *   - No "Teammates" heading visible
 *   - Kanban board spans full available width
 *   - All phases and columns remain visible
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type { Roadmap } from '../../../../../shared/types';
import type { Route } from '../../../../hooks/useRouter';

// --- Mock state using vi.hoisted (mutable before import) ---

const mockRoadmapState = vi.hoisted(() => ({
  roadmap: null as Roadmap | null,
  transitions: [] as readonly unknown[],
  connectionStatus: 'connected' as 'connecting' | 'connected' | 'disconnected',
  error: null as string | null,
}));

const mockRoute = vi.hoisted(() => ({
  current: { view: 'board', projectId: 'test-project' } as Route,
}));

// --- Mock hooks before importing App ---

vi.mock('../../../../hooks/useRoadmapState', () => ({
  useRoadmapState: () => mockRoadmapState,
}));

vi.mock('../../../../hooks/useRouter', () => ({
  useRouter: () => mockRoute.current,
}));

vi.mock('../../../../hooks/useProjectList', () => ({
  useProjectList: () => ({
    projects: [],
    connectionStatus: 'connected' as const,
    error: null,
  }),
}));

vi.mock('../../../../hooks/useFeatureList', () => ({
  useFeatureList: () => ({
    features: [],
    loading: false,
    error: null,
    refetch: () => {},
  }),
}));

vi.mock('../../../../hooks/useAddProject', () => ({
  useAddProject: () => ({
    addProject: vi.fn().mockResolvedValue({ ok: true }),
    submitting: false,
    error: null,
  }),
}));

vi.mock('../../../../hooks/useRemoveProject', () => ({
  useRemoveProject: () => ({
    removeProject: vi.fn().mockResolvedValue({ ok: true }),
    removing: false,
    error: null,
  }),
}));

import { App } from '../../../../App';

// --- Test fixture ---

const createTestRoadmap = (): Roadmap => ({
  roadmap: {
    project_id: 'test-project',
    created_at: '2026-03-01T00:00:00Z',
    total_steps: 3,
    phases: 1,
    short_description: 'Test roadmap',
    description: 'A test roadmap for validation',
  },
  phases: [
    {
      id: '01',
      name: 'Phase One',
      steps: [
        {
          id: '01-01',
          name: 'First Step',
          description: 'Do the first thing',
          status: 'approved',
          files_to_modify: ['src/a.ts'],
          dependencies: [],
          criteria: [],
          teammate_id: null,
          started_at: null,
          completed_at: '2026-03-01T01:00:00Z',
          review_attempts: 0,
        },
        {
          id: '01-02',
          name: 'Second Step',
          description: 'Do the second thing',
          status: 'in_progress',
          teammate_id: 'crafter-01',
          files_to_modify: ['src/b.ts'],
          dependencies: ['01-01'],
          criteria: [],
          started_at: '2026-03-01T02:00:00Z',
          completed_at: null,
          review_attempts: 0,
        },
        {
          id: '01-03',
          name: 'Third Step',
          description: 'Do the third thing',
          status: 'pending',
          files_to_modify: ['src/c.ts'],
          dependencies: ['01-02'],
          criteria: [],
          teammate_id: null,
          started_at: null,
          completed_at: null,
          review_attempts: 0,
        },
      ],
    },
  ],
});

const setMockRoadmap = (roadmap: Roadmap | null) => {
  Object.assign(mockRoadmapState, {
    roadmap,
    transitions: [],
    connectionStatus: 'connected',
    error: null,
  });
};

afterEach(() => {
  cleanup();
  mockRoute.current = { view: 'board', projectId: 'test-project' };
  setMockRoadmap(null);
});

// --- Acceptance Tests ---

describe('Step 01-01: Remove Teammates Sidebar', () => {
  it('BoardContent does not render Teammates heading or sidebar section', () => {
    // Given a roadmap with steps assigned to teammates
    setMockRoadmap(createTestRoadmap());

    // When the board is rendered
    render(<App />);

    // Then no "Teammates" heading is visible (AC: No "Teammates" heading visible)
    expect(screen.queryByRole('heading', { name: 'Teammates' })).not.toBeInTheDocument();

    // And no sidebar section with aria-label="Teammates" exists (AC: Board view has no sidebar section)
    expect(screen.queryByRole('region', { name: 'Teammates' })).not.toBeInTheDocument();
  });

  it('board layout does not use 3/4 width grid constraint', () => {
    // Given a roadmap
    setMockRoadmap(createTestRoadmap());

    // When the board is rendered
    render(<App />);

    // Then the layout does NOT have the old 4-column grid with col-span-3
    // (AC: Kanban board spans full available width)
    const gridContainers = document.querySelectorAll('.lg\\:grid-cols-4');
    expect(gridContainers.length).toBe(0);
  });

  it('all phases and columns remain visible after sidebar removal', () => {
    // Given a roadmap with one phase
    setMockRoadmap(createTestRoadmap());

    // When the board is rendered
    render(<App />);

    // Then the phase is visible (AC: All phases and columns remain visible)
    // Phase name displays as "Phase 1: Phase One"
    expect(screen.getByText(/Phase 1: Phase One/)).toBeInTheDocument();

    // And all steps remain visible (may appear in multiple places like cards and TeamPanel)
    expect(screen.getAllByText('First Step').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Second Step').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Third Step').length).toBeGreaterThan(0);

    // And status columns remain visible
    expect(screen.getByTestId('column-pending')).toBeInTheDocument();
    expect(screen.getByTestId('column-in_progress')).toBeInTheDocument();
    expect(screen.getByTestId('column-review')).toBeInTheDocument();
    expect(screen.getByTestId('column-done')).toBeInTheDocument();
  });
});
