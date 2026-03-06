/**
 * Tests for ProjectFeatureView — groups features by status with headers.
 *
 * Driving port: ProjectFeatureView component
 * Acceptance criteria:
 * - Navigation callbacks invoked correctly on user interactions
 * - Features grouped by status with proper header display/hiding
 * - Search and status filters compose as intersection
 * - Archived features section with restore functionality
 * - View mode toggle switches between card and list layouts
 *
 * Test Budget: 7 behaviors × 2 = 14 max unit tests (current: 14)
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { ProjectFeatureView } from "../components/ProjectFeatureView";
import type { FeatureSummary, FeatureId } from "../../shared/types";

afterEach(cleanup);

const makeFeature = (
  id: string,
  overrides: Partial<FeatureSummary> = {},
): FeatureSummary => ({
  featureId: id as FeatureId,
  name: id,
  hasRoadmap: true,
  hasExecutionLog: true,
  totalSteps: 7,
  done: 3,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: "2026-03-01T12:00:00Z",
  ...overrides,
});

// Active: inProgress > 0 OR done > 0 (but not all done)
const activeFeature = (name: string) =>
  makeFeature(name, {
    hasRoadmap: true,
    totalSteps: 5,
    done: 2,
    inProgress: 1,
  });

// Planned: hasRoadmap && totalSteps > 0 && done === 0 && inProgress === 0
const plannedFeature = (name: string) =>
  makeFeature(name, {
    hasRoadmap: true,
    totalSteps: 5,
    done: 0,
    inProgress: 0,
  });

// Completed: totalSteps > 0 && done === totalSteps
const completedFeature = (name: string) =>
  makeFeature(name, {
    hasRoadmap: true,
    totalSteps: 5,
    done: 5,
    inProgress: 0,
  });

// No Roadmap: hasRoadmap === false
const noRoadmapFeature = (name: string) =>
  makeFeature(name, {
    hasRoadmap: false,
    totalSteps: 0,
    done: 0,
    inProgress: 0,
  });

describe("ProjectFeatureView", () => {
  // =============================================================
  // Behavior 1: Navigation callbacks
  // =============================================================

  describe("navigation callbacks", () => {
    const testFeatures = [
      makeFeature("card-redesign", { hasRoadmap: true }),
      makeFeature("kanban-board", { hasRoadmap: false, totalSteps: 0, done: 0, inProgress: 0 }),
    ];

    it("calls onNavigateOverview when Overview breadcrumb clicked", () => {
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
      fireEvent.click(screen.getByText("Overview"));
      expect(onNavigateOverview).toHaveBeenCalledOnce();
    });

    it("calls onNavigateFeatureBoard for features with roadmap, onNavigateFeatureDocs for those without", () => {
      const onNavigateFeatureBoard = vi.fn();
      const onNavigateFeatureDocs = vi.fn();
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={testFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={onNavigateFeatureBoard}
          onNavigateFeatureDocs={onNavigateFeatureDocs}
        />,
      );

      // Click feature with roadmap
      fireEvent.click(
        screen.getByRole("heading", { name: "card-redesign" }).closest('[role="button"]')!,
      );
      expect(onNavigateFeatureBoard).toHaveBeenCalledWith("card-redesign");

      // Click feature without roadmap
      fireEvent.click(
        screen.getByRole("heading", { name: "kanban-board" }).closest('[role="button"]')!,
      );
      expect(onNavigateFeatureDocs).toHaveBeenCalledWith("kanban-board");
    });
  });

  // =============================================================
  // Behavior 2: Empty state handling
  // =============================================================

  it("renders empty state when no features", () => {
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

  // =============================================================
  // Behavior 3: Status group headers display and hiding
  // =============================================================

  describe("status group headers", () => {
    it("displays headers with counts for non-empty groups, hides empty groups", () => {
      const features = [
        activeFeature("Alpha"),
        activeFeature("Beta"),
        plannedFeature("Gamma"),
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

      // Non-empty groups show headers with counts
      expect(screen.getByRole("heading", { name: "Active (2)" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Planned (1)" })).toBeInTheDocument();

      // Empty groups do not show headers
      expect(screen.queryByRole("heading", { name: /Completed/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /No Roadmap/ })).not.toBeInTheDocument();
    });

    it("renders no-roadmap features after status groups in correct order", () => {
      const features = [noRoadmapFeature("Z-Docs"), activeFeature("A-Work")];

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
      const headings = within(grid as HTMLElement).getAllByRole("heading", { level: 2 });
      const headingTexts = headings.map((h) => h.textContent);

      // Active should come before No Roadmap
      expect(headingTexts).toEqual(["Active (1)", "No Roadmap (1)"]);
    });
  });

  // =============================================================
  // Behavior 4: Search filtering
  // =============================================================

  describe("search filtering", () => {
    const searchFeatures = [
      activeFeature("Authentication"),
      activeFeature("Dashboard"),
      plannedFeature("User Profile"),
      completedFeature("Login"),
      noRoadmapFeature("Settings"),
    ];

    it.each([
      ["auth", ["Authentication"]], // lowercase match
      ["AUTH", ["Authentication"]], // uppercase proves case-insensitivity
    ])(
      'filters features case-insensitively: "%s" shows %j',
      (searchTerm, expectedNames) => {
        render(
          <ProjectFeatureView
            projectId="agent-ensemble"
            features={searchFeatures}
            onNavigateOverview={vi.fn()}
            onNavigateFeatureBoard={vi.fn()}
            onNavigateFeatureDocs={vi.fn()}
          />,
        );

        fireEvent.change(screen.getByPlaceholderText("Search features..."), {
          target: { value: searchTerm },
        });

        for (const name of expectedNames) {
          expect(screen.getByRole("heading", { name })).toBeInTheDocument();
        }

        const allNames = ["Authentication", "Dashboard", "User Profile", "Login", "Settings"];
        const hiddenNames = allNames.filter((n) => !expectedNames.includes(n));
        for (const name of hiddenNames) {
          expect(screen.queryByRole("heading", { name })).not.toBeInTheDocument();
        }
      },
    );

    it("clears search to restore all features; shows no-match message for invalid search", () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={searchFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      const searchInput = screen.getByPlaceholderText("Search features...");

      // Filter then clear
      fireEvent.change(searchInput, { target: { value: "auth" } });
      expect(screen.queryByRole("heading", { name: "Dashboard" })).not.toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "" } });
      expect(screen.getByRole("heading", { name: "Authentication" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();

      // No matches message
      fireEvent.change(searchInput, { target: { value: "xyz-nonexistent" } });
      expect(screen.getByText("No features match your search")).toBeInTheDocument();
    });
  });

  // =============================================================
  // Behavior 5: Status filter controls
  // =============================================================

  describe("status filter controls", () => {
    const statusFeatures = [
      activeFeature("Auth Service"),
      activeFeature("Dashboard"),
      plannedFeature("User Profile"),
      completedFeature("Login"),
    ];

    it("filters to show only selected status when clicked", () => {
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
      fireEvent.click(screen.getByRole("button", { name: "Active (2)" }));

      // Only Active features visible
      expect(screen.getByRole("heading", { name: "Auth Service" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "User Profile" })).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Login" })).not.toBeInTheDocument();

      // Active filter is selected
      expect(screen.getByRole("button", { name: "Active (2)" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("composes search and status filter as intersection with updated counts", () => {
      const features = [
        activeFeature("Auth Service"),
        plannedFeature("Auth Config"),
        plannedFeature("Settings Panel"),
        completedFeature("Login Flow"),
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

      // Search for "auth"
      fireEvent.change(screen.getByPlaceholderText("Search features..."), {
        target: { value: "auth" },
      });

      // Filter counts update to reflect search
      expect(screen.getByRole("button", { name: "All (2)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Active (1)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Planned (1)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Completed (0)" })).toBeInTheDocument();

      // Click "Planned" - intersection of search + status
      fireEvent.click(screen.getByRole("button", { name: "Planned (1)" }));
      expect(screen.getByRole("heading", { name: "Auth Config" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Auth Service" })).not.toBeInTheDocument();
    });
  });

  // =============================================================
  // Behavior 6: View mode toggle (card/list)
  // =============================================================

  describe("view mode toggle", () => {
    const viewModeFeatures = [
      activeFeature("Auth Service"),
      plannedFeature("Dashboard"),
    ];

    it("defaults to card mode showing FeatureGrid, toggles to list mode showing FeatureListView", () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={viewModeFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Card mode is default - feature grid present
      expect(screen.getByTestId("feature-grid")).toBeInTheDocument();
      expect(screen.queryByTestId("feature-list-view")).not.toBeInTheDocument();

      // Card button is pressed by default
      expect(screen.getByRole("button", { name: /card/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Click list mode toggle
      fireEvent.click(screen.getByRole("button", { name: /list/i }));

      // List mode - feature list view present
      expect(screen.getByTestId("feature-list-view")).toBeInTheDocument();
      expect(screen.queryByTestId("feature-grid")).not.toBeInTheDocument();

      // List button is now pressed
      expect(screen.getByRole("button", { name: /list/i })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(screen.getByRole("button", { name: /card/i })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("list view displays feature name, status, and progress for each feature", () => {
      render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={viewModeFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Switch to list mode
      fireEvent.click(screen.getByRole("button", { name: /list/i }));

      const listView = screen.getByTestId("feature-list-view");

      // Each feature row shows name, feature-id below, status, progress
      expect(within(listView).getAllByText("Auth Service")).toHaveLength(2);
      expect(within(listView).getByText("Active")).toBeInTheDocument();
      expect(within(listView).getByText("2 of 5")).toBeInTheDocument();

      expect(within(listView).getAllByText("Dashboard")).toHaveLength(2);
      expect(within(listView).getByText("Planned")).toBeInTheDocument();
      expect(within(listView).getByText("0 of 5")).toBeInTheDocument();
    });
  });

  // =============================================================
  // Behavior 7: Archived features section
  // =============================================================

  describe("archived features section (behavior 7)", () => {
    const testFeatures = [activeFeature("Current Feature")];
    const archivedFeatures = [
      { featureId: "old-auth" as FeatureId, name: "Old Auth", archivedAt: "2026-03-01T10:00:00Z" },
      { featureId: "legacy-ui" as FeatureId, name: "Legacy UI", archivedAt: "2026-02-15T14:30:00Z" },
    ];

    it("renders archived section when present, hides when empty", () => {
      const { rerender } = render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={testFeatures}
          archivedFeatures={archivedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
          onRestoreFeature={vi.fn()}
        />,
      );

      // Archived section present with count
      expect(screen.getByRole("button", { name: /Archived.*\(2\)/ })).toBeInTheDocument();

      // Rerender with empty archived
      rerender(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={testFeatures}
          archivedFeatures={[]}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
          onRestoreFeature={vi.fn()}
        />,
      );

      expect(screen.queryByRole("button", { name: /Archived/ })).not.toBeInTheDocument();
    });

    it("calls onRestoreFeature and shows restoring state", () => {
      const onRestoreFeature = vi.fn();

      const { rerender } = render(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={testFeatures}
          archivedFeatures={archivedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
          onRestoreFeature={onRestoreFeature}
        />,
      );

      // Expand and click restore
      fireEvent.click(screen.getByRole("button", { name: /Archived.*\(2\)/ }));
      const restoreButtons = screen.getAllByRole("button", { name: "Restore" });
      fireEvent.click(restoreButtons[0]);

      expect(onRestoreFeature).toHaveBeenCalledWith("old-auth");

      // Rerender with restoring state
      rerender(
        <ProjectFeatureView
          projectId="agent-ensemble"
          features={testFeatures}
          archivedFeatures={archivedFeatures}
          onNavigateOverview={vi.fn()}
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
          onRestoreFeature={onRestoreFeature}
          restoringFeatureId="old-auth"
        />,
      );

      expect(screen.getByText("Restoring...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument(); // Second feature
    });
  });
});
