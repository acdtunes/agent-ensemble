import type { DisplayColumn } from './statusMapping';

interface StatusColor {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly headerBg: string;
}

const STATUS_COLOR_MAP: Readonly<Record<DisplayColumn, StatusColor>> = {
  pending: { bg: 'bg-gray-800/50', border: 'border-gray-700', text: 'text-gray-400', headerBg: 'bg-gray-800/60' },
  in_progress: { bg: 'bg-yellow-950/30', border: 'border-yellow-500', text: 'text-yellow-400', headerBg: 'bg-yellow-950/40' },
  review: { bg: 'bg-violet-950/30', border: 'border-violet-500', text: 'text-violet-400', headerBg: 'bg-violet-950/40' },
  done: { bg: 'bg-green-950/30', border: 'border-green-500', text: 'text-green-400', headerBg: 'bg-green-100' },
};

export const getStatusColor = (column: DisplayColumn): StatusColor =>
  STATUS_COLOR_MAP[column];

const STATUS_LABEL_MAP: Readonly<Record<DisplayColumn, string>> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

export const getStatusLabel = (column: DisplayColumn): string =>
  STATUS_LABEL_MAP[column];

const STATUS_TOP_BAR_COLOR_MAP: Readonly<Record<DisplayColumn, string>> = {
  pending: 'border-t-4 border-t-gray-500',
  in_progress: 'border-t-4 border-t-yellow-400',
  review: 'border-t-4 border-t-violet-400',
  done: 'border-t-4 border-t-green-400',
};

export const getStatusTopBarColor = (column: DisplayColumn): string =>
  STATUS_TOP_BAR_COLOR_MAP[column];
