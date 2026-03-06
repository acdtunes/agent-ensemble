/**
 * Unit Tests: DocViewer Component
 *
 * Tests the DocViewer component renders DocTree with correct default expansion state.
 * Project-level docs should start collapsed (defaultExpanded=false).
 *
 * Driving port: DocViewer component (rendered with test props)
 * Observable outcome: DocTree receives defaultExpanded={false} prop
 *
 * Test Budget: 1 behavior × 2 = 2 unit tests max
 * Behaviors tested:
 *   1. DocViewer passes defaultExpanded=false to DocTree
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { DocViewer } from '../components/DocViewer';
import type { DocTree } from '../../shared/types';

// Mock DocTree to capture props
const mockDocTreeProps = vi.fn();

vi.mock('../components/DocTree', () => ({
  DocTree: (props: unknown) => {
    mockDocTreeProps(props);
    return <div data-testid="mock-doc-tree">DocTree</div>;
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Test fixture: minimal doc tree with one file
const createMinimalDocTree = (): DocTree => ({
  root: [
    {
      type: 'directory',
      name: 'docs',
      path: 'docs',
      children: [
        { type: 'file', name: 'README.md', path: 'docs/README.md' },
      ],
    },
  ],
  fileCount: 1,
});

describe('DocViewer', () => {
  describe('default expansion behavior', () => {
    it('renders DocTree with defaultExpanded=false for project-level docs', () => {
      // Arrange
      const tree = createMinimalDocTree();

      // Act
      render(
        <DocViewer
          projectId="test-project"
          tree={tree}
        />
      );

      // Assert - DocTree should receive defaultExpanded=false
      expect(mockDocTreeProps).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultExpanded: false,
        })
      );
    });
  });
});
