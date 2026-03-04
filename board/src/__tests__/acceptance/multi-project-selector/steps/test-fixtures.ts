/**
 * Shared test fixtures for multi-project-selector acceptance tests.
 *
 * These fixtures build domain objects (FeatureSummary, ManifestEntry,
 * ProjectManifest, Route, ProjectSummary, DocTree)
 * from business-language descriptions. Step definitions use these to set up
 * preconditions without coupling to internal data structures.
 *
 * Driving ports exercised:
 *   - Pure functions: resolveFeatureDir, resolveFeatureRoadmap, resolveFeatureExecutionLog,
 *     resolveFeatureDocsRoot, deriveFeatureSummary, validateManifest, addEntry, removeEntry,
 *     findDuplicate, parseHash (extended), createFeatureId
 *   - Component props: ProjectCard (extended), FeatureCard, ProjectFeatureView,
 *     FeatureBoardView, FeatureDocsView, ContextDropdowns
 */

import type {
  ProjectId,
  ProjectSummary,
  ProjectConfig,
  DocNode,
  DocTree,
} from '../../../../../shared/types';

// ================================================================
// FeatureId (branded type — mirrors shared/types.ts once extended)
// ================================================================

export type FeatureId = string & { readonly __brand: 'FeatureId' };

// ================================================================
// FeatureSummary (mirrors shared/types.ts once extended)
// ================================================================

export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly done: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
}

// ================================================================
// ManifestEntry and ProjectManifest (mirrors shared/types.ts once extended)
// ================================================================

export interface ManifestEntry {
  readonly id: string;
  readonly path: string;
}

export interface ProjectManifest {
  readonly version: 1;
  readonly projects: readonly ManifestEntry[];
}

// ================================================================
// Extended Route (mirrors useRouter.ts once extended)
// ================================================================

export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'project'; readonly projectId: string }
  | { readonly view: 'feature-board'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'feature-docs'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string };

// ================================================================
// Extended ProjectSummary (mirrors shared/types.ts once extended)
// ================================================================

export interface ExtendedProjectSummary extends Omit<ProjectSummary, never> {
  readonly featureCount: number;
  readonly features: readonly FeatureSummary[];
}

// ================================================================
// FeatureId builder
// ================================================================

export const createTestFeatureId = (raw: string): FeatureId =>
  raw as FeatureId;

// ================================================================
// FeatureSummary builder
// ================================================================

export const createFeatureSummary = (
  overrides: Partial<FeatureSummary> & Pick<FeatureSummary, 'featureId'>,
): FeatureSummary => ({
  name: overrides.featureId as unknown as string,
  hasRoadmap: false,
  hasExecutionLog: false,
  totalSteps: 0,
  done: 0,
  inProgress: 0,
  currentLayer: 1,
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createFeatureSummaryWithRoadmap = (
  featureId: FeatureId,
  totalSteps: number,
  overrides?: Partial<FeatureSummary>,
): FeatureSummary =>
  createFeatureSummary({
    featureId,
    hasRoadmap: true,
    totalSteps,
    ...overrides,
  });

export const createFeatureSummaryDocsOnly = (
  featureId: FeatureId,
): FeatureSummary =>
  createFeatureSummary({
    featureId,
    hasRoadmap: false,
    hasExecutionLog: false,
  });

// ================================================================
// ManifestEntry builder
// ================================================================

export const createManifestEntry = (
  overrides: Partial<ManifestEntry> & Pick<ManifestEntry, 'id' | 'path'>,
): ManifestEntry => ({
  ...overrides,
});

// ================================================================
// ProjectManifest builder
// ================================================================

export const createProjectManifest = (
  entries: readonly ManifestEntry[] = [],
): ProjectManifest => ({
  version: 1,
  projects: entries,
});

export const createEmptyManifest = (): ProjectManifest =>
  createProjectManifest([]);

// ================================================================
// Extended ProjectSummary builder
// ================================================================

export const createTestProjectId = (raw: string): ProjectId =>
  raw as unknown as ProjectId;

export const createExtendedProjectSummary = (
  overrides: Partial<ExtendedProjectSummary> & Pick<ExtendedProjectSummary, 'projectId'>,
): ExtendedProjectSummary => ({
  name: overrides.projectId as string,
  totalSteps: 0,
  done: 0,
  inProgress: 0,
  currentLayer: 1,
  updatedAt: '2026-03-01T01:00:00Z',
  featureCount: overrides.features?.length ?? 0,
  features: [],
  ...overrides,
});

// ================================================================
// ProjectConfig builder
// ================================================================

export interface ExtendedProjectConfig extends ProjectConfig {
  readonly projectPath: string;
}

export const createExtendedProjectConfig = (
  overrides: Partial<ExtendedProjectConfig> & Pick<ExtendedProjectConfig, 'projectId' | 'projectPath'>,
): ExtendedProjectConfig => ({
  statePath: `${overrides.projectPath}/.nwave/state.yaml`,
  planPath: `${overrides.projectPath}/.nwave/plan.yaml`,
  docsRoot: `${overrides.projectPath}/docs`,
  ...overrides,
});

// ================================================================
// DocNode and DocTree builders (reused from doc-viewer pattern)
// ================================================================

export interface DocFileNode {
  readonly type: 'file';
  readonly name: string;
  readonly path: string;
}

export interface DocDirectoryNode {
  readonly type: 'directory';
  readonly name: string;
  readonly path: string;
  readonly children: readonly DocNode[];
}

export const createFileNode = (
  overrides: Partial<DocFileNode> & Pick<DocFileNode, 'name' | 'path'>,
): DocFileNode => ({
  type: 'file',
  ...overrides,
});

export const createDirectoryNode = (
  overrides: Partial<DocDirectoryNode> & Pick<DocDirectoryNode, 'name' | 'path'>,
): DocDirectoryNode => ({
  type: 'directory',
  children: [],
  ...overrides,
});

export const createDocTree = (
  nodes: readonly DocNode[],
  overrides?: { fileCount?: number },
): DocTree => ({
  root: nodes,
  fileCount: overrides?.fileCount ?? countFiles(nodes),
});

const countFiles = (nodes: readonly DocNode[]): number =>
  nodes.reduce((sum, node) =>
    node.type === 'file'
      ? sum + 1
      : sum + countFiles((node as DocDirectoryNode).children),
    0,
  );

export const createEmptyDocTree = (): DocTree => createDocTree([]);

// ================================================================
// Predefined fixture: feature documentation tree
// ================================================================

export const createFeatureDocTree = (featureId: string, folders: readonly string[]): DocTree =>
  createDocTree(
    folders.map(folder =>
      createDirectoryNode({
        name: folder,
        path: `${folder}`,
        children: [],
      }),
    ),
  );

export const createCardRedesignDocTree = (): DocTree =>
  createDocTree([
    createDirectoryNode({
      name: 'discuss',
      path: 'discuss',
      children: [
        createFileNode({ name: 'jtbd-analysis.md', path: 'discuss/jtbd-analysis.md' }),
        createFileNode({ name: 'journey-card-monitoring.md', path: 'discuss/journey-card-monitoring.md' }),
      ],
    }),
    createDirectoryNode({
      name: 'design',
      path: 'design',
      children: [
        createFileNode({ name: 'architecture-design.md', path: 'design/architecture-design.md' }),
      ],
    }),
    createDirectoryNode({
      name: 'distill',
      path: 'distill',
      children: [],
    }),
  ]);

// ================================================================
// Predefined fixture: multi-project setup
// ================================================================

export const createNwTeamsManifestEntry = (): ManifestEntry =>
  createManifestEntry({
    id: 'nw-teams',
    path: '/Users/andres/projects/nw-teams',
  });

export const createKaratekaManifestEntry = (): ManifestEntry =>
  createManifestEntry({
    id: 'karateka',
    path: '/Users/andres/projects/karateka',
  });

export const createTwoProjectManifest = (): ProjectManifest =>
  createProjectManifest([
    createNwTeamsManifestEntry(),
    createKaratekaManifestEntry(),
  ]);

// ================================================================
// Predefined fixture: features for nw-teams project
// ================================================================

export const createNwTeamsFeatures = (): readonly FeatureSummary[] => [
  createFeatureSummaryWithRoadmap(
    createTestFeatureId('card-redesign'),
    7,
    { hasExecutionLog: true, done: 3, inProgress: 2 },
  ),
  createFeatureSummaryWithRoadmap(
    createTestFeatureId('doc-viewer'),
    5,
    { hasExecutionLog: true, done: 2, inProgress: 1 },
  ),
  createFeatureSummaryDocsOnly(createTestFeatureId('kanban-board')),
  createFeatureSummaryWithRoadmap(
    createTestFeatureId('multi-project-selector'),
    10,
    { hasExecutionLog: false },
  ),
];

// ================================================================
// Predefined fixture: manifest JSON strings (for validation tests)
// ================================================================

export const createValidManifestJson = (): string =>
  JSON.stringify({
    version: 1,
    projects: [
      { id: 'nw-teams', path: '/Users/andres/projects/nw-teams' },
      { id: 'karateka', path: '/Users/andres/projects/karateka' },
    ],
  });

export const createMalformedManifestJson = (): string =>
  '{ this is not valid json }';

export const createInvalidSchemaManifestJson = (): string =>
  JSON.stringify({ version: 99, projects: 'not-an-array' });
