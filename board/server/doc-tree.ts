import type { DirEntry, DocNode, DocTree } from '../shared/types';

// --- Predicates ---

const isHiddenName = (name: string): boolean => name.startsWith('.');

const isMdFile = (name: string): boolean => name.endsWith('.md');

const stripMdExtension = (name: string): string =>
  name.endsWith('.md') ? name.slice(0, -3) : name;

const parentPath = (path: string): string => {
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1 ? '' : path.substring(0, lastSlash);
};

// --- Filtering ---

const filterEntries = (entries: readonly DirEntry[]): readonly DirEntry[] => {
  const hiddenPaths = new Set(
    entries
      .filter(e => e.isDirectory && isHiddenName(e.name))
      .map(e => e.path),
  );

  const isUnderHidden = (path: string): boolean =>
    [...hiddenPaths].some(hp => path === hp || path.startsWith(hp + '/'));

  return entries.filter(entry => {
    if (isUnderHidden(entry.path)) return false;
    if (!entry.isDirectory && !isMdFile(entry.name)) return false;
    return true;
  });
};

// --- Sorting ---

export const sortNodes = (nodes: readonly DocNode[]): readonly DocNode[] =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

// --- Tree construction ---

const buildNodes = (
  entries: readonly DirEntry[],
  parent: string,
): readonly DocNode[] => {
  const children = entries.filter(e => parentPath(e.path) === parent);

  return sortNodes(
    children.map((entry): DocNode =>
      entry.isDirectory
        ? {
            type: 'directory',
            name: entry.name,
            path: entry.path,
            children: buildNodes(entries, entry.path),
          }
        : {
            type: 'file',
            name: stripMdExtension(entry.name),
            path: entry.path,
          },
    ),
  );
};

const countFiles = (nodes: readonly DocNode[]): number =>
  nodes.reduce(
    (count, node) =>
      node.type === 'file' ? count + 1 : count + countFiles(node.children),
    0,
  );

// --- Public API ---

export const buildDocTree = (entries: readonly DirEntry[]): DocTree => {
  const filtered = filterEntries(entries);
  const root = buildNodes(filtered, '');
  return { root, fileCount: countFiles(root) };
};
