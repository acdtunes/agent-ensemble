import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TeamPanel } from '../components/TeamPanel';
import type { Roadmap, RoadmapStep } from '../../shared/types';

afterEach(cleanup);

const step = (overrides: Partial<RoadmapStep> & Pick<RoadmapStep, 'id' | 'name'>): RoadmapStep => ({
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

const roadmap = (steps: readonly RoadmapStep[]): Roadmap => ({
  roadmap: {},
  phases: [{ id: 'phase-1', name: 'Phase 1', steps }],
});

describe('TeamPanel', () => {
  it('lists each active teammate by ID', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Step A', status: 'in_progress', teammate_id: 'crafter-01' }),
      step({ id: '01-02', name: 'Step B', status: 'in_progress', teammate_id: 'crafter-02' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText('crafter-01')).toBeInTheDocument();
    expect(screen.getByText('crafter-02')).toBeInTheDocument();
  });

  it('shows current step name for active teammate', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Build auth module', status: 'in_progress', teammate_id: 'crafter-01' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText('Build auth module')).toBeInTheDocument();
  });

  it('filters out teammate whose only steps are approved', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Done step', status: 'approved', teammate_id: 'crafter-01' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.queryByText('crafter-01')).not.toBeInTheDocument();
    expect(screen.getByText(/no active teammates/i)).toBeInTheDocument();
  });

  it('filters out teammate whose only steps are pending', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Future step', status: 'pending', teammate_id: 'crafter-01' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.queryByText('crafter-01')).not.toBeInTheDocument();
    expect(screen.getByText(/no active teammates/i)).toBeInTheDocument();
  });

  it('shows only active teammates when mixed with idle ones', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Active step', status: 'in_progress', teammate_id: 'crafter-01' }),
      step({ id: '01-02', name: 'Done step', status: 'approved', teammate_id: 'crafter-02' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText('crafter-01')).toBeInTheDocument();
    expect(screen.queryByText('crafter-02')).not.toBeInTheDocument();
  });

  it('shows completed count for active teammate with prior completions', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Step A', status: 'approved', teammate_id: 'crafter-01' }),
      step({ id: '01-02', name: 'Step B', status: 'approved', teammate_id: 'crafter-01' }),
      step({ id: '01-03', name: 'Step C', status: 'in_progress', teammate_id: 'crafter-01' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText('crafter-01')).toBeInTheDocument();
    expect(screen.getByText(/2 completed/i)).toBeInTheDocument();
  });

  it('renders empty state when no teammates assigned', () => {
    const rm = roadmap([
      step({ id: '01-01', name: 'Step A', status: 'pending' }),
    ]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText(/no active teammates/i)).toBeInTheDocument();
  });

  it('renders empty state for roadmap with no steps', () => {
    const rm = roadmap([]);
    render(<TeamPanel roadmap={rm} />);
    expect(screen.getByText(/no active teammates/i)).toBeInTheDocument();
  });
});
