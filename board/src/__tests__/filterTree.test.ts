/**
 * Unit tests for filterTree pure function.
 *
 * filterTree: (tree: DocTree, query: string) => DocTree
 *
 * Behaviors tested:
 *   1. Empty query returns original tree unchanged
 *   2. Matching files are retained with parent folder context
 *   3. Non-matching files are pruned
 *   4. Empty directories (no matching descendants) are pruned
 *   5. Case-insensitive matching
 *   6. No matches returns empty root
 *   7. Property: clearing search always restores original tree
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { DocTree, DocNode } from '../../shared/types';
import { filterTree } from '../utils/filterTree';

// --- Helpers ---

const file = (name: string, path: string): DocNode => ({
  type: 'file',
  name,
  path,
});

const dir = (name: string, path: string, children: readonly DocNode[]): DocNode => ({
  type: 'directory',
  name,
  path,
  children,
});

const tree = (nodes: readonly DocNode[]): DocTree => ({
  root: nodes,
  fileCount: countFiles(nodes),
});

const countFiles = (nodes: readonly DocNode[]): number =>
  nodes.reduce(
    (sum, n) => (n.type === 'file' ? sum + 1 : sum + countFiles(n.children)),
    0,
  );

// --- Collect all file names from a tree ---

const collectFileNames = (nodes: readonly DocNode[]): string[] =>
  nodes.flatMap(n =>
    n.type === 'file' ? [n.name] : collectFileNames(n.children),
  );

// --- Tests ---

describe('filterTree', () => {
  // Behavior 1: empty query returns original tree
  it('returns original tree when query is empty string', () => {
    const input = tree([
      dir('docs', 'docs', [
        file('readme', 'docs/readme.md'),
        file('changelog', 'docs/changelog.md'),
      ]),
    ]);

    const result = filterTree(input, '');

    expect(result).toEqual(input);
  });

  // Behavior 2: matching files retained with parent context
  it('retains matching files with their parent directory context', () => {
    const input = tree([
      dir('adrs', 'adrs', [
        file('ADR-001-state-management', 'adrs/ADR-001-state-management.md'),
        file('ADR-002-rendering', 'adrs/ADR-002-rendering.md'),
      ]),
    ]);

    const result = filterTree(input, 'state');

    expect(collectFileNames(result.root)).toEqual(['ADR-001-state-management']);
    // Parent directory retained for context
    expect(result.root).toHaveLength(1);
    expect(result.root[0].type).toBe('directory');
    expect(result.root[0].name).toBe('adrs');
  });

  // Behavior 3: non-matching files pruned
  it('prunes files that do not match the query', () => {
    const input = tree([
      file('alpha', 'alpha.md'),
      file('beta', 'beta.md'),
      file('gamma', 'gamma.md'),
    ]);

    const result = filterTree(input, 'alpha');

    expect(collectFileNames(result.root)).toEqual(['alpha']);
  });

  // Behavior 4: empty directories pruned
  it('removes directories with no matching descendants', () => {
    const input = tree([
      dir('empty-folder', 'empty-folder', [
        file('no-match', 'empty-folder/no-match.md'),
      ]),
      dir('has-match', 'has-match', [
        file('target-doc', 'has-match/target-doc.md'),
      ]),
    ]);

    const result = filterTree(input, 'target');

    expect(result.root).toHaveLength(1);
    expect(result.root[0].name).toBe('has-match');
  });

  // Behavior 5: case-insensitive matching
  it('matches case-insensitively', () => {
    const input = tree([
      file('Architecture-Design', 'Architecture-Design.md'),
      file('other-doc', 'other-doc.md'),
    ]);

    const result = filterTree(input, 'ARCHITECTURE');

    expect(collectFileNames(result.root)).toEqual(['Architecture-Design']);
  });

  // Behavior 6: no matches returns empty root
  it('returns empty root when no files match', () => {
    const input = tree([
      dir('adrs', 'adrs', [
        file('ADR-001', 'adrs/ADR-001.md'),
      ]),
    ]);

    const result = filterTree(input, 'kubernetes');

    expect(result.root).toEqual([]);
    expect(result.fileCount).toBe(0);
  });

  // Behavior 7: nested matching preserves deep parent context
  it('preserves nested directory chain for deeply nested matches', () => {
    const input = tree([
      dir('feature', 'feature', [
        dir('card-redesign', 'feature/card-redesign', [
          dir('design', 'feature/card-redesign/design', [
            file('architecture-design', 'feature/card-redesign/design/architecture-design.md'),
          ]),
        ]),
      ]),
    ]);

    const result = filterTree(input, 'architecture');

    // Full path context preserved: feature > card-redesign > design > architecture-design
    expect(result.root).toHaveLength(1);
    const featureDir = result.root[0];
    expect(featureDir.type).toBe('directory');
    expect(featureDir.name).toBe('feature');
    if (featureDir.type === 'directory') {
      expect(featureDir.children).toHaveLength(1);
      expect(featureDir.children[0].name).toBe('card-redesign');
    }
  });

  // Behavior 8: fileCount reflects filtered count
  it('updates fileCount to reflect only matching files', () => {
    const input = tree([
      file('alpha', 'alpha.md'),
      file('beta', 'beta.md'),
      file('gamma', 'gamma.md'),
    ]);

    const result = filterTree(input, 'alpha');

    expect(result.fileCount).toBe(1);
  });
});

// --- Property-based test: US-04 Scenario 9 ---

describe('filterTree property: clearing search restores original tree', () => {
  // Arbitrary for DocNode (file or directory)
  const docNodeArb: fc.Arbitrary<DocNode> = fc.letrec<{ node: DocNode; fileNode: DocNode; dirNode: DocNode }>(tie => ({
    node: fc.oneof(
      { depthSize: 'small' },
      tie('fileNode'),
      tie('dirNode'),
    ),
    fileNode: fc.record({
      type: fc.constant('file' as const),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
      path: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')),
    }),
    dirNode: fc.record({
      type: fc.constant('directory' as const),
      name: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes('/')),
      path: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\0')),
      children: fc.array(tie('node'), { maxLength: 5 }),
    }),
  })).node;

  const docTreeArb: fc.Arbitrary<DocTree> = fc
    .array(docNodeArb, { maxLength: 10 })
    .map(nodes => ({ root: nodes, fileCount: countFiles(nodes) }));

  it('filterTree(tree, "") always equals the original tree', () => {
    fc.assert(
      fc.property(docTreeArb, (originalTree) => {
        const result = filterTree(originalTree, '');
        expect(result).toEqual(originalTree);
      }),
      { numRuns: 100 },
    );
  });

  it('filterTree never adds files that were not in the original tree', () => {
    fc.assert(
      fc.property(docTreeArb, fc.string({ minLength: 0, maxLength: 10 }), (originalTree, query) => {
        const originalFiles = new Set(collectFileNames(originalTree.root));
        const filteredFiles = collectFileNames(filterTree(originalTree, query).root);
        for (const f of filteredFiles) {
          expect(originalFiles.has(f)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
