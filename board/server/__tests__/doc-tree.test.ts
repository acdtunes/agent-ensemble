/**
 * Server-side tests: Doc Tree pure functions
 *
 * Driving port: buildDocTree, sortNodes pure functions (server pure core)
 * Validates: tree construction from DirEntry[], sorting order, .md filtering, edge cases
 *
 * These are pure function tests -- no filesystem mocks needed.
 * Effect functions (scanDocsDir) are tested separately with filesystem mocks.
 */

import { describe, it, expect } from 'vitest';

// Computed path prevents Vite from statically resolving the import before the file exists.
const DOC_TREE_MODULE_PATH = ['..', '..', 'server', 'doc-tree'].join('/');

// --- DirEntry helpers (mirror the production type) ---

interface DirEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
}

const file = (name: string, path: string): DirEntry => ({
  name, path, isDirectory: false,
});

const dir = (name: string, path: string): DirEntry => ({
  name, path, isDirectory: true,
});

// =================================================================
// buildDocTree: basic tree construction
// =================================================================
describe('buildDocTree: constructs DocTree from flat DirEntry array', () => {
  it('builds a tree with files at root level', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given flat directory entries with two markdown files
    const entries: readonly DirEntry[] = [
      file('README.md', 'README.md'),
      file('CHANGELOG.md', 'CHANGELOG.md'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then the tree contains 2 file nodes
    expect(tree.root).toHaveLength(2);
    expect(tree.fileCount).toBe(2);
    expect(tree.root[0].type).toBe('file');
    expect(tree.root[1].type).toBe('file');
  });

  it('builds nested tree from flat entries with path separators', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given flat entries representing a nested structure
    const entries: readonly DirEntry[] = [
      dir('adrs', 'adrs'),
      file('ADR-001.md', 'adrs/ADR-001.md'),
      file('ADR-002.md', 'adrs/ADR-002.md'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then the tree has one directory node with two file children
    expect(tree.root).toHaveLength(1);
    expect(tree.root[0].type).toBe('directory');
    if (tree.root[0].type === 'directory') {
      expect(tree.root[0].children).toHaveLength(2);
    }
    expect(tree.fileCount).toBe(2);
  });

  it('handles empty entries producing empty tree', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given no directory entries
    const entries: readonly DirEntry[] = [];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then the tree is empty
    expect(tree.root).toHaveLength(0);
    expect(tree.fileCount).toBe(0);
  });

  it('handles deeply nested structure (4 levels)', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given entries nested 4 levels deep
    const entries: readonly DirEntry[] = [
      dir('features', 'features'),
      dir('card-redesign', 'features/card-redesign'),
      dir('discuss', 'features/card-redesign/discuss'),
      dir('jtbd', 'features/card-redesign/discuss/jtbd'),
      file('analysis.md', 'features/card-redesign/discuss/jtbd/analysis.md'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then 4 levels of nesting are preserved
    expect(tree.root).toHaveLength(1);
    expect(tree.fileCount).toBe(1);
    const level1 = tree.root[0];
    expect(level1.type).toBe('directory');
    if (level1.type === 'directory') {
      const level2 = level1.children[0];
      expect(level2.type).toBe('directory');
      if (level2.type === 'directory') {
        const level3 = level2.children[0];
        expect(level3.type).toBe('directory');
      }
    }
  });
});

// =================================================================
// sortNodes: ordering directories before files, both alphabetical
// =================================================================
describe('sortNodes: orders directories before files alphabetically', () => {
  it('places directories first, then files, both alphabetically', async () => {
    const { sortNodes } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given an unsorted array of DocNodes
    const nodes = [
      { type: 'file' as const, name: 'README', path: 'README.md' },
      { type: 'directory' as const, name: 'features', path: 'features', children: [] },
      { type: 'file' as const, name: 'CHANGELOG', path: 'CHANGELOG.md' },
      { type: 'directory' as const, name: 'adrs', path: 'adrs', children: [] },
    ];

    // When sorted
    const sorted = sortNodes(nodes);

    // Then directories come first (adrs, features), then files (CHANGELOG, README)
    expect(sorted[0].name).toBe('adrs');
    expect(sorted[1].name).toBe('features');
    expect(sorted[2].name).toBe('CHANGELOG');
    expect(sorted[3].name).toBe('README');
  });

  it('handles all files (no directories)', async () => {
    const { sortNodes } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    const nodes = [
      { type: 'file' as const, name: 'zebra', path: 'zebra.md' },
      { type: 'file' as const, name: 'alpha', path: 'alpha.md' },
    ];

    const sorted = sortNodes(nodes);

    expect(sorted[0].name).toBe('alpha');
    expect(sorted[1].name).toBe('zebra');
  });

  it('handles empty array', async () => {
    const { sortNodes } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);
    expect(sortNodes([])).toEqual([]);
  });
});

// =================================================================
// buildDocTree: filters to .md files only
// =================================================================
describe('buildDocTree: filters non-markdown files', () => {
  it('excludes files without .md extension', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given entries including non-markdown files
    const entries: readonly DirEntry[] = [
      file('README.md', 'README.md'),
      file('diagram.png', 'diagram.png'),
      file('notes.txt', 'notes.txt'),
      file('config.yaml', 'config.yaml'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then only the .md file is included
    expect(tree.fileCount).toBe(1);
    expect(tree.root).toHaveLength(1);
    expect(tree.root[0].name).toMatch(/README/);
  });

  it('excludes hidden directories', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given entries including hidden directories
    const entries: readonly DirEntry[] = [
      dir('.git', '.git'),
      file('readme.md', '.git/readme.md'),
      file('README.md', 'README.md'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then hidden directories and their contents are excluded
    expect(tree.fileCount).toBe(1);
    expect(tree.root.find((n: { name: string }) => n.name === '.git')).toBeUndefined();
  });
});

// =================================================================
// buildDocTree: file count accuracy
// =================================================================
describe('buildDocTree: file count matches actual file nodes', () => {
  it('counts files across all nesting levels', async () => {
    const { buildDocTree } = await import(/* @vite-ignore */ DOC_TREE_MODULE_PATH);

    // Given entries with files at various levels
    const entries: readonly DirEntry[] = [
      file('root.md', 'root.md'),
      dir('adrs', 'adrs'),
      file('ADR-001.md', 'adrs/ADR-001.md'),
      file('ADR-002.md', 'adrs/ADR-002.md'),
      dir('features', 'features'),
      dir('design', 'features/design'),
      file('arch.md', 'features/design/arch.md'),
    ];

    // When the tree is built
    const tree = buildDocTree(entries);

    // Then fileCount is 4 (root.md + 2 ADRs + arch.md)
    expect(tree.fileCount).toBe(4);
  });
});
