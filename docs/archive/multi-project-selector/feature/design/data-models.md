# Multi-Project Selector -- Data Models

## New Types (`board/shared/types.ts`)

### FeatureId (Branded Type)

```typescript
export type FeatureId = string & { readonly __brand: 'FeatureId' };

// Reuse the same slug pattern as ProjectId
const FEATURE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const createFeatureId = (raw: string): Result<FeatureId, string> =>
  FEATURE_ID_PATTERN.test(raw)
    ? ok(raw as FeatureId)
    : err(`Invalid feature ID: '${raw}'. Must be a lowercase slug.`);
```

### FeatureSummary

```typescript
export interface FeatureSummary {
  readonly featureId: FeatureId;
  readonly hasRoadmap: boolean;
  readonly hasExecutionLog: boolean;
  readonly totalSteps: number;
  readonly completed: number;
  readonly inProgress: number;
  readonly failed: number;
}
```

### ManifestEntry

```typescript
export interface ManifestEntry {
  readonly id: string;
  readonly path: string;
}
```

### ProjectManifest

```typescript
export interface ProjectManifest {
  readonly version: 1;
  readonly projects: readonly ManifestEntry[];
}
```

## Extended Types (`board/shared/types.ts`)

### ProjectSummary (extended)

```typescript
export interface ProjectSummary {
  readonly projectId: ProjectId;
  readonly name: string;
  readonly totalSteps: number;
  readonly completed: number;
  readonly failed: number;
  readonly inProgress: number;
  readonly currentLayer: number;
  readonly updatedAt: string;
  // New fields:
  readonly featureCount: number;
  readonly features: readonly FeatureSummary[];
}
```

### ProjectConfig (extended)

```typescript
export interface ProjectConfig {
  readonly projectId: ProjectId;
  readonly statePath: string;
  readonly planPath: string;
  readonly docsRoot?: string;
  // New field:
  readonly projectPath: string;  // absolute path to project root directory
}
```

### Route (extended, `board/src/hooks/useRouter.ts`)

```typescript
export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'project'; readonly projectId: string }
  | { readonly view: 'feature-board'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'feature-docs'; readonly projectId: string; readonly featureId: string }
  // Legacy routes (backward compatible):
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string };
```

### Hash Patterns

```
#/                                                -> { view: 'overview' }
#/projects/{projectId}                           -> { view: 'project', projectId }
#/projects/{projectId}/features/{featureId}/board -> { view: 'feature-board', projectId, featureId }
#/projects/{projectId}/features/{featureId}/docs  -> { view: 'feature-docs', projectId, featureId }
#/projects/{projectId}/board                     -> { view: 'board', projectId }  (legacy)
#/projects/{projectId}/docs                      -> { view: 'docs', projectId }   (legacy)
```

## Persisted Manifest Schema

File: `~/.nwave/projects.json`

```json
{
  "version": 1,
  "projects": [
    {
      "id": "karateka",
      "path": "/Users/andres.dandrea/projects/personal/karateka"
    },
    {
      "id": "nw-teams",
      "path": "/Users/andres.dandrea/projects/personal/nw-teams"
    }
  ]
}
```

### Schema Rules
- `version`: always `1` (for future migration support)
- `projects`: array of `ManifestEntry`
- `id`: derived from `path.basename(entry.path)`, validated via `createProjectId`
- `path`: absolute filesystem path to project root
- File is atomically written (write to temp, rename)
- Created on first project add if missing
- `~/.nwave/` directory created if missing

## Extended WebSocket Protocol

### ProjectSummary in `project_list` Message

The existing `project_list` message sends `ProjectSummary[]`. The extended `ProjectSummary` adds `featureCount` and `features`. Clients that do not use these fields (none exist -- we control both ends) are unaffected.

```typescript
// ServerWSMessage (unchanged structure, extended payload)
| { readonly type: 'project_list'; readonly projects: readonly ProjectSummary[] }
```

### No New Message Types

Feature-level data is served via HTTP. No new WebSocket message types are needed.

### ClientWSMessage (unchanged)

```typescript
export type ClientWSMessage =
  | { readonly type: 'subscribe'; readonly projectId: ProjectId }
  | { readonly type: 'unsubscribe'; readonly projectId: ProjectId };
```

## API Request/Response Schemas

### POST /api/projects

Request:
```typescript
interface AddProjectRequest {
  readonly path: string;  // absolute filesystem path
}
```

Response (201):
```typescript
// Returns ProjectSummary
```

Response (400):
```typescript
{ readonly error: string }  // "Directory not found", "Invalid project ID"
```

Response (409):
```typescript
{ readonly error: string }  // "This project is already registered"
```

### DELETE /api/projects/:id

Response (204): empty body
Response (404): `{ readonly error: string }`

### GET /api/projects/:id/features

Response (200):
```typescript
readonly FeatureSummary[]
```

Response (404): `{ readonly error: string }` (project not found)

### GET /api/projects/:id/features/:featureId/state

Response (200): `DeliveryState` (existing type)
Response (404): `{ readonly error: string }` (project not found, or execution-log not found)

### GET /api/projects/:id/features/:featureId/plan

Response (200): `ExecutionPlan` (existing type)
Response (404): `{ readonly error: string }` (project not found, or roadmap not found)

### GET /api/projects/:id/features/:featureId/docs/tree

Response (200): `DocTree` (existing type)
Response (404): `{ readonly error: string }`

### GET /api/projects/:id/features/:featureId/docs/content?path=...

Response (200): `text/markdown` (existing behavior)
Response (400/404): `{ readonly error: string }`

## Filesystem Layout

```
~/.nwave/
  projects.json          # Project manifest (new)

{projectPath}/
  state.yaml             # Project-root delivery state (existing)
  plan.yaml              # Project-root execution plan (existing)
  project.yaml           # Project config with docs_root (existing, ADR-003)
  docs/
    feature/
      {featureId}/
        roadmap.yaml       # Feature execution plan (ExecutionPlan format)
        execution-log.yaml # Feature delivery state (DeliveryState format)
        discuss/           # Feature documentation
        design/
        distill/
```

## Type Derivation Functions

### deriveProjectSummary (extended)

```typescript
// Extended to accept features parameter
export const deriveProjectSummary = (
  projectId: ProjectId,
  state: DeliveryState,
  features: readonly FeatureSummary[],
): ProjectSummary => ({
  projectId,
  name: projectId as string,
  totalSteps: state.summary.total_steps,
  completed: state.summary.completed,
  failed: state.summary.failed,
  inProgress: state.summary.in_progress,
  currentLayer: state.current_layer,
  updatedAt: state.updated_at,
  featureCount: features.length,
  features,
});
```

### deriveFeatureSummary (new)

```typescript
export const deriveFeatureSummary = (
  featureId: FeatureId,
  plan: ExecutionPlan | null,
  state: DeliveryState | null,
): FeatureSummary => ({
  featureId,
  hasRoadmap: plan !== null,
  hasExecutionLog: state !== null,
  totalSteps: plan?.summary.total_steps ?? 0,
  completed: state?.summary.completed ?? 0,
  inProgress: state?.summary.in_progress ?? 0,
  failed: state?.summary.failed ?? 0,
});
```
