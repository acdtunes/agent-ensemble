import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OverviewDashboard } from '../components/OverviewDashboard';
import type { ProjectSummary, ProjectId } from '../../shared/types';

afterEach(cleanup);

const createProject = (id: string, overrides?: Partial<ProjectSummary>): ProjectSummary => ({
  projectId: id as ProjectId,
  name: id,
  totalSteps: 10,
  done: 3,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-02-28T12:00:00Z',
  featureCount: 0,
  features: [],
  ...overrides,
});

const testProjects: readonly ProjectSummary[] = [
  createProject('auth-feature', { totalSteps: 8, done: 4, currentLayer: 2 }),
  createProject('payment-api', { totalSteps: 12, done: 6, currentLayer: 3 }),
  createProject('dashboard-ui', { totalSteps: 5, done: 5, currentLayer: 1, inProgress: 0 }),
];

describe('OverviewDashboard acceptance', () => {
  it('renders one card per registered project', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />);
    expect(screen.getByText('auth-feature')).toBeInTheDocument();
    expect(screen.getByText('payment-api')).toBeInTheDocument();
    expect(screen.getByText('dashboard-ui')).toBeInTheDocument();
  });

  it('shows completion percentage on each card', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />);
    const percentages = screen.getAllByText(/50%/);
    expect(percentages).toHaveLength(2); // 4/8 and 6/12
    expect(screen.getByText(/100%/)).toBeInTheDocument(); // 5/5
  });

  it('shows current layer as completed phases on each card', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />);
    // The card shows "X done" for phases, not "Layer X"
    expect(screen.getByText(/2 done/)).toBeInTheDocument();
    expect(screen.getByText(/3 done/)).toBeInTheDocument();
  });

  it('navigates to project board on card click', () => {
    const onNavigate = vi.fn();
    render(<OverviewDashboard projects={testProjects} onNavigate={onNavigate} onAddProject={() => {}} onRemoveProject={() => {}} />);
    fireEvent.click(screen.getByText('auth-feature'));
    expect(onNavigate).toHaveBeenCalledWith('auth-feature');
  });

  it('renders empty state with add project guidance when no projects', () => {
    render(<OverviewDashboard projects={[]} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />);
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();
  });

  it('renders cards in a grid layout', () => {
    const { container } = render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />,
    );
    const grid = container.querySelector('[data-testid="project-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid!.children.length).toBe(3);
  });

  it('shows Add Project button when projects exist', () => {
    render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />,
    );
    expect(screen.getByRole('button', { name: /add project/i })).toBeInTheDocument();
  });

  it('calls onAddProject when Add Project button clicked', () => {
    const onAddProject = vi.fn();
    render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={onAddProject} onRemoveProject={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /add project/i }));
    expect(onAddProject).toHaveBeenCalledOnce();
  });

  it('renders remove button on each project card', () => {
    render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={() => {}} />,
    );
    const removeButtons = screen.getAllByRole('button', { name: /^Remove /i });
    expect(removeButtons).toHaveLength(3);
  });

  it('calls onRemoveProject with projectId when remove clicked', () => {
    const onRemoveProject = vi.fn();
    render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} onAddProject={() => {}} onRemoveProject={onRemoveProject} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remove auth-feature' }));
    expect(onRemoveProject).toHaveBeenCalledWith('auth-feature');
  });
});
