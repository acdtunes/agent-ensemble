import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectCard, computeCompletionPercentage } from '../components/ProjectCard';
import type { ProjectSummary, ProjectId } from '../../shared/types';

afterEach(cleanup);

const baseProject: ProjectSummary = {
  projectId: 'auth-feature' as ProjectId,
  name: 'auth-feature',
  totalSteps: 10,
  completed: 3,
  failed: 1,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-02-28T12:00:00Z',
};

describe('ProjectCard', () => {
  it('displays project name', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText('auth-feature')).toBeInTheDocument();
  });

  it('displays completion percentage', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/30%/)).toBeInTheDocument();
  });

  it('displays current layer', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/Layer 2/)).toBeInTheDocument();
  });

  it('displays progress bar with correct aria attributes', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '30');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays step counts summary', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/3\s*\/\s*10/)).toBeInTheDocument();
  });

  it('shows failed count when failures exist', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/1 failed/i)).toBeInTheDocument();
  });

  it('hides failed count when no failures', () => {
    const project = { ...baseProject, failed: 0 };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });

  it('shows in-progress count when steps are active', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/2 active/i)).toBeInTheDocument();
  });

  it('calls onNavigate with projectId when clicked', () => {
    const onNavigate = vi.fn();
    render(<ProjectCard project={baseProject} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('auth-feature'));
    expect(onNavigate).toHaveBeenCalledWith('auth-feature');
  });

  it('formats last updated timestamp', () => {
    render(<ProjectCard project={baseProject} onNavigate={() => {}} />);
    expect(screen.getByText(/updated/i)).toBeInTheDocument();
  });

  it('shows 100% for fully completed project', () => {
    const project = { ...baseProject, completed: 10, totalSteps: 10, inProgress: 0, failed: 0 };
    render(<ProjectCard project={project} onNavigate={() => {}} />);
    expect(screen.getByText(/100%/)).toBeInTheDocument();
  });
});

describe('computeCompletionPercentage', () => {
  it('returns percentage rounded to nearest integer', () => {
    expect(computeCompletionPercentage(3, 10)).toBe(30);
  });

  it('returns 0 when total is 0', () => {
    expect(computeCompletionPercentage(0, 0)).toBe(0);
  });

  it('returns 100 when all completed', () => {
    expect(computeCompletionPercentage(10, 10)).toBe(100);
  });

  it('rounds correctly', () => {
    expect(computeCompletionPercentage(1, 3)).toBe(33);
  });
});
