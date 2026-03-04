/**
 * Walking Skeleton Acceptance Tests: Documentation Viewer
 *
 * These tests prove observable user value end-to-end.
 * Each answers: "Can Andres accomplish this goal and see the result?"
 *
 * Driving ports exercised:
 *   - DocTree component (rendered via props)
 *   - DocContent component (rendered via props)
 *   - CopyPathButton component (rendered via props)
 *
 * Gherkin reference: walking-skeleton.feature
 *
 * Walking skeletons validate the full integration across user stories (US-01
 * through US-04). They are enabled after all focused scenarios pass.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  createNwTeamsDocTree,
  createMarkdownWithHeadings,
  createMarkdownWithCodeBlock,
} from './test-fixtures';

afterEach(cleanup);

// Computed paths prevent Vite from statically resolving imports before files exist.
const DOC_TREE_PATH = ['..', '..', '..', '..', 'components', 'DocTree'].join('/');
const DOC_CONTENT_PATH = ['..', '..', '..', '..', 'components', 'DocContent'].join('/');
const COPY_PATH_BUTTON_PATH = ['..', '..', '..', '..', 'components', 'CopyPathButton'].join('/');
const DOC_VIEWER_PATH = ['..', '..', '..', '..', 'components', 'DocViewer'].join('/');

// =================================================================
// Walking Skeleton 1: Andres navigates to docs, selects a document,
// and reads its content
// =================================================================
describe('Walking Skeleton: Andres navigates to docs, selects a document, and reads its content', () => {
  it('doc viewer shows tree, selecting a doc renders content with file path', async () => {
    // This skeleton exercises the full flow: tree -> select -> render -> path display
    // Dynamic imports since components do not exist yet
    const { DocViewer } = await import(/* @vite-ignore */ DOC_VIEWER_PATH);

    // Given Andres is viewing the board for project "nw-teams"
    // And the project has documentation with 3 ADRs and 2 feature folders
    const tree = createNwTeamsDocTree();
    const mockFetchContent = vi.fn().mockResolvedValue(createMarkdownWithHeadings());

    // When he clicks the "Docs" tab (simulated by rendering the doc viewer)
    render(
      <DocViewer
        projectId="nw-teams"
        tree={tree}
        fetchContent={mockFetchContent}
      />,
    );

    // Then the doc viewer loads showing the document tree in the sidebar
    expect(screen.getByText('adrs')).toBeInTheDocument();
    // And the tree shows folder badges with file counts
    const badges = screen.getAllByText(/\d+/);
    expect(badges.length).toBeGreaterThan(0);

    // When he clicks on "ADR-001-state-management.md" in the tree
    fireEvent.click(screen.getByText('ADR-001-state-management'));

    // Then the content panel renders the document with formatted headings
    await waitFor(() => {
      expect(screen.getByText('Main Title')).toBeInTheDocument();
    });
    // And the file path is displayed above the content
    expect(screen.getByText('docs/adrs/ADR-001-state-management.md')).toBeInTheDocument();
  });
});

// =================================================================
// Walking Skeleton 2: Andres copies a document path for AI agent prompting
// =================================================================
describe('Walking Skeleton: Andres copies a document path for AI agent prompting', () => {
  it('copy button copies the path to clipboard with confirmation', async () => {
    const { CopyPathButton } = await import(/* @vite-ignore */ COPY_PATH_BUTTON_PATH);

    // Given Andres is viewing the document "docs/adrs/ADR-001-state-management.md"
    const filePath = 'docs/adrs/ADR-001-state-management.md';
    let clipboardContent = '';
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(async (text: string) => {
          clipboardContent = text;
        }),
      },
    });

    // And the file path is displayed above the rendered content
    render(<CopyPathButton filePath={filePath} />);
    expect(screen.getByText(filePath)).toBeInTheDocument();

    // When he clicks the copy button next to the path
    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);

    // Then the path is copied to the clipboard
    await waitFor(() => {
      expect(clipboardContent).toBe(filePath);
    });
    // And the button shows "Copied!" confirmation
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});

// =================================================================
// Walking Skeleton 3: Andres searches for a document by filename keyword
// NOTE: Search functionality not yet implemented in DocTree component
// See milestone-4-document-search.feature (scenarios marked @skip)
// =================================================================
