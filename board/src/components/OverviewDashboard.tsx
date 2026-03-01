import type { ProjectSummary } from '../../shared/types';
import { ProjectCard } from './ProjectCard';

interface OverviewDashboardProps {
  readonly projects: readonly ProjectSummary[];
  readonly onNavigate: (projectId: string) => void;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">No projects registered</p>
    <p className="mt-2 text-sm">Projects will appear here when added to the server.</p>
  </div>
);

export const OverviewDashboard = ({ projects, onNavigate }: OverviewDashboardProps) => {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      data-testid="project-grid"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {projects.map(project => (
        <ProjectCard
          key={project.projectId}
          project={project}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};
