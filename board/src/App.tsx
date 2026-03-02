import { useMemo, useState, useCallback } from 'react';
import { useDeliveryState, type ConnectionStatus } from './hooks/useDeliveryState';
import { useProjectList } from './hooks/useProjectList';
import { useDocTree } from './hooks/useDocTree';
import { useRouter } from './hooks/useRouter';
import { ProgressHeader } from './components/ProgressHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { StepDetailModal } from './components/StepDetailModal';
import { buildPlanStepLookup } from './utils/stepDetailUtils';
import { TeamPanel } from './components/TeamPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { OverviewDashboard } from './components/OverviewDashboard';
import { DocViewer } from './components/DocViewer';
import type { DeliveryState, ExecutionPlan, StateTransition, ProjectId } from '../shared/types';

// --- Pure functions ---

const computeWsUrl = (location: { protocol: string; host: string }): string => {
  const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${location.host}/ws`;
};

const CONNECTION_LABELS: Readonly<Record<ConnectionStatus, string>> = {
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Disconnected',
};

const CONNECTION_COLORS: Readonly<Record<ConnectionStatus, string>> = {
  connecting: 'bg-yellow-500',
  connected: 'bg-emerald-500',
  disconnected: 'bg-red-500',
};

// --- Components ---

const ConnectionIndicator = ({ status }: { readonly status: ConnectionStatus }) => (
  <div className="flex items-center gap-2 text-sm text-gray-400">
    <span className={`inline-block h-2 w-2 rounded-full ${CONNECTION_COLORS[status]}`} />
    {CONNECTION_LABELS[status]}
  </div>
);

const Placeholder = ({ error }: { readonly error: string | null }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">Waiting for server…</p>
    {error !== null && (
      <p className="mt-2 text-sm text-red-400">{error}</p>
    )}
  </div>
);

const PageShell = ({
  headerContent,
  connectionStatus,
  children,
}: {
  readonly headerContent: React.ReactNode;
  readonly connectionStatus: ConnectionStatus;
  readonly children: React.ReactNode;
}) => (
  <div className="min-h-screen bg-gray-950 text-gray-100">
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-800 bg-gray-900/80 px-4 py-4 shadow-sm backdrop-blur-sm lg:px-6">
      {headerContent}
      <ConnectionIndicator status={connectionStatus} />
    </header>
    <main className="p-4 lg:p-6">
      {children}
    </main>
  </div>
);

interface BoardContentProps {
  readonly state: DeliveryState;
  readonly plan: ExecutionPlan;
  readonly transitions: readonly StateTransition[];
}

const BoardContent = ({ state, plan, transitions }: BoardContentProps) => {
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const planStepLookup = useMemo(() => buildPlanStepLookup(plan), [plan]);

  const handleCardClick = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedStepId(null);
  }, []);

  const selectedStepState = selectedStepId !== null ? state.steps[selectedStepId] ?? null : null;
  const selectedPlanStep = selectedStepId !== null ? planStepLookup.get(selectedStepId) ?? null : null;

  return (
    <>
      <ProgressHeader
        summary={state.summary}
        currentLayer={state.current_layer}
        createdAt={state.created_at}
      />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <KanbanBoard state={state} plan={plan} onCardClick={handleCardClick} />
        </div>
        <div className="space-y-6">
          <section aria-label="Teammates">
            <h2 className="mb-3 text-lg font-medium text-gray-300">Teammates</h2>
            <TeamPanel teammates={state.teammates} steps={state.steps} />
          </section>
          <section aria-label="Activity">
            <h2 className="mb-3 text-lg font-medium text-gray-300">Activity</h2>
            <ActivityFeed transitions={transitions} />
          </section>
        </div>
      </div>
      {selectedStepState !== null && selectedPlanStep !== null && (
        <StepDetailModal
          stepState={selectedStepState}
          planStep={selectedPlanStep}
          planStepLookup={planStepLookup}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

// --- Board view (owns useDeliveryState hook for a specific project) ---

const WS_URL = computeWsUrl(
  typeof window !== 'undefined'
    ? window.location
    : { protocol: 'ws:', host: 'localhost:3000' },
);

const ProjectTabs = ({
  projectId,
  activeTab,
}: {
  readonly projectId: string;
  readonly activeTab: 'board' | 'docs';
}) => (
  <div className="flex items-center gap-3">
    <a href="#/" className="text-sm text-gray-400 hover:text-gray-200">Overview</a>
    <span className="text-gray-600">/</span>
    <h1 className="text-xl font-semibold text-gray-100">NW Teams Board</h1>
    <nav className="ml-4 flex gap-1">
      <a
        href={`#/projects/${projectId}/board`}
        className={`px-3 py-1 text-sm rounded-t ${
          activeTab === 'board'
            ? 'text-gray-100 border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        Board
      </a>
      <a
        href={`#/projects/${projectId}/docs`}
        className={`px-3 py-1 text-sm rounded-t ${
          activeTab === 'docs'
            ? 'text-gray-100 border-b-2 border-blue-500'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        Docs
      </a>
    </nav>
  </div>
);

const BoardView = ({ projectId }: { readonly projectId: ProjectId }) => {
  const { state, plan, transitions, connectionStatus, error } = useDeliveryState(WS_URL, projectId);

  const hasData = state !== null && plan !== null;

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<ProjectTabs projectId={projectId} activeTab="board" />}
    >
      {hasData
        ? <BoardContent state={state} plan={plan} transitions={transitions} />
        : <Placeholder error={error} />
      }
    </PageShell>
  );
};

const navigateToBoard = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}/board`;
};

const navigateToProject = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}/board`;
};

const OverviewView = () => {
  const { projects, connectionStatus } = useProjectList(WS_URL);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<h1 className="text-xl font-semibold text-gray-100">NW Teams Board</h1>}
    >
      <OverviewDashboard projects={projects} onNavigate={navigateToProject} />
    </PageShell>
  );
};

const DocsView = ({ projectId }: { readonly projectId: ProjectId }) => {
  const { connectionStatus } = useProjectList(WS_URL);
  const { tree, error } = useDocTree(projectId);

  const handleNavigateToBoard = useCallback(() => {
    navigateToBoard(projectId);
  }, [projectId]);

  const fetchContent = useCallback(
    async (path: string): Promise<string> => {
      const response = await fetch(`/api/projects/${projectId}/docs/content?path=${encodeURIComponent(path)}`);
      if (!response.ok) return '';
      return response.text();
    },
    [projectId],
  );

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<ProjectTabs projectId={projectId} activeTab="docs" />}
    >
      <DocViewer
        projectId={projectId}
        tree={tree}
        fetchContent={fetchContent}
        onNavigateToBoard={handleNavigateToBoard}
        error={error ?? undefined}
      />
    </PageShell>
  );
};

// --- App ---

const renderRoute = (route: ReturnType<typeof useRouter>): React.ReactNode => {
  switch (route.view) {
    case 'board':
      return <BoardView projectId={route.projectId as ProjectId} />;
    case 'docs':
      return <DocsView projectId={route.projectId as ProjectId} />;
    case 'overview':
      return <OverviewView />;
  }
};

export const App = () => {
  const route = useRouter();
  return <>{renderRoute(route)}</>;
};
