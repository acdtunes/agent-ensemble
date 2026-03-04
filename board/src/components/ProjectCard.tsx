import type { ProjectSummary, FeatureSummary } from '../../shared/types';

interface ProjectCardProps {
  readonly project: ProjectSummary;
  readonly onNavigate: (projectId: string) => void;
  readonly onRemove?: () => void;
}

// --- Pure functions ---

export const computeCompletionPercentage = (completed: number, total: number): number =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

export type FeatureStatus = 'completed' | 'in-progress' | 'pending';

export const classifyFeatureStatus = (feature: FeatureSummary): FeatureStatus => {
  if (feature.totalSteps > 0 && feature.done === feature.totalSteps) return 'completed';
  if (feature.inProgress > 0) return 'in-progress';
  return 'pending';
};

interface FeatureStatusCounts {
  readonly completed: number;
  readonly inProgress: number;
}

export const aggregateFeatureStatuses = (
  features: readonly FeatureSummary[],
): FeatureStatusCounts =>
  features.reduce<FeatureStatusCounts>(
    (acc, feature) => {
      const status = classifyFeatureStatus(feature);
      switch (status) {
        case 'completed': return { ...acc, completed: acc.completed + 1 };
        case 'in-progress': return { ...acc, inProgress: acc.inProgress + 1 };
        case 'pending': return acc;
      }
    },
    { completed: 0, inProgress: 0 },
  );

export const formatFeatureCount = (count: number): string => {
  if (count === 0) return 'No features';
  if (count === 1) return '1 feature';
  return `${count} features`;
};

const formatUpdatedAt = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  return `Updated ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const ProjectCard = ({ project, onNavigate, onRemove }: ProjectCardProps) => {
  const percentage = computeCompletionPercentage(project.done, project.totalSteps);
  const featureCount = project.featureCount ?? 0;
  const featureLabel = formatFeatureCount(featureCount);
  const featureStats = aggregateFeatureStatuses(project.features ?? []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onNavigate(project.projectId)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(project.projectId); }}
      className="w-full cursor-pointer rounded-lg border border-gray-800 bg-gray-900/80 px-3 py-2 text-left shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100">{project.name}</h3>
        <span className="text-sm text-gray-400">{project.currentLayer} done</span>
      </div>

      <div className="text-xs text-gray-400">{featureLabel}</div>

      <div className="mt-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{project.done} / {project.totalSteps}</span>
          <span className="font-medium text-gray-200">{percentage}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-1 h-2 w-full rounded-full bg-gray-700"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
        {project.inProgress > 0 && (
          <span className="rounded-full bg-blue-950/50 px-1.5 py-0.5 font-medium text-blue-400">
            {project.inProgress} active
          </span>
        )}
      </div>

      {featureCount > 0 && (
        <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
          {featureStats.completed > 0 && (
            <span className="rounded-full bg-emerald-950/50 px-1.5 py-0.5 font-medium text-emerald-400">
              {featureStats.completed} done
            </span>
          )}
          {featureStats.inProgress > 0 && (
            <span className="rounded-full bg-blue-950/50 px-1.5 py-0.5 font-medium text-blue-400">
              {featureStats.inProgress} active
            </span>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-gray-500">{formatUpdatedAt(project.updatedAt)}</p>
        {onRemove !== undefined && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-xs text-gray-500 hover:text-red-400"
            aria-label={`Remove ${project.name}`}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};
