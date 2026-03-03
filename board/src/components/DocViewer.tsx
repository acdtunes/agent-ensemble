import { useState, useCallback, useEffect } from 'react';
import type { DocTree } from '../../shared/types';
import { DocTree as DocTreeComponent } from './DocTree';
import { DocContent } from './DocContent';
import { CopyPathButton } from './CopyPathButton';
import { useDocContent } from '../hooks/useDocContent';

interface DocViewerProps {
  readonly projectId: string;
  readonly tree: DocTree | null;
  readonly fetchContent?: (path: string) => Promise<string>;
  readonly docsRoot?: string;
  readonly error?: string;
}

export const DocViewer = ({ projectId, tree, fetchContent, docsRoot = 'docs', error }: DocViewerProps) => {
  const [selectedDocPath, setSelectedDocPath] = useState<string | null>(null);
  const [localContent, setLocalContent] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const apiContent = useDocContent(projectId, fetchContent !== undefined ? null : selectedDocPath);

  useEffect(() => {
    if (fetchContent === undefined || selectedDocPath === null) return;
    setLocalLoading(true);
    setLocalError(null);
    fetchContent(selectedDocPath).then(
      text => { setLocalContent(text); setLocalLoading(false); },
      () => { setLocalError('Failed to load document'); setLocalLoading(false); },
    );
  }, [fetchContent, selectedDocPath]);

  const docContent = fetchContent !== undefined
    ? { content: localContent, loading: localLoading, error: localError, retry: () => {} }
    : apiContent;

  const handleSelectDoc = useCallback((path: string) => {
    setSelectedDocPath(path);
  }, []);

  const hasTree = tree !== null && tree.root.length > 0;
  const showEmptyState = (tree === null && error === undefined) || (tree !== null && tree.root.length === 0);

  return (
    <div data-testid="doc-viewer">
      {error !== undefined && error !== null && (
        <p className="mt-4 text-red-400">{error}</p>
      )}
      {showEmptyState && (
        <p className="mt-4 text-gray-400">No documentation found</p>
      )}
      {hasTree && (
        <div className="mt-4 flex gap-4">
          <aside className="w-64 shrink-0 border-r border-gray-800 pr-4">
            <DocTreeComponent tree={tree} onSelectDoc={handleSelectDoc} defaultExpanded />
          </aside>
          <div className="min-w-0 flex-1">
            {selectedDocPath === null && (
              <p className="text-gray-500">Select a document to view its contents</p>
            )}
            {selectedDocPath !== null && (
              <>
                <CopyPathButton filePath={`${docsRoot}/${selectedDocPath}`} />
                <DocContent
                  content={docContent.content}
                  docPath={selectedDocPath}
                  loading={docContent.loading}
                  error={docContent.error}
                  onRetry={docContent.retry}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
