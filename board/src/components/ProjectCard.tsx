import type { ProjectSummary } from '../../shared/types';

interface ProjectCardProps {
  readonly project: ProjectSummary;
  readonly onNavigate: (projectId: string) => void;
}

export const computeCompletionPercentage = (completed: number, total: number): number =>
  total === 0 ? 0 : Math.round((completed / total) * 100);

const formatUpdatedAt = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  return `Updated ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

export const ProjectCard = ({ project, onNavigate }: ProjectCardProps) => {
  const percentage = computeCompletionPercentage(project.completed, project.totalSteps);

  return (
    <button
      onClick={() => onNavigate(project.projectId)}
      className="w-full rounded-lg border border-gray-700 bg-gray-900 p-4 text-left transition-all duration-200 hover:border-gray-500 hover:bg-gray-800"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-100">{project.name}</h3>
        <span className="text-sm text-gray-400">Layer {project.currentLayer}</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">{project.completed} / {project.totalSteps}</span>
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
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {project.inProgress > 0 && (
          <span className="rounded bg-blue-900 px-1.5 py-0.5 text-blue-300">
            {project.inProgress} active
          </span>
        )}
        {project.failed > 0 && (
          <span className="rounded bg-red-900 px-1.5 py-0.5 text-red-300">
            {project.failed} failed
          </span>
        )}
      </div>

      <p className="mt-2 text-xs text-gray-500">{formatUpdatedAt(project.updatedAt)}</p>
    </button>
  );
};
