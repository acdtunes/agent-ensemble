import { useState, useCallback } from 'react';
import type { DocTree } from '../../shared/types';
import { DocTree as DocTreeComponent } from './DocTree';

interface DocViewerProps {
  readonly projectId: string;
  readonly tree: DocTree | null;
  readonly fetchContent: (path: string) => Promise<string>;
  readonly onNavigateToBoard?: () => void;
  readonly error?: string;
}

export const DocViewer = ({ projectId, tree, error, onNavigateToBoard }: DocViewerProps) => {
  const [selectedDocPath, setSelectedDocPath] = useState<string | null>(null);

  const handleSelectDoc = useCallback((path: string) => {
    setSelectedDocPath(path);
  }, []);

  const hasTree = tree !== null && tree.root.length > 0;
  const showEmptyState = (tree === null && error === undefined) || (tree !== null && tree.root.length === 0);

  return (
    <div data-testid="doc-viewer">
      <nav className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
          onClick={onNavigateToBoard}
        >
          Board
        </button>
        <button
          className="px-3 py-1 text-sm text-gray-100 border-b-2 border-blue-500"
        >
          Docs
        </button>
      </nav>
      {error !== undefined && error !== null && (
        <p className="mt-4 text-red-400">{error}</p>
      )}
      {showEmptyState && (
        <p className="mt-4 text-gray-400">No documentation found</p>
      )}
      {hasTree && (
        <div className="mt-4 flex gap-4">
          <aside className="w-64 shrink-0 border-r border-gray-800 pr-4">
            <DocTreeComponent tree={tree} onSelectDoc={handleSelectDoc} />
          </aside>
          <div className="min-w-0 flex-1">
            {selectedDocPath === null && (
              <p className="text-gray-500">Select a document to view its contents</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
