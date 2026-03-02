/**
 * Tests for FeatureDocsView — wraps DocViewer with context dropdowns and tabs.
 *
 * Driving port: FeatureDocsView component props
 * Acceptance criteria:
 * - Doc tree shows only files within selected feature directory
 * - Feature with no documentation shows empty state with guidance
 * - Board-Docs tab switching preserves project and feature context
 * - Feature dropdown lists all features including docs-only
 * - Project dropdown switching navigates to feature list for new project
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
  DocTree,
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
  completed: 3,
  failed: 0,
  inProgress: 2,
  currentLayer: 2,
  updatedAt: '2026-03-01T12:00:00Z',
  ...overrides,
});

const makeDocTree = (folders: readonly { name: string; files: readonly string[] }[]): DocTree => ({
  root: folders.map(folder => ({
    type: 'directory' as const,
    name: folder.name,
    path: folder.name,
    children: folder.files.map(file => ({
      type: 'file' as const,
      name: file,
      path: `${folder.name}/${file}`,
    })),
  })),
  fileCount: folders.reduce((sum, f) => sum + f.files.length, 0),
});

const makeEmptyDocTree = (): DocTree => ({ root: [], fileCount: 0 });

afterEach(cleanup);

// --- Component acceptance tests ---

describe('FeatureDocsView acceptance', () => {
  it('renders doc tree scoped to feature directory', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const tree = makeDocTree([
      { name: 'discuss', files: ['jtbd-analysis.md', 'journey-card-monitoring.md'] },
      { name: 'design', files: ['architecture-design.md'] },
      { name: 'distill', files: [] },
    ]);

    render(
      <FeatureDocsView
        projectId="nw-teams"
        featureId="card-redesign"
        tree={tree}
        features={[makeFeature('card-redesign')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const docViewer = screen.getByTestId('doc-viewer');
    expect(docViewer).toBeInTheDocument();
    // Tree displays feature-scoped folders
    expect(screen.getByText('discuss')).toBeInTheDocument();
    expect(screen.getByText('design')).toBeInTheDocument();
    expect(screen.getByText('distill')).toBeInTheDocument();
  });

  it('shows empty state when feature has no documentation', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);

    render(
      <FeatureDocsView
        projectId="nw-teams"
        featureId="new-feature"
        tree={makeEmptyDocTree()}
        features={[makeFeature('new-feature')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    expect(screen.getByText(/no documentation found/i)).toBeInTheDocument();
  });

  it('shows breadcrumb with "Overview / {project} / {feature}"', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const tree = makeDocTree([{ name: 'discuss', files: ['readme.md'] }]);

    render(
      <FeatureDocsView
        projectId="nw-teams"
        featureId="card-redesign"
        tree={tree}
        features={[makeFeature('card-redesign')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toHaveTextContent('Overview');
    expect(breadcrumb).toHaveTextContent('nw-teams');
    expect(breadcrumb).toHaveTextContent('card-redesign');
  });

  it('Board tab links to feature board URL preserving context', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);

    render(
      <FeatureDocsView
        projectId="my-project"
        featureId="auth-flow"
        tree={makeEmptyDocTree()}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const boardTab = screen.getByRole('link', { name: /^Board$/i });
    expect(boardTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/board');
  });

  it('Docs tab links to feature docs URL preserving context', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);

    render(
      <FeatureDocsView
        projectId="my-project"
        featureId="auth-flow"
        tree={makeEmptyDocTree()}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
      />,
    );

    const docsTab = screen.getByRole('link', { name: /^Docs$/i });
    expect(docsTab).toHaveAttribute('href', '#/projects/my-project/features/auth-flow/docs');
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
        projectId="nw-teams"
        featureId="card-redesign"
        tree={makeEmptyDocTree()}
        features={features}
        onNavigateOverview={vi.fn()}
        onNavigateProject={vi.fn()}
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

  it('breadcrumb Overview is clickable and calls onNavigateOverview', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const onNavigateOverview = vi.fn();

    render(
      <FeatureDocsView
        projectId="nw-teams"
        featureId="card-redesign"
        tree={makeEmptyDocTree()}
        features={[makeFeature('card-redesign')]}
        onNavigateOverview={onNavigateOverview}
        onNavigateProject={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigateOverview).toHaveBeenCalledOnce();
  });

  it('breadcrumb project name is clickable and calls onNavigateProject', async () => {
    const { FeatureDocsView } = await import(/* @vite-ignore */ COMPONENT_PATH);
    const onNavigateProject = vi.fn();

    render(
      <FeatureDocsView
        projectId="my-project"
        featureId="auth-flow"
        tree={makeEmptyDocTree()}
        features={[makeFeature('auth-flow')]}
        onNavigateOverview={vi.fn()}
        onNavigateProject={onNavigateProject}
      />,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    fireEvent.click(within(breadcrumb).getByText('my-project'));
    expect(onNavigateProject).toHaveBeenCalledOnce();
  });
});
