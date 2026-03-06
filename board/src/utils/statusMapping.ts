import type { StepStatus, RoadmapStep } from '../../shared/types';

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
};

export const mapStatusToDisplayColumn = (status: StepStatus): DisplayColumn =>
  STATUS_TO_COLUMN[status];

// --- StepCardData: one card per step ---

export interface StepCardData {
  readonly stepId: string;
  readonly stepName: string;
  readonly description?: string;
  readonly displayColumn: DisplayColumn;
  readonly fileCount: number;
  readonly files: readonly string[];
  readonly reviewCount: number;
  readonly usesWorktree: boolean;
  readonly isBlocked: boolean;
  readonly teammateId: string | null;
  readonly dependencyCount: number;
  readonly conflictsWith: readonly string[];
}

export const expandStepToStepCard = (step: RoadmapStep, isBlocked: boolean): StepCardData => {
  const files = step.files_to_modify.length > 0
    ? step.files_to_modify
    : [step.name];

  return {
    stepId: step.id,
    stepName: step.name,
    description: step.description,
    displayColumn: mapStatusToDisplayColumn(step.status),
    fileCount: files.length,
    files,
    reviewCount: step.review_attempts,
    usesWorktree: Boolean(step.worktree),
    isBlocked,
    teammateId: step.teammate_id,
    dependencyCount: step.dependencies.length,
    conflictsWith: step.conflicts_with ?? [],
  };
};

// --- FileCardData: one card per file in a step ---

export interface FileCardData {
  readonly filename: string;
  readonly stepId: string;
  readonly stepName: string;
  readonly displayColumn: DisplayColumn;
  readonly reviewCount: number;
  readonly usesWorktree: boolean;
  readonly isBlocked: boolean;
  readonly teammateId: string | null;
}

export const expandStepToFileCards = (step: RoadmapStep, isBlocked: boolean): readonly FileCardData[] => {
  const files = step.files_to_modify.length > 0
    ? step.files_to_modify
    : [step.name];

  return files.map((filename: string) => ({
    filename,
    stepId: step.id,
    stepName: step.name,
    displayColumn: mapStatusToDisplayColumn(step.status),
    reviewCount: step.review_attempts,
    usesWorktree: Boolean(step.worktree),
    isBlocked,
    teammateId: step.teammate_id,
  }));
};
