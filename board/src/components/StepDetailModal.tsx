import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { RoadmapStep, ReviewEntry } from '../../shared/types';
import { mapStatusToDisplayColumn } from '../utils/statusMapping';
import { getStatusLabel, getStatusColor } from '../utils/statusColors';

// --- Formatting helpers ---

const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString();

const resolveDependencyName = (
  dependencyId: string,
  lookup: ReadonlyMap<string, RoadmapStep>,
): string => lookup.get(dependencyId)?.name ?? dependencyId;

const formatOutcomeLabel = (outcome: ReviewEntry['outcome']): string =>
  outcome === 'approved' ? 'Approved' : 'Rejected';

const getOutcomeColor = (outcome: ReviewEntry['outcome']): string =>
  outcome === 'approved' ? 'text-green-400' : 'text-red-400';

const sortNewestFirst = (entries: readonly ReviewEntry[]): readonly ReviewEntry[] =>
  [...entries].sort((a, b) => b.cycle - a.cycle);

// --- Section helper ---

const DetailSection = ({ title, children }: { readonly title: string; readonly children: React.ReactNode }) => (
  <div className="rounded-md border border-gray-800 bg-gray-950/60">
    <div className="border-b border-gray-800 px-3 py-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">{title}</h3>
    </div>
    <div className="px-3 py-2">
      {children}
    </div>
  </div>
);

// --- Component ---

interface StepDetailModalProps {
  readonly step: RoadmapStep;
  readonly stepLookup: ReadonlyMap<string, RoadmapStep>;
  readonly onClose: () => void;
}

export const StepDetailModal = ({
  step,
  stepLookup,
  onClose,
}: StepDetailModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayColumn = mapStatusToDisplayColumn(step.status);
  const statusLabel = getStatusLabel(displayColumn);
  const statusColor = getStatusColor(displayColumn);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={step.name}
        tabIndex={-1}
        className={`relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg border border-gray-800 border-l-2 ${statusColor.border} bg-gray-900/95 shadow-xl outline-none backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-800 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-100">{step.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-mono text-sm text-gray-400">{step.id}</span>
                <span className="text-gray-600">·</span>
                <span className={`text-xs uppercase tracking-wide ${statusColor.text}`}>{statusLabel}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                aria-label="Close"
                className="rounded-md border border-gray-700 p-1.5 text-gray-400 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-gray-200"
                onClick={onClose}
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          {/* Description */}
          {step.description !== undefined && step.description !== '' && (
            <div data-testid="description-section" className="rounded-md border border-gray-800 bg-gray-950/40 px-3 py-2.5">
              <p className="text-sm leading-relaxed text-gray-300">{step.description}</p>
            </div>
          )}

          {/* Files */}
          {step.files_to_modify.length > 0 && (
            <DetailSection title="Files">
              <ul className="space-y-1">
                {step.files_to_modify.map((file) => (
                  <li key={file} className="rounded bg-gray-900 px-2 py-1 font-mono text-sm text-gray-400">{file}</li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* Dependencies */}
          {step.dependencies.length > 0 && (
            <DetailSection title="Dependencies">
              <ul className="space-y-1">
                {step.dependencies.map((depId) => (
                  <li key={depId} className="text-sm text-gray-400">
                    {resolveDependencyName(depId, stepLookup)}
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}

          {/* Review History */}
          {step.review_history !== undefined && step.review_history.length > 0 && (
            <DetailSection title="Review History">
              <ul className="space-y-2">
                {sortNewestFirst(step.review_history).map((entry) => (
                  <li key={entry.cycle} data-testid="review-entry" className="rounded bg-gray-900 px-2 py-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono text-gray-500">Cycle {entry.cycle}</span>
                      <span className="text-gray-700">&middot;</span>
                      <span className={`font-medium ${getOutcomeColor(entry.outcome)}`}>
                        {formatOutcomeLabel(entry.outcome)}
                      </span>
                      <span className="text-gray-700">&middot;</span>
                      <span className="text-gray-500">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-400">{entry.feedback}</p>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}
        </div>

      </div>
    </div>,
    document.body,
  );
};
