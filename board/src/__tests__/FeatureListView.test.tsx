/**
 * Tests for FeatureListView — compact list layout for features grouped by status.
 *
 * Driving port: FeatureListView component
 * Test Budget: 4 behaviors × 2 = 8 max unit tests
 *
 * Behaviors:
 * 1. Renders groups with headers and feature rows
 * 2. Navigation callbacks on row click
 * 3. Test ID for parent container
 * 4. Dual-label rendering (shortDescription + feature.name) with fallback
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
import { FeatureListView } from "../components/FeatureListView";
import type { FeatureGroup } from "../utils/featureGrouping";
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
  totalSteps: 5,
  done: 2,
  inProgress: 1,
  currentLayer: 2,
  updatedAt: "2026-03-01T12:00:00Z",
  ...overrides,
});

const testGroups: readonly FeatureGroup[] = [
  {
    key: "active",
    displayName: "Active",
    features: [
      makeFeature("auth-service", { totalSteps: 10, done: 5, inProgress: 2 }),
      makeFeature("dashboard", { totalSteps: 8, done: 3, inProgress: 1 }),
    ],
  },
  {
    key: "planned",
    displayName: "Planned",
    features: [
      makeFeature("user-profile", { totalSteps: 6, done: 0, inProgress: 0 }),
    ],
  },
];

describe("FeatureListView", () => {
  // --- Behavior 1: Renders groups with headers and feature rows ---
  it("renders group headers with counts and feature rows", () => {
    render(
      <FeatureListView
        groups={testGroups}
        projectId="test-project"
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );

    // Group headers with counts
    expect(
      screen.getByRole("heading", { name: "Active (2)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Planned (1)" }),
    ).toBeInTheDocument();

    // Feature rows with name, feature-id, status, progress
    const rows = screen.getAllByRole("button");
    expect(within(rows[0]).getAllByText("auth-service")).toHaveLength(2);
    expect(within(rows[0]).getByText("5 of 10")).toBeInTheDocument();

    expect(within(rows[2]).getAllByText("user-profile")).toHaveLength(2);
    expect(within(rows[2]).getByText("0 of 6")).toBeInTheDocument();
  });

  // --- Behavior 2: Navigation callbacks on row click ---
  it("calls correct navigation callback when feature row clicked", () => {
    const noRoadmapGroups: readonly FeatureGroup[] = [
      {
        key: "active",
        displayName: "Active",
        features: [makeFeature("with-roadmap", { hasRoadmap: true })],
      },
      {
        key: "no-roadmap",
        displayName: "No Roadmap",
        features: [
          makeFeature("without-roadmap", {
            hasRoadmap: false,
            totalSteps: 0,
            done: 0,
            inProgress: 0,
          }),
        ],
      },
    ];

    const onNavigateFeatureBoard = vi.fn();
    const onNavigateFeatureDocs = vi.fn();

    render(
      <FeatureListView
        groups={noRoadmapGroups}
        projectId="test-project"
        onNavigateFeatureBoard={onNavigateFeatureBoard}
        onNavigateFeatureDocs={onNavigateFeatureDocs}
      />,
    );

    // Click feature with roadmap
    const rows = screen.getAllByRole("button");
    fireEvent.click(rows[0]);
    expect(onNavigateFeatureBoard).toHaveBeenCalledWith("with-roadmap");

    // Click feature without roadmap
    fireEvent.click(rows[1]);
    expect(onNavigateFeatureDocs).toHaveBeenCalledWith("without-roadmap");
  });

  // --- Behavior 3: Test ID for parent container ---
  it("renders with feature-list-view test ID", () => {
    render(
      <FeatureListView
        groups={testGroups}
        projectId="test-project"
        onNavigateFeatureBoard={vi.fn()}
        onNavigateFeatureDocs={vi.fn()}
      />,
    );

    expect(screen.getByTestId("feature-list-view")).toBeInTheDocument();
  });

  // --- Behavior 4: Dual-label rendering with shortDescription + feature.name ---
  describe("dual-label rendering", () => {
    it("renders shortDescription as primary label and feature.name as secondary when shortDescription present", () => {
      const groupsWithShortDesc: readonly FeatureGroup[] = [
        {
          key: "active",
          displayName: "Active",
          features: [
            makeFeature("auth-service", {
              name: "auth-service",
              shortDescription: "User Authentication",
            }),
          ],
        },
      ];

      render(
        <FeatureListView
          groups={groupsWithShortDesc}
          projectId="test-project"
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Primary label: shortDescription with font-medium text-gray-100
      const primaryLabel = screen.getByText("User Authentication");
      expect(primaryLabel).toBeInTheDocument();
      expect(primaryLabel).toHaveClass("font-medium", "text-gray-100");

      // Secondary label: featureId with text-xs text-gray-500
      const featureIdLabels = screen.getAllByText("auth-service");
      const secondaryLabel = featureIdLabels.find((el) =>
        el.classList.contains("text-xs"),
      );
      expect(secondaryLabel).toBeDefined();
      expect(secondaryLabel).toHaveClass("text-xs", "text-gray-500");
    });

    it("renders only feature.name as primary label when shortDescription is absent", () => {
      const groupsWithoutShortDesc: readonly FeatureGroup[] = [
        {
          key: "active",
          displayName: "Active",
          features: [
            makeFeature("dashboard", {
              name: "dashboard",
              shortDescription: undefined,
            }),
          ],
        },
      ];

      render(
        <FeatureListView
          groups={groupsWithoutShortDesc}
          projectId="test-project"
          onNavigateFeatureBoard={vi.fn()}
          onNavigateFeatureDocs={vi.fn()}
        />,
      );

      // Primary label: feature.name with font-medium text-gray-100
      const allDashboardElements = screen.getAllByText("dashboard");
      const primaryLabel = allDashboardElements.find((el) =>
        el.classList.contains("font-medium"),
      );
      expect(primaryLabel).toBeDefined();
      expect(primaryLabel).toHaveClass("font-medium", "text-gray-100");

      // Feature ID shown below
      const featureIdLabel = allDashboardElements.find((el) =>
        el.classList.contains("text-xs"),
      );
      expect(featureIdLabel).toBeDefined();
      expect(featureIdLabel).toHaveClass("text-xs", "text-gray-500");
    });
  });
});
