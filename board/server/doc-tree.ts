import { readdir, stat, realpath } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import type { DirEntry, DocNode, DocTree, DocTreeError, Result, MultiRootDocTree, LabeledDocTree } from '../shared/types';
import { ok, err } from '../shared/types.js';

// --- Predicates ---

const isHiddenName = (name: string): boolean => name.startsWith('.');

const DOC_EXTENSIONS = ['.md', '.feature', '.yaml', '.yml'] as const;

const isDocFile = (name: string): boolean =>
  DOC_EXTENSIONS.some(ext => name.endsWith(ext));

const stripDocExtension = (name: string): string => {
  for (const ext of DOC_EXTENSIONS) {
    if (name.endsWith(ext)) return name.slice(0, -ext.length);
  }
  return name;
};

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
    if (!entry.isDirectory && !isDocFile(entry.name)) return false;
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
            name: entry.name,
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

// --- Recursive directory scanning ---

const isWithinRoot = async (targetPath: string, rootPath: string): Promise<boolean> => {
  try {
    const resolvedTarget = await realpath(targetPath);
    const resolvedRoot = await realpath(rootPath);
    return resolvedTarget.startsWith(resolvedRoot + '/') || resolvedTarget === resolvedRoot;
  } catch {
    return false;
  }
};

const scanDirRecursive = async (
  currentPath: string,
  docsRoot: string,
  relativeTo: string,
): Promise<DirEntry[]> => {
  const entries: DirEntry[] = [];

  try {
    const dirents = await readdir(currentPath, { withFileTypes: true });

    for (const dirent of dirents) {
      const fullPath = join(currentPath, dirent.name);
      const relPath = relative(relativeTo, fullPath);

      // Skip symlinks that escape the root
      if (dirent.isSymbolicLink()) {
        const withinRoot = await isWithinRoot(fullPath, docsRoot);
        if (!withinRoot) continue;
      }

      const isDirectory = dirent.isDirectory() ||
        (dirent.isSymbolicLink() && (await stat(fullPath).then(s => s.isDirectory()).catch(() => false)));

      entries.push({
        name: dirent.name,
        path: relPath,
        isDirectory,
      });

      if (isDirectory) {
        const childEntries = await scanDirRecursive(fullPath, docsRoot, relativeTo);
        entries.push(...childEntries);
      }
    }
  } catch {
    // Ignore errors for individual directories
  }

  return entries;
};

/**
 * Scan a docs directory recursively and return DirEntry array.
 * Effect function - performs filesystem IO.
 */
export const scanDocsDir = async (
  docsRoot: string,
): Promise<Result<readonly DirEntry[], DocTreeError>> => {
  try {
    const resolvedRoot = resolve(docsRoot);
    await stat(resolvedRoot);
    const entries = await scanDirRecursive(resolvedRoot, resolvedRoot, resolvedRoot);
    return ok(entries);
  } catch (error: unknown) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return err({ type: 'not_found', path: docsRoot });
    }
    return err({ type: 'scan_failed', message: nodeError.message ?? 'Unknown scan error' });
  }
};

// --- Public API ---

export const buildDocTree = (entries: readonly DirEntry[]): DocTree => {
  const filtered = filterEntries(entries);
  const root = buildNodes(filtered, '');
  return { root, fileCount: countFiles(root) };
};

// --- Multi-root doc tree construction (pure) ---

interface LabeledTree {
  readonly label: string;
  readonly tree: DocTree;
}

const toLabeledDocTree = ({ label, tree }: LabeledTree): LabeledDocTree => ({
  label,
  root: tree.root,
  fileCount: tree.fileCount,
});

/**
 * Combine multiple labeled doc trees into a single multi-root structure.
 * Pure function — no IO.
 */
export const buildMultiRootDocTree = (
  labeledTrees: readonly LabeledTree[],
): MultiRootDocTree => {
  const roots = labeledTrees.map(toLabeledDocTree);
  const totalFileCount = roots.reduce((sum, r) => sum + r.fileCount, 0);
  return { roots, totalFileCount };
};
