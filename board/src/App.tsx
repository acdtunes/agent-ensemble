import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  useRoadmapState,
  type ConnectionStatus,
} from "./hooks/useRoadmapState";
import { useProjectList } from "./hooks/useProjectList";
import { useFeatureList } from "./hooks/useFeatureList";
import { useArchivedFeatures } from "./hooks/useArchivedFeatures";
import { useRestoreFeature } from "./hooks/useRestoreFeature";
import { useAddProject } from "./hooks/useAddProject";
import { useRemoveProject } from "./hooks/useRemoveProject";
import { useDocTree, useFeatureDocTree } from "./hooks/useDocTree";
import { useFeatureState } from "./hooks/useFeatureState";
import { computeRoadmapSummary } from "../shared/types";
import { useRouter } from "./hooks/useRouter";
import { ProgressHeader } from "./components/ProgressHeader";
import { KanbanBoard } from "./components/KanbanBoard";
import { StepDetailModal } from "./components/StepDetailModal";
import { buildPlanStepLookup } from "./utils/stepDetailUtils";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { AddProjectDialog } from "./components/AddProjectDialog";
import { ProjectFeatureView } from "./components/ProjectFeatureView";
import { DocViewer } from "./components/DocViewer";
import { FeatureDocsView } from "./components/FeatureDocsView";
import type { Roadmap, ProjectId } from "../shared/types";

// --- Pure functions ---

const computeWsUrl = (location: {
  protocol: string;
  host: string;
  hostname: string;
}): string => {
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsPort = import.meta.env.DEV ? "3002" : "";
  const wsHost = wsPort ? `${location.hostname}:${wsPort}` : location.host;
  return `${wsProtocol}//${wsHost}`;
};

const CONNECTION_LABELS: Readonly<Record<ConnectionStatus, string>> = {
  connecting: "Connecting…",
  connected: "Connected",
  disconnected: "Disconnected",
};

const CONNECTION_COLORS: Readonly<Record<ConnectionStatus, string>> = {
  connecting: "bg-yellow-500",
  connected: "bg-emerald-500",
  disconnected: "bg-red-500",
};

// --- Components ---

const ConnectionIndicator = ({
  status,
}: {
  readonly status: ConnectionStatus;
}) => (
  <div className="flex items-center gap-2 text-sm text-gray-400">
    <span
      className={`inline-block h-2 w-2 rounded-full ${CONNECTION_COLORS[status]}`}
    />
    {CONNECTION_LABELS[status]}
  </div>
);

const Placeholder = ({ error }: { readonly error: string | null }) => (
  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
    <p className="text-lg">Waiting for server…</p>
    {error !== null && <p className="mt-2 text-sm text-red-400">{error}</p>}
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
    <main className="p-4 lg:p-6">{children}</main>
  </div>
);

interface BoardContentProps {
  readonly roadmap: Roadmap;
}

const computeCurrentPhase = (roadmap: Roadmap): number => {
  const index = roadmap.phases.findIndex((p) =>
    p.steps.some((s) => s.status !== "approved"),
  );
  return index === -1 ? roadmap.phases.length : index + 1;
};

const BoardContent = ({ roadmap }: BoardContentProps) => {
  const summary = useMemo(() => computeRoadmapSummary(roadmap), [roadmap]);
  const currentPhase = useMemo(() => computeCurrentPhase(roadmap), [roadmap]);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const stepLookup = useMemo(() => buildPlanStepLookup(roadmap), [roadmap]);

  const handleCardClick = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedStepId(null);
  }, []);

  const selectedStep =
    selectedStepId !== null ? (stepLookup.get(selectedStepId) ?? null) : null;

  return (
    <>
      <ProgressHeader
        summary={summary}
        currentPhase={currentPhase}
        createdAt={roadmap.roadmap.created_at ?? ""}
      />
      <div className="mt-6">
        <KanbanBoard roadmap={roadmap} onCardClick={handleCardClick} />
      </div>
      {selectedStep !== null && (
        <StepDetailModal
          step={selectedStep}
          stepLookup={stepLookup}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
};

// --- Board view (owns useRoadmapState hook for a specific project) ---

const WS_URL = computeWsUrl(
  typeof window !== "undefined"
    ? window.location
    : { protocol: "ws:", host: "localhost:3000", hostname: "localhost" },
);

const ProjectTabs = ({
  projectId,
  activeTab,
}: {
  readonly projectId: string;
  readonly activeTab: "board" | "docs";
}) => (
  <div className="flex items-center gap-3">
    <a href="#/" className="text-sm text-gray-400 hover:text-gray-200">
      Overview
    </a>
    <span className="text-gray-600">/</span>
    <h1 className="text-xl font-semibold text-gray-100">Agent Ensemble</h1>
    <nav className="ml-4 flex gap-1">
      <a
        href={`#/projects/${projectId}/board`}
        className={`px-3 py-1 text-sm rounded-t ${
          activeTab === "board"
            ? "text-gray-100 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Board
      </a>
      <a
        href={`#/projects/${projectId}/docs`}
        className={`px-3 py-1 text-sm rounded-t ${
          activeTab === "docs"
            ? "text-gray-100 border-b-2 border-blue-500"
            : "text-gray-400 hover:text-gray-200"
        }`}
      >
        Docs
      </a>
    </nav>
  </div>
);

const BoardView = ({ projectId }: { readonly projectId: ProjectId }) => {
  const { roadmap, transitions, connectionStatus, error } = useRoadmapState(
    WS_URL,
    projectId,
  );

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={<ProjectTabs projectId={projectId} activeTab="board" />}
    >
      {roadmap !== null ? (
        <BoardContent roadmap={roadmap} />
      ) : (
        <Placeholder error={error} />
      )}
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
  readonly activeTab: "board" | "docs";
}) => {
  const tabClass = (tab: "board" | "docs") =>
    tab === activeTab
      ? "px-3 py-1 text-sm rounded-t text-gray-100 border-b-2 border-blue-500"
      : "px-3 py-1 text-sm rounded-t text-gray-400 hover:text-gray-200";

  return (
    <div className="flex items-center gap-3">
      <a href="#/" className="text-sm text-gray-400 hover:text-gray-200">
        Overview
      </a>
      <span className="text-gray-600">/</span>
      <a
        href={`#/projects/${projectId}`}
        className="text-sm text-gray-400 hover:text-gray-200"
      >
        {projectId}
      </a>
      <span className="text-gray-600">/</span>
      <h1 className="text-lg font-semibold text-gray-100">{featureId}</h1>
      <nav className="ml-4 flex gap-1">
        <a
          href={`#/projects/${projectId}/features/${featureId}/board`}
          className={tabClass("board")}
        >
          Board
        </a>
        <a
          href={`#/projects/${projectId}/features/${featureId}/docs`}
          className={tabClass("docs")}
        >
          Docs
        </a>
      </nav>
    </div>
  );
};

const FeatureBoardView = ({
  projectId,
  featureId,
}: {
  readonly projectId: string;
  readonly featureId: string;
}) => {
  const { roadmap, loading, error, connectionStatus } = useFeatureState(
    projectId,
    featureId,
    WS_URL,
  );

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={
        <FeatureNavHeader
          projectId={projectId}
          featureId={featureId}
          activeTab="board"
        />
      }
    >
      {roadmap !== null ? (
        <BoardContent roadmap={roadmap} />
      ) : loading ? (
        <Placeholder error={null} />
      ) : (
        <Placeholder error={error} />
      )}
    </PageShell>
  );
};

const navigateToProject = (projectId: string): void => {
  window.location.hash = `#/projects/${projectId}`;
};

const navigateToOverview = (): void => {
  window.location.hash = "#/";
};

const navigateToFeatureBoard =
  (projectId: string) =>
  (featureId: string): void => {
    window.location.hash = `#/projects/${projectId}/features/${featureId}/board`;
  };

const navigateToFeatureDocs =
  (projectId: string) =>
  (featureId: string): void => {
    window.location.hash = `#/projects/${projectId}/features/${featureId}/docs`;
  };

const ProjectView = ({ projectId }: { readonly projectId: string }) => {
  const { connectionStatus } = useProjectList(WS_URL);
  const { features, refetch: refetchFeatures } = useFeatureList(projectId);
  const { archivedFeatures, refetch: refetchArchived } =
    useArchivedFeatures(projectId);
  const { restoreFeature, restoring } = useRestoreFeature();
  const [restoringFeatureId, setRestoringFeatureId] = useState<string | null>(
    null,
  );

  // Track previous features length to detect WebSocket updates
  const prevFeaturesRef = useRef(features);

  // Refetch archived features when feature list changes (WebSocket update)
  useEffect(() => {
    if (prevFeaturesRef.current !== features) {
      prevFeaturesRef.current = features;
      refetchArchived();
    }
  }, [features, refetchArchived]);

  const handleRestoreFeature = useCallback(
    async (featureId: string) => {
      setRestoringFeatureId(featureId);
      const result = await restoreFeature(projectId, featureId);
      if (result.ok) {
        refetchFeatures();
        refetchArchived();
      }
      setRestoringFeatureId(null);
    },
    [projectId, restoreFeature, refetchFeatures, refetchArchived],
  );

  const handleArchiveSuccess = useCallback(() => {
    refetchFeatures();
    refetchArchived();
  }, [refetchFeatures, refetchArchived]);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={
        <h1 className="text-xl font-semibold text-gray-100">Agent Ensemble</h1>
      }
    >
      <ProjectFeatureView
        projectId={projectId}
        features={features}
        archivedFeatures={archivedFeatures}
        onNavigateOverview={navigateToOverview}
        onNavigateFeatureBoard={navigateToFeatureBoard(projectId)}
        onNavigateFeatureDocs={navigateToFeatureDocs(projectId)}
        onRestoreFeature={handleRestoreFeature}
        restoringFeatureId={restoringFeatureId}
        onArchiveSuccess={handleArchiveSuccess}
      />
    </PageShell>
  );
};

const OverviewView = () => {
  const { projects, connectionStatus } = useProjectList(WS_URL);
  const {
    addProject,
    submitting: addSubmitting,
    error: addError,
  } = useAddProject();
  const { removeProject } = useRemoveProject();
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddProject = useCallback(() => {
    setShowAddDialog(true);
  }, []);

  const handleSubmitAdd = useCallback(
    async (projectPath: string) => {
      const result = await addProject(projectPath);
      if (result.ok) {
        setShowAddDialog(false);
      }
    },
    [addProject],
  );

  const handleCancelAdd = useCallback(() => {
    setShowAddDialog(false);
  }, []);

  const handleRemoveProject = useCallback(
    async (projectId: string) => {
      await removeProject(projectId);
    },
    [removeProject],
  );

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={
        <h1 className="text-xl font-semibold text-gray-100">Agent Ensemble</h1>
      }
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

  const fetchContent = useCallback(
    async (path: string): Promise<string> => {
      const response = await fetch(
        `/api/projects/${projectId}/docs/content?path=${encodeURIComponent(path)}`,
      );
      if (!response.ok) return "";
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
        error={error ?? undefined}
      />
    </PageShell>
  );
};

const FeatureDocsRouteView = ({
  projectId,
  featureId,
}: {
  readonly projectId: string;
  readonly featureId: string;
}) => {
  const { connectionStatus } = useProjectList(WS_URL);
  const { features } = useFeatureList(projectId);
  const { tree, error } = useFeatureDocTree(projectId, featureId);

  return (
    <PageShell
      connectionStatus={connectionStatus}
      headerContent={
        <FeatureNavHeader
          projectId={projectId}
          featureId={featureId}
          activeTab="docs"
        />
      }
    >
      <FeatureDocsView
        projectId={projectId}
        featureId={featureId}
        tree={tree}
        features={features}
        error={error ?? undefined}
      />
    </PageShell>
  );
};

// --- App ---

const renderRoute = (route: ReturnType<typeof useRouter>): React.ReactNode => {
  switch (route.view) {
    case "board":
      return <BoardView projectId={route.projectId as ProjectId} />;
    case "docs":
      return <DocsView projectId={route.projectId as ProjectId} />;
    case "project":
      return <ProjectView projectId={route.projectId} />;
    case "feature-board":
      return (
        <FeatureBoardView
          projectId={route.projectId}
          featureId={route.featureId}
        />
      );
    case "feature-docs":
      return (
        <FeatureDocsRouteView
          projectId={route.projectId}
          featureId={route.featureId}
        />
      );
    case "overview":
      return <OverviewView />;
  }
};

export const App = () => {
  const route = useRouter();
  return <>{renderRoute(route)}</>;
};
