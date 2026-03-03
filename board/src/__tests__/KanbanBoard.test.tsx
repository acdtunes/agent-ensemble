import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { KanbanBoard } from '../components/KanbanBoard';
import type { Roadmap, RoadmapStep, RoadmapPhase } from '../../shared/types';

afterEach(cleanup);

const makeStep = (overrides: Partial<RoadmapStep> & Pick<RoadmapStep, 'id' | 'name'>): RoadmapStep => ({
  status: 'pending',
  files_to_modify: [],
  dependencies: [],
  criteria: [],
  teammate_id: null,
  started_at: null,
  completed_at: null,
  review_attempts: 0,
  ...overrides,
});

const testRoadmap: Roadmap = {
  roadmap: { project_id: 'test', total_steps: 4, phases: 2 },
  phases: [
    {
      id: 'phase-1',
      name: 'Phase 1',
      steps: [
        makeStep({
          id: '01-01',
          name: 'Setup database',
          status: 'approved',
          files_to_modify: ['src/db.ts', 'src/schema.ts'],
          teammate_id: 'crafter-01',
          started_at: '2026-01-01T00:10:00Z',
          completed_at: '2026-01-01T00:30:00Z',
          review_attempts: 2,
        }),
        makeStep({
          id: '01-02',
          name: 'Setup API routes',
          status: 'in_progress',
          files_to_modify: ['src/routes.ts', 'src/schema.ts'],
          teammate_id: 'crafter-02',
          started_at: '2026-01-01T00:15:00Z',
        }),
      ],
    },
    {
      id: 'phase-2',
      name: 'Phase 2',
      steps: [
        makeStep({
          id: '02-01',
          name: 'Integration tests',
          files_to_modify: ['tests/integration.ts'],
        }),
        makeStep({
          id: '02-02',
          name: 'E2E tests',
          files_to_modify: ['tests/e2e.ts'],
        }),
      ],
    },
  ],
};

describe('KanbanBoard acceptance', () => {
  it('renders phase swim lanes as rows', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    expect(screen.getByText('Phase 1')).toBeInTheDocument();
    expect(screen.getByText('Phase 2')).toBeInTheDocument();
  });

  it('shows phase header with step count', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    expect(within(phase1).getByText(/2 steps/i)).toBeInTheDocument();
  });

  it('shows phase progress as approved/total in header', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    expect(within(phase1).getByText(/1\/2/)).toBeInTheDocument();
  });

  it('produces one step card per step across all phases', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    // Phase 1: 2 steps, Phase 2: 2 steps = 4 total
    const stepCards = screen.getAllByTestId('step-card');
    expect(stepCards).toHaveLength(4);
  });

  it('places step card from approved step in Done column', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    const doneCol = within(phase1).getByTestId('column-done');
    // Step 01-01 is approved → Done column, shows step name and file count
    expect(within(doneCol).getByText('Setup database')).toBeInTheDocument();
    expect(within(doneCol).getByText('2 files')).toBeInTheDocument();
  });

  it('places step card from in_progress step in In Progress column', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    const inProgressCol = within(phase1).getByTestId('column-in_progress');
    // Step 01-02 is in_progress → In Progress column
    expect(within(inProgressCol).getByText('Setup API routes')).toBeInTheDocument();
    expect(within(inProgressCol).getByText('2 files')).toBeInTheDocument();
  });

  it('does not show review badge on step card even when step has review attempts', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    const doneCol = within(phase1).getByTestId('column-done');
    // Step 01-01 has review_attempts: 2 → but review badge is no longer rendered on cards
    expect(within(doneCol).queryByText(/reviews?$/i)).not.toBeInTheDocument();
  });

  it('displays status-based color coding on columns', () => {
    render(<KanbanBoard roadmap={testRoadmap} />);
    const phase1 = screen.getByTestId('phase-phase-1');
    const doneCol = within(phase1).getByTestId('column-done');
    expect(doneCol.className).toContain('green');
  });

  it('calls onCardClick with stepId when a step card is clicked', () => {
    const onCardClick = vi.fn();
    render(<KanbanBoard roadmap={testRoadmap} onCardClick={onCardClick} />);
    const stepCards = screen.getAllByTestId('step-card');
    fireEvent.click(stepCards[0]);
    expect(onCardClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).toHaveBeenCalledWith(expect.any(String));
  });
});
