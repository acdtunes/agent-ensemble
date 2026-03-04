import { useState, useCallback } from 'react';
import type { MultiRootDocTree, LabeledDocTree } from '../../shared/types';
import { DocTree as DocTreeComponent } from './DocTree';
import { DocContent } from './DocContent';
import { CopyPathButton } from './CopyPathButton';
import { useDocContent } from '../hooks/useDocContent';

interface MultiRootDocViewerProps {
  readonly projectId: string;
  readonly tree: MultiRootDocTree | null;
  readonly fetchContent: (label: string, path: string) => Promise<string>;
  readonly error?: string;
}

interface SelectedDoc {
  readonly label: string;
  readonly path: string;
}

export const MultiRootDocViewer = ({ projectId, tree, fetchContent, error }: MultiRootDocViewerProps) => {
  const [selectedDoc, setSelectedDoc] = useState<SelectedDoc | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const handleSelectDoc = useCallback(async (label: string, path: string) => {
    setSelectedDoc({ label, path });
    setLoading(true);
    setContentError(null);
    try {
      const text = await fetchContent(label, path);
      setContent(text);
    } catch {
      setContentError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [fetchContent]);

  const hasTree = tree !== null && tree.roots.length > 0;
  const showEmptyState = (tree === null && error === undefined) || (tree !== null && tree.roots.length === 0);

  return (
    <div data-testid="multi-root-doc-viewer">
      {error !== undefined && error !== null && (
        <p className="mt-4 text-red-400">{error}</p>
      )}
      {showEmptyState && (
        <p className="mt-4 text-gray-400">No documentation found</p>
      )}
      {hasTree && (
        <div className="mt-4 flex gap-4">
          <aside className="w-72 shrink-0 border-r border-gray-800 pr-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {tree.roots.map((labeledTree) => (
              <RootSection
                key={labeledTree.label}
                labeledTree={labeledTree}
                onSelectDoc={handleSelectDoc}
                selectedPath={selectedDoc?.label === labeledTree.label ? selectedDoc.path : null}
              />
            ))}
          </aside>
          <div className="min-w-0 flex-1">
            {selectedDoc === null && (
              <p className="text-gray-500">Select a document to view its contents</p>
            )}
            {selectedDoc !== null && loading && (
              <p className="text-gray-400">Loading...</p>
            )}
            {selectedDoc !== null && contentError !== null && (
              <p className="text-red-400">{contentError}</p>
            )}
            {selectedDoc !== null && !loading && contentError === null && content !== null && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    docs/{selectedDoc.label}/{selectedDoc.path}
                  </span>
                  <CopyPathButton filePath={`docs/${selectedDoc.label}/${selectedDoc.path}`} />
                </div>
                <DocContent content={content} docPath={selectedDoc.path} loading={false} error={null} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface RootSectionProps {
  readonly labeledTree: LabeledDocTree;
  readonly onSelectDoc: (label: string, path: string) => void;
  readonly selectedPath: string | null;
}

const LABEL_DISPLAY: Record<string, string> = {
  feature: 'Design',
  ux: 'UX & Journey',
  requirements: 'Requirements',
};

const RootSection = ({ labeledTree, onSelectDoc, selectedPath }: RootSectionProps) => {
  const handleSelect = useCallback((path: string) => {
    onSelectDoc(labeledTree.label, path);
  }, [labeledTree.label, onSelectDoc]);

  const displayLabel = LABEL_DISPLAY[labeledTree.label] ?? labeledTree.label;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {displayLabel}
        <span className="ml-2 text-gray-600">({labeledTree.fileCount})</span>
      </h3>
      <DocTreeComponent
        tree={{ root: labeledTree.root, fileCount: labeledTree.fileCount }}
        onSelectDoc={handleSelect}
        defaultExpanded
      />
    </div>
  );
};
