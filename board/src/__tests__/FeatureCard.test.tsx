import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  FeatureCard,
  classifyFeatureDisplayState,
  formatProgressLabel,
} from "../components/FeatureCard";
import type { FeatureSummary, FeatureId } from "../../shared/types";

afterEach(cleanup);

const makeFeature = (overrides: Partial<FeatureSummary> = {}): FeatureSummary => ({
  featureId: "card-redesign" as FeatureId,
  name: "card-redesign",
  hasRoadmap: true,
  hasExecutionLog: true,
  totalSteps: 7,
  done: 3,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: "2026-03-01T12:00:00Z",
  ...overrides,
});

describe("classifyFeatureDisplayState", () => {
  it.each([
    { desc: "null when no roadmap", feature: { hasRoadmap: false, hasExecutionLog: false, totalSteps: 0 }, expected: null },
    { desc: "completed when all done", feature: { done: 7, totalSteps: 7, inProgress: 0 }, expected: "completed" },
    { desc: "active when in progress", feature: { done: 3, inProgress: 2 }, expected: "active" },
    { desc: "active when some done", feature: { done: 3, inProgress: 0, hasExecutionLog: true }, expected: "active" },
    { desc: "planned when no execution log", feature: { hasRoadmap: true, hasExecutionLog: false, totalSteps: 10, done: 0, inProgress: 0 }, expected: "planned" },
    { desc: "planned when no progress", feature: { hasRoadmap: true, hasExecutionLog: true, totalSteps: 10, done: 0, inProgress: 0 }, expected: "planned" },
  ])("returns $desc", ({ feature, expected }) => {
    expect(classifyFeatureDisplayState(makeFeature(feature))).toBe(expected);
  });
});

describe("formatProgressLabel", () => {
  it("formats as 'done of total'", () => {
    expect(formatProgressLabel(3, 7)).toBe("3 of 7");
    expect(formatProgressLabel(0, 10)).toBe("0 of 10");
    expect(formatProgressLabel(5, 5)).toBe("5 of 5");
  });
});

describe("FeatureCard", () => {
  it("displays feature name and progress", () => {
    render(<FeatureCard feature={makeFeature()} />);
    expect(screen.getByTestId("feature-id")).toHaveTextContent("card-redesign");
    expect(screen.getByText("3 of 7")).toBeInTheDocument();
    expect(screen.getByText(/2 in progress/i)).toBeInTheDocument();
  });

  it("calls onClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<FeatureCard feature={makeFeature()} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders primary label above feature-id", () => {
    render(<FeatureCard feature={makeFeature({ shortDescription: "Auth handling" })} />);
    const primaryLabel = screen.getByTestId("feature-primary-label");
    const featureId = screen.getByTestId("feature-id");

    // Verify DOM order: primary label should appear before feature-id
    expect(primaryLabel.compareDocumentPosition(featureId) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("copies feature ID to clipboard without triggering card click", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    const onClick = vi.fn();
    render(<FeatureCard feature={makeFeature()} onClick={onClick} />);

    fireEvent.click(screen.getByTestId("feature-id"));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("card-redesign");
    expect(onClick).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Copied card-redesign"));
  });


  it("renders shortDescription as primary bold label with correct styling", () => {
    render(<FeatureCard feature={makeFeature({ shortDescription: "Auth handling" })} />);
    const primaryLabel = screen.getByTestId("feature-primary-label");

    expect(primaryLabel).toHaveTextContent("Auth handling");
    expect(primaryLabel).toHaveClass("text-sm", "font-semibold", "text-gray-100");
  });

  it("renders feature-id as muted secondary text", () => {
    render(<FeatureCard feature={makeFeature({ shortDescription: "Auth handling" })} />);
    const featureId = screen.getByTestId("feature-id");

    expect(featureId).toHaveTextContent("card-redesign");
    expect(featureId).toHaveClass("text-xs", "text-gray-500");
  });

  it("does not render feature-full-description element", () => {
    render(<FeatureCard feature={makeFeature({
      shortDescription: "Auth handling",
      description: "Complete auth system with OAuth2",
    })} />);

    expect(screen.queryByTestId("feature-full-description")).not.toBeInTheDocument();
  });

  it("falls back to feature.name as primary label when shortDescription is empty", () => {
    render(<FeatureCard feature={makeFeature({ shortDescription: "" })} />);
    const primaryLabel = screen.getByTestId("feature-primary-label");

    expect(primaryLabel).toHaveTextContent("card-redesign");
    expect(primaryLabel).toHaveClass("text-sm", "font-semibold", "text-gray-100");
  });

  it("falls back to feature.name as primary label when shortDescription is undefined", () => {
    render(<FeatureCard feature={makeFeature({ shortDescription: undefined })} />);
    const primaryLabel = screen.getByTestId("feature-primary-label");

    expect(primaryLabel).toHaveTextContent("card-redesign");
    expect(primaryLabel).toHaveClass("text-sm", "font-semibold", "text-gray-100");
  });

  it("archive flow: shows button when projectId provided, confirms and succeeds", async () => {
    const onArchiveSuccess = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

    // No archive button without projectId
    const { rerender } = render(<FeatureCard feature={makeFeature()} />);
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();

    // Archive button appears with projectId
    rerender(<FeatureCard feature={makeFeature()} projectId="my-project" onArchiveSuccess={onArchiveSuccess} />);
    expect(screen.getByRole("button", { name: /archive/i })).toBeInTheDocument();

    // Click opens dialog, confirm triggers success callback
    fireEvent.click(screen.getByRole("button", { name: /archive/i }));
    await waitFor(() => expect(screen.getByText("Archive Feature?")).toBeInTheDocument());

    // The dialog's confirm button is the second Archive button (after the card's archive button)
    const archiveButtons = screen.getAllByRole("button", { name: /archive/i });
    fireEvent.click(archiveButtons[archiveButtons.length - 1]);

    await waitFor(() => expect(onArchiveSuccess).toHaveBeenCalledOnce());
  });
});
