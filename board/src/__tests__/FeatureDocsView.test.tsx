/**
 * Tests for FeatureDocsView — wraps DocViewer with context dropdowns.
 *
 * Driving port: FeatureDocsView component props
 * Acceptance criteria:
 * - Doc tree shows only files within selected feature directory
 * - Feature with no documentation shows empty state with guidance
 * - Feature dropdown lists all features including docs-only
 *
 * Note: Breadcrumb and Board/Docs tabs are rendered by FeatureNavHeader
 * in the PageShell header (tested via App-level routing tests).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
  MultiRootDocTree,
  FeatureSummary,
  FeatureId,
} from '../../shared/types';

// --- Computed path prevents static resolution before file exists ---

const COMPONENT_PATH = ['..', 'components', 'FeatureDocsView'].join('/');

// --- Fixtures ---

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

const makeMultiRootDocTree = (roots: readonly { label: string; folders: readonly { name: string; files: readonly string[] }[] }[]): MultiRootDocTree => ({
  roots: roots.map(rootEntry => ({
    label: rootEntry.label,
    root: rootEntry.folders.map(folder => ({
      type: 'directory' as const,
      name: folder.name,
      path: folder.name,
      children: folder.files.map(file => ({
        type: 'file' as const,
        name: file,
        path: `${folder.name}/${file}`,
      })),
    })),
    fileCount: rootEntry.folders.reduce((sum, f) => sum + f.files.length, 0),
  })),
  totalFileCount: roots.reduce((sum, r) => sum + r.folders.reduce((s, f) => s + f.files.length, 0), 0),
});

const makeEmptyMultiRootDocTree = (): MultiRootDocTree => ({ roots: [], totalFileCount: 0 });

afterEach(cleanup);

// --- Component acceptance tests ---

describe('FeatureDocsView acceptance', () => {
  it('renders doc tree scoped to feature directory', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const tree = makeMultiRootDocTree([
      { label: 'feature', folders: [{ name: 'design', files: ['architecture-design.md'] }] },
      { label: 'ux', folders: [{ name: 'discuss', files: ['jtbd-analysis.md'] }] },
      { label: 'requirements', folders: [{ name: 'distill', files: [] }] },
    ]);

    render(
      <FeatureDocsView
        projectId="agent-ensemble"
        featureId="card-redesign"
        tree={tree}
        features={[makeFeature('card-redesign')]}
      />,
    );

    const docViewer = screen.getByTestId('multi-root-doc-viewer');
    expect(docViewer).toBeInTheDocument();
    // Tree displays labeled sections
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('UX & Journey')).toBeInTheDocument();
    expect(screen.getByText('Requirements')).toBeInTheDocument();
  });

  it('shows empty state when feature has no documentation', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);

    render(
      <FeatureDocsView
        projectId="agent-ensemble"
        featureId="new-feature"
        tree={makeEmptyMultiRootDocTree()}
        features={[makeFeature('new-feature')]}
      />,
    );

    expect(screen.getByText(/no documentation found/i)).toBeInTheDocument();
  });

  it('feature dropdown lists all features including docs-only', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const features = [
      makeFeature('card-redesign', { hasRoadmap: true }),
      makeFeature('kanban-board', { hasRoadmap: false }),
      makeFeature('doc-viewer', { hasRoadmap: true }),
    ];

    render(
      <FeatureDocsView
        projectId="agent-ensemble"
        featureId="card-redesign"
        tree={makeEmptyMultiRootDocTree()}
        features={features}
      />,
    );

    const featureSelect = screen.getByTestId('feature-dropdown');
    const options = within(featureSelect).getAllByRole('option');
    const optionLabels = options.map(o => o.textContent);
    // ALL features visible — including docs-only (kanban-board has hasRoadmap: false)
    expect(optionLabels).toContain('card-redesign');
    expect(optionLabels).toContain('kanban-board');
    expect(optionLabels).toContain('doc-viewer');
  });
});
