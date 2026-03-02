import { useMemo, useState, useCallback } from 'react';
import { useDeliveryState, type ConnectionStatus } from './hooks/useDeliveryState';
import { useProjectList } from './hooks/useProjectList';
import { useRouter } from './hooks/useRouter';
import { ProgressHeader } from './components/ProgressHeader';
import { KanbanBoard } from './components/KanbanBoard';
import { StepDetailModal, buildPlanStepLookup } from './components/StepDetailModal';
import { TeamPanel } from './components/TeamPanel';
import { ActivityFeed } from './components/ActivityFeed';
import { OverviewDashboard } from './components/OverviewDashboard';
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
  <div className="flex items-center gap-2 text-sm text-gray-500">
    <span className={`inline-block h-2 w-2 rounded-full ${CONNECTION_COLORS[status]}`} />
    {CONNECTION_LABELS[status]}
  </div>
);

const Placeholder = ({ error }: { readonly error: string | null }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
    <p className="text-lg">Waiting for server…</p>
    {error !== null && (
      <p className="mt-2 text-sm text-red-500">{error}</p>
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
  <div className="min-h-screen bg-gray-50 text-gray-900">
    <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-4 shadow-sm lg:px-6">
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
            <h2 className="mb-3 text-lg font-medium text-gray-700">Teammates</h2>
            <TeamPanel teammates={state.teammates} steps={state.steps} />
          </section>
          <section aria-label="Activity">
            <h2 className="mb-3 text-lg font-medium text-gray-700">Activity</h2>
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

const BoardView = ({ projectId }: { readonly projectId: ProjectId }) => {
  const { state, plan, transitions, connectionStatus, error } = useDeliveryState(WS_URL, projectId);

  const hasData = state !== null && plan !== null;

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={
        <div className="flex items-center gap-3">
          <a href="#/" className="text-sm text-gray-500 hover:text-gray-800">Overview</a>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-semibold">NW Teams Board</h1>
        </div>
      }
    >
      {hasData
        ? <BoardContent state={state} plan={plan} transitions={transitions} />
        : <Placeholder error={error} />
      }
    </PageShell>
  );
};

const navigateToProject = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}/board`;
};

const OverviewView = () => {
  const { projects, connectionStatus } = useProjectList(WS_URL);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<h1 className="text-xl font-semibold">NW Teams Board</h1>}
    >
      <OverviewDashboard projects={projects} onNavigate={navigateToProject} />
    </PageShell>
  );
};

// --- App ---

export const App = () => {
  const route = useRouter();

  return route.view === 'board'
    ? <BoardView projectId={route.projectId as ProjectId} />
    : <OverviewView />;
};
