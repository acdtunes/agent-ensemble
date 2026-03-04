/**
 * Tests for ProjectFeatureView — groups features by status with headers.
 *
 * Driving port: ProjectFeatureView component
 * Acceptance criteria:
 * - Non-empty groups display header above their features
 * - Empty groups do not display headers or empty space
 * - Features without roadmaps appear after status groups
 * - Grid layout accommodates full-row group headers
 *
 * Test Budget: 4 behaviors × 2 = 8 max unit tests
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectFeatureView } from '../components/ProjectFeatureView';
import type { FeatureSummary, FeatureId } from '../../shared/types';

afterEach(cleanup);

const makeFeature = (id: string, overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: id as FeatureId,
  name: id,
  hasRoadmap: true,
  hasExecutionLog: true,
  totalSteps: 7,
  done: 3,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-03-01T12:00:00Z',
  ...overrides,
});

// Active: inProgress > 0 OR done > 0 (but not all done)
const activeFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 2, inProgress: 1 });

// Planned: hasRoadmap && totalSteps > 0 && done === 0 && inProgress === 0
const plannedFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 0, inProgress: 0 });

// Completed: totalSteps > 0 && done === totalSteps
const completedFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: true, totalSteps: 5, done: 5, inProgress: 0 });

// No Roadmap: hasRoadmap === false
const noRoadmapFeature = (name: string) =>
  makeFeature(name, { hasRoadmap: false, totalSteps: 0, done: 0, inProgress: 0 });

const testFeatures: readonly FeatureSummary[] = [
  makeFeature('card-redesign', { done: 3, totalSteps: 7, inProgress: 2 }),
  makeFeature('doc-viewer', { done: 2, totalSteps: 5, inProgress: 1 }),
  makeFeature('kanban-board', { hasRoadmap: false, totalSteps: 0, done: 0, inProgress: 0 }),
];

describe('ProjectFeatureView', () => {
  it('renders breadcrumb with Overview / projectId', () => {
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('nw-teams')).toBeInTheDocument();
  });

  it('clicking Overview breadcrumb calls onNavigateOverview', () => {
    const onNavigateOverview = vi.fn();
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={onNavigateOverview}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigateOverview).toHaveBeenCalledOnce();
  });

  it('renders one feature card per feature', () => {
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={testFeatures}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText('card-redesign')).toBeInTheDocument();
    expect(screen.getByText('doc-viewer')).toBeInTheDocument();
    expect(screen.getByText('kanban-board')).toBeInTheDocument();
    // Verify all 3 feature cards are rendered (via role="button")
    const cards = screen.getAllByRole('button').filter((el) => el.closest('[data-testid="feature-grid"]'));
    expect(cards).toHaveLength(3);
  });

  it('clicking feature card with roadmap calls onNavigateFeatureBoard', () => {
    const onNavigateFeatureBoard = vi.fn();
    const features = [makeFeature('card-redesign', { hasRoadmap: true })];
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={onNavigateFeatureBoard}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('card-redesign').closest('[role="button"]')!);
    expect(onNavigateFeatureBoard).toHaveBeenCalledWith('card-redesign');
  });

  it('clicking feature card without roadmap calls onNavigateFeatureDocs', () => {
    const onNavigateFeatureDocs = vi.fn();
    const features = [makeFeature('kanban-board', { hasRoadmap: false, totalSteps: 0, done: 0, inProgress: 0 })];
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={onNavigateFeatureDocs}
      />,
    );
    fireEvent.click(screen.getByText('kanban-board').closest('[role="button"]')!);
    expect(onNavigateFeatureDocs).toHaveBeenCalledWith('kanban-board');
  });

  it('renders empty state when no features', () => {
    render(
      <ProjectFeatureView
        projectId="nw-teams"
        features={[]}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText(/no features/i)).toBeInTheDocument();
  });

  describe('grid responsive breakpoints', () => {
    it('applies correct grid column classes for high-density layout', () => {
      const { container } = render(
        <ProjectFeatureView
          projectId="nw-teams"
          features={testFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );
      const grid = container.querySelector('[data-testid="feature-grid"]');
      expect(grid).toBeInTheDocument();
      // Verify responsive grid classes: 1 col mobile, 4 cols at lg (1024px), 6 cols at xl (1280px)
      expect(grid).toHaveClass('grid-cols-1');
      expect(grid).toHaveClass('lg:grid-cols-4');
      expect(grid).toHaveClass('xl:grid-cols-6');
    });
  });

  // =============================================================
  // Step 02-03: Grouped layout with status headers
  // =============================================================

  describe('grouped layout with status headers', () => {
    // --- Behavior 1: Non-empty groups display header ---
    it('displays header for non-empty groups with count', () => {
      const features = [
        activeFeature('Alpha'),
        activeFeature('Beta'),
        plannedFeature('Gamma'),
      ];

      render(
        <ProjectFeatureView
          projectId="nw-teams"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Active group has 2 features
      expect(screen.getByText('Active (2)')).toBeInTheDocument();
      // Planned group has 1 feature
      expect(screen.getByText('Planned (1)')).toBeInTheDocument();
    });

    // --- Behavior 2: Empty groups do not display headers ---
    it('does not display headers for empty groups', () => {
      const features = [activeFeature('Alpha')];

      render(
        <ProjectFeatureView
          projectId="nw-teams"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      expect(screen.getByText('Active (1)')).toBeInTheDocument();
      // Empty groups should not render headers
      expect(screen.queryByText(/Planned/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
      expect(screen.queryByText(/No Roadmap/)).not.toBeInTheDocument();
    });

    // --- Behavior 3: Features without roadmaps appear after status groups ---
    it('renders no-roadmap features after status groups', () => {
      const features = [
        noRoadmapFeature('Z-Docs'),
        activeFeature('A-Work'),
      ];

      const { container } = render(
        <ProjectFeatureView
          projectId="nw-teams"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const grid = container.querySelector('[data-testid="feature-grid"]');
      const headings = within(grid as HTMLElement).getAllByRole('heading', { level: 2 });
      const headingTexts = headings.map((h) => h.textContent);

      // Active should come before No Roadmap
      expect(headingTexts).toEqual(['Active (1)', 'No Roadmap (1)']);
    });

    // --- Behavior 4: Grid layout accommodates full-row group headers ---
    it('renders group headers as full-row elements in grid', () => {
      const features = [activeFeature('Alpha')];

      render(
        <ProjectFeatureView
          projectId="nw-teams"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const header = screen.getByRole('heading', { level: 2, name: /Active/ });
      expect(header).toHaveClass('col-span-full');
    });
  });
});
