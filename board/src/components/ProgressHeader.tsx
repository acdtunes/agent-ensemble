import type { RoadmapSummary } from '../../shared/types';

interface ProgressHeaderProps {
  readonly summary: RoadmapSummary;
  readonly currentPhase: number;
  readonly createdAt: string;
  readonly description?: string;
}

const hasContent = (value: string | undefined): value is string =>
  value !== undefined && value.trim().length > 0;

const StatCard = ({ label, value, color }: { readonly label: string; readonly value: number; readonly color: string }) => (
  <div className="flex flex-col items-center rounded-lg bg-gray-800/50 px-4 py-2">
    <span className={`text-2xl font-bold ${color}`}>{value}</span>
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const ProgressHeader = ({ summary, currentPhase, createdAt, description }: ProgressHeaderProps) => {
  const completionPercent = summary.total_steps > 0
    ? Math.round((summary.done / summary.total_steps) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-3xl font-bold text-gray-100">{completionPercent}%</span>
          </div>
          <div className="h-12 w-px bg-gray-700" />
          <div className="flex gap-3">
            <StatCard label="Done" value={summary.done} color="text-emerald-400" />
            <StatCard label="In Progress" value={summary.in_progress} color="text-blue-400" />
            <StatCard label="Pending" value={summary.pending} color="text-gray-400" />
          </div>
        </div>
        <div className="flex flex-col items-end text-sm text-gray-400">
          <div>Phase {currentPhase} of {summary.total_phases}</div>
          <div>Started: {formatDate(createdAt)}</div>
        </div>
      </div>
      {hasContent(description) && (
        <p
          data-testid="progress-header-description"
          className="mt-3 text-sm text-gray-400"
        >
          {description}
        </p>
      )}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${completionPercent}%` }}
        />
      </div>
    </div>
  );
};
