import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { StepState, PlanStep, ExecutionPlan } from '../../shared/types';
import { mapStatusToDisplayColumn } from '../utils/statusMapping';
import { getStatusLabel, getStatusColor } from '../utils/statusColors';
import { getTeammateColor } from '../utils/teammateColors';

// --- Pure utilities ---

export const buildPlanStepLookup = (plan: ExecutionPlan): ReadonlyMap<string, PlanStep> =>
  new Map(
    plan.layers.flatMap(layer => layer.steps.map(step => [step.step_id, step] as const)),
  );

export const computeDuration = (
  startedAt: string | null,
  completedAt: string | null,
): string | null => {
  if (startedAt === null || completedAt === null) return null;

  const totalMinutes = Math.round(
    (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000,
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

// --- Formatting helpers ---

const formatTimestamp = (iso: string): string =>
  new Date(iso).toLocaleString();

const resolveConflictName = (
  conflictId: string,
  lookup: ReadonlyMap<string, PlanStep>,
): string => lookup.get(conflictId)?.name ?? conflictId;

// --- Component ---

interface StepDetailModalProps {
  readonly stepState: StepState;
  readonly planStep: PlanStep;
  readonly planStepLookup: ReadonlyMap<string, PlanStep>;
  readonly onClose: () => void;
}

export const StepDetailModal = ({
  stepState,
  planStep,
  planStepLookup,
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

  const displayColumn = mapStatusToDisplayColumn(stepState.status);
  const statusLabel = getStatusLabel(displayColumn);
  const statusColor = getStatusColor(displayColumn);
  const duration = computeDuration(stepState.started_at, stepState.completed_at);
  const conflicts = planStep.conflicts_with ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={stepState.name}
        tabIndex={-1}
        className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{stepState.name}</h2>
            <span className="font-mono text-sm text-gray-400">{stepState.step_id}</span>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Description — omitted entirely when undefined */}
        {planStep.description !== undefined && (
          <div data-testid="description-section" className="mb-4">
            <p className="text-sm text-gray-700">{planStep.description}</p>
          </div>
        )}

        {/* Status */}
        <div className="mb-3">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
            {statusLabel}
          </span>
        </div>

        {/* Teammate */}
        {stepState.teammate_id !== null && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium uppercase text-gray-500">Teammate</h3>
            <span className={`text-sm font-medium ${getTeammateColor(stepState.teammate_id)}`}>
              {stepState.teammate_id}
            </span>
          </div>
        )}

        {/* Files */}
        {stepState.files_to_modify.length > 0 && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium uppercase text-gray-500">Files</h3>
            <ul className="space-y-0.5">
              {stepState.files_to_modify.map((file) => (
                <li key={file} className="font-mono text-sm text-gray-600">{file}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium uppercase text-gray-500">Conflicts</h3>
            <ul className="space-y-0.5">
              {conflicts.map((conflictId) => (
                <li key={conflictId} className="text-sm text-gray-600">
                  {resolveConflictName(conflictId, planStepLookup)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timing and review attempts */}
        {stepState.started_at !== null && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium uppercase text-gray-500">Timing</h3>
            <p className="text-sm text-gray-600">
              {`Started: ${formatTimestamp(stepState.started_at)}`}
              {stepState.completed_at !== null && ` — Completed: ${formatTimestamp(stepState.completed_at)}`}
              {duration !== null && ` (${duration})`}
              {stepState.review_attempts > 0 && ` · ${stepState.review_attempts} review attempts`}
            </p>
          </div>
        )}
        {stepState.started_at === null && stepState.review_attempts > 0 && (
          <div className="mb-3">
            <h3 className="mb-1 text-xs font-medium uppercase text-gray-500">Review Attempts</h3>
            <span className="text-sm text-gray-600">{stepState.review_attempts}</span>
          </div>
        )}

        {/* Worktree */}
        {stepState.worktree && (
          <div className="mb-3">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">worktree</span>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
