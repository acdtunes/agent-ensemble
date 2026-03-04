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
        projectId="agent-ensemble"
        features={testFeatures}
        onNavigateOverview={vi.fn()}
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('agent-ensemble')).toBeInTheDocument();
  });

  it('clicking Overview breadcrumb calls onNavigateOverview', () => {
    const onNavigateOverview = vi.fn();
    render(
      <ProjectFeatureView
        projectId="agent-ensemble"
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
        projectId="agent-ensemble"
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
        projectId="agent-ensemble"
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
        projectId="agent-ensemble"
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
        projectId="agent-ensemble"
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
          projectId="agent-ensemble"
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
          projectId="agent-ensemble"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Active group header has 2 features
      expect(screen.getByRole('heading', { name: 'Active (2)' })).toBeInTheDocument();
      // Planned group header has 1 feature
      expect(screen.getByRole('heading', { name: 'Planned (1)' })).toBeInTheDocument();
    });

    // --- Behavior 2: Empty groups do not display headers ---
    it('does not display headers for empty groups', () => {
      const features = [activeFeature('Alpha')];

      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={features}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Active group header should be present
      expect(screen.getByRole('heading', { name: 'Active (1)' })).toBeInTheDocument();
      // Empty groups should not render headers (filter buttons still exist but not group headers)
      expect(screen.queryByRole('heading', { name: /Planned/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Completed/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /No Roadmap/ })).not.toBeInTheDocument();
    });

    // --- Behavior 3: Features without roadmaps appear after status groups ---
    it('renders no-roadmap features after status groups', () => {
      const features = [
        noRoadmapFeature('Z-Docs'),
        activeFeature('A-Work'),
      ];

      const { container } = render(
        <ProjectFeatureView
          projectId="agent-ensemble"
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
          projectId="agent-ensemble"
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

  // =============================================================
  // Step 03-01: Search input with real-time filtering
  // =============================================================

  describe('search input with real-time filtering', () => {
    const searchFeatures = [
      activeFeature('Authentication'),
      activeFeature('Dashboard'),
      plannedFeature('User Profile'),
      completedFeature('Login'),
      noRoadmapFeature('Settings'),
    ];

    // --- Behavior 1: Search input visible with placeholder ---
    it('displays search input with placeholder above feature grid', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={searchFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search features...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');

      // Verify search input appears before grid
      const grid = screen.getByTestId('feature-grid');
      expect(searchInput.compareDocumentPosition(grid)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    // --- Behavior 2: Real-time filtering (parametrized for case-insensitivity) ---
    it.each([
      ['auth', ['Authentication']],
      ['AUTH', ['Authentication']],
      ['Auth', ['Authentication']],
      ['dash', ['Dashboard']],
      ['user', ['User Profile']],
      ['log', ['Login']],
      ['set', ['Settings']],
      ['a', ['Authentication', 'Dashboard']], // Matches auth, dash (contains 'a')
    ])('filters features case-insensitively: "%s" shows %j', (searchTerm, expectedNames) => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={searchFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: searchTerm } });

      // All expected names should be visible
      for (const name of expectedNames) {
        expect(screen.getByText(name)).toBeInTheDocument();
      }

      // Features not in expected list should NOT be visible
      const allNames = ['Authentication', 'Dashboard', 'User Profile', 'Login', 'Settings'];
      const hiddenNames = allNames.filter((n) => !expectedNames.includes(n));
      for (const name of hiddenNames) {
        expect(screen.queryByText(name)).not.toBeInTheDocument();
      }
    });

    // --- Behavior 3: Clearing search restores full list ---
    it('clearing search input restores all features', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={searchFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search features...');

      // Type to filter
      fireEvent.change(searchInput, { target: { value: 'auth' } });
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

      // Clear the search
      fireEvent.change(searchInput, { target: { value: '' } });

      // All features restored
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('User Profile')).toBeInTheDocument();
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // --- Behavior 4: No matches displays message ---
    it('displays "No features match your search" when no matches', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={searchFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 'xyz-nonexistent' } });

      expect(screen.getByText('No features match your search')).toBeInTheDocument();
      // No feature cards visible
      expect(screen.queryByText('Authentication')).not.toBeInTheDocument();
    });
  });

  // =============================================================
  // Step 03-02: Filtered header counts
  // =============================================================

  describe('filtered header counts', () => {
    const mixedFeatures = [
      activeFeature('Auth Service'),
      activeFeature('Auth Provider'),
      activeFeature('Dashboard'),
      plannedFeature('User Profile'),
      plannedFeature('Settings Panel'),
      completedFeature('Login Flow'),
      noRoadmapFeature('Legacy Docs'),
    ];

    // --- Behavior 1: Group headers update counts for filtered results ---
    it('updates group header counts to reflect filtered results', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={mixedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Before filtering: Active (3), Planned (2), Completed (1), No Roadmap (1) as group headers
      expect(screen.getByRole('heading', { name: 'Active (3)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Planned (2)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Completed (1)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'No Roadmap (1)' })).toBeInTheDocument();

      // Filter by "auth" - matches Auth Service, Auth Provider (both Active)
      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 'auth' } });

      // After filtering: only Active group header with 2 matches
      expect(screen.getByRole('heading', { name: 'Active (2)' })).toBeInTheDocument();
      // Other group headers should not appear (0 matches)
      expect(screen.queryByRole('heading', { name: /Planned/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Completed/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /No Roadmap/ })).not.toBeInTheDocument();
    });

    // --- Behavior 2: Empty groups hide their headers after filtering ---
    it('hides group headers when filtering results in zero matches for that group', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={mixedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Filter by "profile" - matches only "User Profile" (Planned)
      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 'profile' } });

      // Only Planned group header visible with count 1
      expect(screen.getByRole('heading', { name: 'Planned (1)' })).toBeInTheDocument();
      // All other group headers hidden
      expect(screen.queryByRole('heading', { name: /Active/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /Completed/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /No Roadmap/ })).not.toBeInTheDocument();
    });

    // --- Behavior 3: Multiple groups visible when search matches across groups ---
    it('shows multiple group headers when search matches features in different groups', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={mixedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Filter by "o" - matches: Auth Provider, Dashboard (Active), User Profile (Planned), Login Flow (Completed), Legacy Docs (No Roadmap)
      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 'o' } });

      // Active: Auth Provider + Dashboard (2), Planned: User Profile (1), Completed: Login Flow (1), No Roadmap: Legacy Docs (1)
      // Use heading role to distinguish from filter buttons
      expect(screen.getByRole('heading', { name: 'Active (2)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Planned (1)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Completed (1)' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'No Roadmap (1)' })).toBeInTheDocument();
    });
  });

  // =============================================================
  // Step 03-03: Status filter controls
  // =============================================================

  describe('status filter controls', () => {
    const statusFeatures = [
      activeFeature('Auth Service'),
      activeFeature('Dashboard'),
      plannedFeature('User Profile'),
      plannedFeature('Settings'),
      completedFeature('Login'),
      noRoadmapFeature('Docs'),
    ];

    // --- Behavior 1: Status filter visible with All/Active/Planned/Completed ---
    it('displays status filter with all options and counts', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={statusFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Filter group should be visible
      expect(screen.getByRole('group', { name: 'Filter by status' })).toBeInTheDocument();

      // All options with counts (All = 6, Active = 2, Planned = 2, Completed = 1)
      expect(screen.getByRole('button', { name: 'All (6)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Active (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Planned (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Completed (1)' })).toBeInTheDocument();
    });

    // --- Behavior 2: "All" selected by default ---
    it('has "All" selected by default', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={statusFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', { name: 'All (6)' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Active (2)' })).toHaveAttribute('aria-pressed', 'false');
    });

    // --- Behavior 3: Selecting filter shows only features in that status ---
    it('filters to show only selected status when clicked', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={statusFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Click "Active" filter
      fireEvent.click(screen.getByRole('button', { name: 'Active (2)' }));

      // Only Active features visible
      expect(screen.getByText('Auth Service')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();

      // Other features not visible
      expect(screen.queryByText('User Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Docs')).not.toBeInTheDocument();

      // Active filter is now selected
      expect(screen.getByRole('button', { name: 'Active (2)' })).toHaveAttribute('aria-pressed', 'true');
    });

    // --- Behavior 4: Status filter and search compose as intersection ---
    it('composes search and status filter as intersection', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={statusFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Search for "set" - matches only: Settings (planned)
      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 'set' } });

      // Click "Planned" filter (count should show 1)
      fireEvent.click(screen.getByRole('button', { name: 'Planned (1)' }));

      // Only Settings visible (intersection of search "set" AND status "planned")
      expect(screen.getByText('Settings')).toBeInTheDocument();

      // Other features not visible
      expect(screen.queryByText('Auth Service')).not.toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('User Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Login')).not.toBeInTheDocument();
      expect(screen.queryByText('Docs')).not.toBeInTheDocument();
    });

    // --- Behavior 5: Filter counts update when search text changes ---
    it('updates filter counts when search changes', () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={statusFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Initially: All (6), Active (2), Planned (2), Completed (1)
      expect(screen.getByRole('button', { name: 'All (6)' })).toBeInTheDocument();

      // Search for "s" - matches: Auth Service (active), Dashboard (active), User Profile (planned), Settings (planned), Docs (no-roadmap)
      const searchInput = screen.getByPlaceholderText('Search features...');
      fireEvent.change(searchInput, { target: { value: 's' } });

      // Counts update: All (5), Active (2), Planned (2), Completed (0)
      expect(screen.getByRole('button', { name: 'All (5)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Active (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Planned (2)' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Completed (0)' })).toBeInTheDocument();
    });
  });
});
