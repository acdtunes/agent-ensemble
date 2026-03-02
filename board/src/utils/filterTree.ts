import type { DocTree, DocNode } from '../../shared/types';

// --- Pure predicate ---

const normalizeName = (name: string): string =>
  name.toLowerCase().replace(/-/g, ' ');

const nameMatchesQuery = (name: string, query: string): boolean => {
  const normalizedName = normalizeName(name);
  const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
  return tokens.every(token => normalizedName.includes(token));
};

// --- Recursive tree filter ---

const filterNodes = (nodes: readonly DocNode[], query: string): readonly DocNode[] =>
  nodes.flatMap((node): readonly DocNode[] => {
    if (node.type === 'file') {
      return nameMatchesQuery(node.name, query) ? [node] : [];
    }
    const filteredChildren = filterNodes(node.children, query);
    return filteredChildren.length > 0
      ? [{ ...node, children: filteredChildren }]
      : [];
  });

const countFiles = (nodes: readonly DocNode[]): number =>
  nodes.reduce(
    (sum, n) => (n.type === 'file' ? sum + 1 : sum + countFiles(n.children)),
    0,
  );

// --- Public API ---

export const filterTree = (tree: DocTree, query: string): DocTree => {
  if (query === '') return tree;
  const filtered = filterNodes(tree.root, query);
  return { root: filtered, fileCount: countFiles(filtered) };
};
