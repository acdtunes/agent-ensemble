import type { ProjectSummary } from '../../shared/types';
import { ProjectCard } from './ProjectCard';

interface OverviewDashboardProps {
  readonly projects: readonly ProjectSummary[];
  readonly onNavigate: (projectId: string) => void;
  readonly onAddProject: () => void;
  readonly onRemoveProject: (projectId: string) => void;
}

const EmptyState = ({ onAddProject }: { readonly onAddProject: () => void }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">No projects registered</p>
    <p className="mt-2 text-sm">Add a project to get started with Agent Ensemble.</p>
    <button
      type="button"
      onClick={onAddProject}
      className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
    >
      Add Project
    </button>
  </div>
);

export const OverviewDashboard = ({ projects, onNavigate, onAddProject, onRemoveProject }: OverviewDashboardProps) => {
  if (projects.length === 0) {
    return <EmptyState onAddProject={onAddProject} />;
  }

  return (
    <div>
      <div className="mb-4 flex justify-start">
        <button
          type="button"
          onClick={onAddProject}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
        >
          + Add Project
        </button>
      </div>
      <div
        data-testid="project-grid"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {projects.map(project => (
          <ProjectCard
            key={project.projectId}
            project={project}
            onNavigate={onNavigate}
            onRemove={() => onRemoveProject(project.projectId)}
          />
        ))}
      </div>
    </div>
  );
};
