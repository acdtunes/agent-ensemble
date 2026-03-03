import { useMemo, useState, useCallback } from 'react';
import { useDeliveryState, type ConnectionStatus } from './hooks/useDeliveryState';
import { useProjectList } from './hooks/useProjectList';
import { useFeatureList } from './hooks/useFeatureList';
import { useAddProject } from './hooks/useAddProject';
import { useRemoveProject } from './hooks/useRemoveProject';
import { useDocTree } from './hooks/useDocTree';
import { useFeatureState } from './hooks/useFeatureState';
import { roadmapToExecutionPlan, roadmapToDeliveryState } from '../shared/roadmap-bridge';
import { useRouter } from './hooks/useRouter';
import { ProgressHeader } from './components/ProgressHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { StepDetailModal } from './components/StepDetailModal';
import { buildPlanStepLookup } from './utils/stepDetailUtils';
import { TeamPanel } from './components/TeamPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { OverviewDashboard } from './components/OverviewDashboard';
import { AddProjectDialog } from './components/AddProjectDialog';
import { ProjectFeatureView } from './components/ProjectFeatureView';
import { DocViewer } from './components/DocViewer';
import { FeatureDocsView } from './components/FeatureDocsView';
import type { DeliveryState, ExecutionPlan, StateTransition, ProjectId } from '../shared/types';

// --- Constants ---

const EMPTY_STATE: DeliveryState = {
  schema_version: '1.0',
  created_at: '',
  updated_at: '',
  plan_path: '',
  current_layer: 0,
  summary: { total_steps: 0, total_layers: 0, completed: 0, failed: 0, in_progress: 0 },
  steps: {},
  teammates: {},
};

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

const FeatureNavHeader = ({
  projectId,
  featureId,
  activeTab,
}: {
  readonly projectId: string;
  readonly featureId: string;
  readonly activeTab: 'board' | 'docs';
}) => {
  const tabClass = (tab: 'board' | 'docs') =>
    tab === activeTab
      ? 'px-3 py-1 text-sm rounded-t text-gray-100 border-b-2 border-blue-500'
      : 'px-3 py-1 text-sm rounded-t text-gray-400 hover:text-gray-200';

  return (
    <div className="flex items-center gap-3">
      <a href="#/" className="text-sm text-gray-400 hover:text-gray-200">Overview</a>
      <span className="text-gray-600">/</span>
      <a href={`#/projects/${projectId}`} className="text-sm text-gray-400 hover:text-gray-200">{projectId}</a>
      <span className="text-gray-600">/</span>
      <h1 className="text-lg font-semibold text-gray-100">{featureId}</h1>
      <nav className="ml-4 flex gap-1">
        <a href={`#/projects/${projectId}/features/${featureId}/board`} className={tabClass('board')}>Board</a>
        <a href={`#/projects/${projectId}/features/${featureId}/docs`} className={tabClass('docs')}>Docs</a>
      </nav>
    </div>
  );
};

const FeatureBoardView = ({ projectId, featureId }: { readonly projectId: string; readonly featureId: string }) => {
  const { roadmap, loading, error } = useFeatureState(projectId, featureId);
  const { connectionStatus } = useProjectList(WS_URL);

  const plan = roadmap !== null ? roadmapToExecutionPlan(roadmap) : null;
  const state = roadmap !== null ? roadmapToDeliveryState(roadmap) : null;
  const hasData = plan !== null;

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<FeatureNavHeader projectId={projectId} featureId={featureId} activeTab="board" />}
    >
      {hasData
        ? <BoardContent state={state ?? EMPTY_STATE} plan={plan} transitions={[]} />
        : loading
          ? <Placeholder error={null} />
          : <Placeholder error={error} />
      }
    </PageShell>
  );
};

const navigateToBoard = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}/board`;
};

const navigateToProject = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}`;
};

const navigateToOverview = (): void => {
  window.location.hash = '#/';
};

const navigateToFeatureBoard = (projectId: string) => (featureId: string): void => {
  window.location.hash = `#/projects/${projectId}/features/${featureId}/board`;
};

const navigateToFeatureDocs = (projectId: string) => (featureId: string): void => {
  window.location.hash = `#/projects/${projectId}/features/${featureId}/docs`;
};

const ProjectView = ({ projectId }: { readonly projectId: string }) => {
  const { projects, connectionStatus } = useProjectList(WS_URL);
  const { features } = useFeatureList(projectId);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<h1 className="text-xl font-semibold text-gray-100">NW Teams Board</h1>}
    >
      <ProjectFeatureView
        projectId={projectId}
        features={features}
        onNavigateOverview={navigateToOverview}
        onNavigateFeatureBoard={navigateToFeatureBoard(projectId)}
        onNavigateFeatureDocs={navigateToFeatureDocs(projectId)}
      />
    </PageShell>
  );
};

const OverviewView = () => {
  const { projects, connectionStatus } = useProjectList(WS_URL);
  const { addProject, submitting: addSubmitting, error: addError } = useAddProject();
  const { removeProject } = useRemoveProject();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddProject = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleSubmitAdd = useCallback(async (projectPath: string) => {
    const result = await addProject(projectPath);
    if (result.ok) {
      setShowAddDialog(false);
    }
  }, [addProject]);

  const handleCancelAdd = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  const handleRemoveProject = useCallback(async (projectId: string) => {
    await removeProject(projectId);
  }, [removeProject]);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<h1 className="text-xl font-semibold text-gray-100">NW Teams Board</h1>}
    >
      {showAddDialog && (
        <div className="mb-4">
          <AddProjectDialog
            onSubmit={handleSubmitAdd}
            onCancel={handleCancelAdd}
            submitting={addSubmitting}
            error={addError}
          />
        </div>
      )}
      <OverviewDashboard
        projects={projects}
        onNavigate={navigateToProject}
        onAddProject={handleAddProject}
        onRemoveProject={handleRemoveProject}
      />
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

const FeatureDocsRouteView = ({ projectId, featureId }: { readonly projectId: string; readonly featureId: string }) => {
  const { connectionStatus } = useProjectList(WS_URL);
  const { features } = useFeatureList(projectId);
  const { tree, error } = useDocTree(projectId, featureId);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<h1 className="text-xl font-semibold text-gray-100">NW Teams Board</h1>}
    >
      <FeatureDocsView
        projectId={projectId}
        featureId={featureId}
        tree={tree}
        features={features}
        error={error ?? undefined}
        onNavigateOverview={navigateToOverview}
        onNavigateProject={() => navigateToProject(projectId)}
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
    case 'project':
      return <ProjectView projectId={route.projectId} />;
    case 'feature-board':
      return <FeatureBoardView projectId={route.projectId} featureId={route.featureId} />;
    case 'feature-docs':
      return <FeatureDocsRouteView projectId={route.projectId} featureId={route.featureId} />;
    case 'overview':
      return <OverviewView />;
  }
};

export const App = () => {
  const route = useRouter();
  return <>{renderRoute(route)}</>;
};
