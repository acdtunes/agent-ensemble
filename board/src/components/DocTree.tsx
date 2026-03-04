import { useState, useCallback, useMemo } from 'react';
import type { DocTree as DocTreeType, DocNode } from '../../shared/types';

// --- Props ---

export interface DocTreeProps {
  readonly tree: DocTreeType;
  readonly onSelectDoc: (path: string) => void;
  readonly defaultExpanded?: boolean;
}

// --- Pure functions ---

const countFilesInNode = (node: DocNode): number =>
  node.type === 'file'
    ? 1
    : node.children.reduce((sum, child) => sum + countFilesInNode(child), 0);

const sortDocNodes = (nodes: readonly DocNode[]): readonly DocNode[] =>
  [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

// --- Tree node renderer ---

const TreeNode = ({
  node,
  expandedFolders,
  onToggleFolder,
  onSelectDoc,
  depth,
}: {
  readonly node: DocNode;
  readonly expandedFolders: ReadonlySet<string>;
  readonly onToggleFolder: (path: string) => void;
  readonly onSelectDoc: (path: string) => void;
  readonly depth: number;
}) => {
  if (node.type === 'file') {
    return (
      <li role="treeitem">
        <button
          className="flex w-full items-center rounded px-2 py-1 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-gray-100"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => onSelectDoc(node.path)}
        >
          {node.name}
        </button>
      </li>
    );
  }

  const isExpanded = expandedFolders.has(node.path);
  const fileCount = countFilesInNode(node);

  return (
    <li role="treeitem" aria-expanded={isExpanded}>
      <button
        className="flex w-full items-center rounded px-2 py-1 text-left text-sm font-medium text-gray-200 hover:bg-gray-800"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onToggleFolder(node.path)}
      >
        <span>{node.name}</span>
        {fileCount > 0 && (
          <span className="ml-auto text-xs text-gray-500">{fileCount}</span>
        )}
      </button>
      {isExpanded && (
        <ul role="group">
          {sortDocNodes(node.children).map(child => (
            <TreeNode
              key={child.path}
              node={child}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectDoc={onSelectDoc}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

// --- DocTree component ---

const collectAllFolderPaths = (nodes: readonly DocNode[]): string[] => {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'directory') {
      paths.push(node.path);
      paths.push(...collectAllFolderPaths(node.children));
    }
  }
  return paths;
};

export const DocTree = ({ tree, onSelectDoc, defaultExpanded = false }: DocTreeProps) => {
  const [expandedFolders, setExpandedFolders] = useState<ReadonlySet<string>>(() =>
    defaultExpanded ? new Set(collectAllFolderPaths(tree.root)) : new Set(),
  );

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const sortedNodes = useMemo(() => sortDocNodes(tree.root), [tree.root]);

  return (
    <nav aria-label="Document tree">
      <ul role="tree">
        {sortedNodes.map(node => (
          <TreeNode
            key={node.path}
            node={node}
            expandedFolders={expandedFolders}
            onToggleFolder={handleToggleFolder}
            onSelectDoc={onSelectDoc}
            depth={0}
          />
        ))}
      </ul>
    </nav>
  );
};
