import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OverviewDashboard } from '../components/OverviewDashboard';
import type { ProjectSummary, ProjectId } from '../../shared/types';

afterEach(cleanup);

const createProject = (overrides: Partial<ProjectSummary> & { projectId: string; name: string }): ProjectSummary => ({
  projectId: overrides.projectId as ProjectId,
  name: overrides.name,
  totalSteps: 10,
  completed: 3,
  failed: 0,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-02-28T12:00:00Z',
  ...overrides,
});

const testProjects: readonly ProjectSummary[] = [
  createProject({ projectId: 'auth-feature' as string, name: 'auth-feature', totalSteps: 8, completed: 4, currentLayer: 2 }),
  createProject({ projectId: 'payment-api' as string, name: 'payment-api', totalSteps: 12, completed: 6, currentLayer: 3 }),
  createProject({ projectId: 'dashboard-ui' as string, name: 'dashboard-ui', totalSteps: 5, completed: 5, currentLayer: 1, inProgress: 0 }),
];

describe('OverviewDashboard acceptance', () => {
  it('renders one card per registered project', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} />);
    expect(screen.getByText('auth-feature')).toBeInTheDocument();
    expect(screen.getByText('payment-api')).toBeInTheDocument();
    expect(screen.getByText('dashboard-ui')).toBeInTheDocument();
  });

  it('shows completion percentage on each card', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} />);
    const percentages = screen.getAllByText(/50%/);
    expect(percentages).toHaveLength(2); // 4/8 and 6/12
    expect(screen.getByText(/100%/)).toBeInTheDocument(); // 5/5
  });

  it('shows current layer number on each card', () => {
    render(<OverviewDashboard projects={testProjects} onNavigate={() => {}} />);
    expect(screen.getByText(/Layer 2/)).toBeInTheDocument();
    expect(screen.getByText(/Layer 3/)).toBeInTheDocument();
  });

  it('navigates to project board on card click', () => {
    const onNavigate = vi.fn();
    render(<OverviewDashboard projects={testProjects} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('auth-feature'));
    expect(onNavigate).toHaveBeenCalledWith('auth-feature');
  });

  it('renders empty state when no projects', () => {
    render(<OverviewDashboard projects={[]} onNavigate={() => {}} />);
    expect(screen.getByText(/no projects/i)).toBeInTheDocument();
  });

  it('renders cards in a grid layout', () => {
    const { container } = render(
      <OverviewDashboard projects={testProjects} onNavigate={() => {}} />,
    );
    const grid = container.querySelector('[data-testid="project-grid"]');
    expect(grid).toBeInTheDocument();
    expect(grid!.children.length).toBe(3);
  });
});
