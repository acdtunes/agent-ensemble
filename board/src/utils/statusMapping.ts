import type { StepStatus, StepState } from '../../shared/types';

// --- DisplayColumn: the 4 visual columns on the board ---

export type DisplayColumn = 'pending' | 'in_progress' | 'review' | 'done';

export const DISPLAY_COLUMNS: readonly DisplayColumn[] = [
  'pending',
  'in_progress',
  'review',
  'done',
] as const;

// --- Status-to-column mapping (pure, exhaustive) ---

const STATUS_TO_COLUMN: Readonly<Record<StepStatus, DisplayColumn>> = {
  pending: 'pending',
  claimed: 'in_progress',
  in_progress: 'in_progress',
  review: 'review',
  approved: 'done',
  failed: 'in_progress',
};

export const mapStatusToDisplayColumn = (status: StepStatus): DisplayColumn =>
  STATUS_TO_COLUMN[status];

// --- FileCardData: one card per file in a step ---

export interface FileCardData {
  readonly filename: string;
  readonly stepId: string;
  readonly stepName: string;
  readonly displayColumn: DisplayColumn;
  readonly retryCount: number;
  readonly worktree: boolean;
  readonly isBlocked: boolean;
  readonly teammateId: string | null;
}

export const expandStepToFileCards = (step: StepState, isBlocked: boolean): readonly FileCardData[] =>
  step.files_to_modify.map((filename) => ({
    filename,
    stepId: step.step_id,
    stepName: step.name,
    displayColumn: mapStatusToDisplayColumn(step.status),
    retryCount: step.review_attempts,
    worktree: step.worktree ?? false,
    isBlocked,
    teammateId: step.teammate_id,
  }));
