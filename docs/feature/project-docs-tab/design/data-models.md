# Data Models: Project Docs Tab

## Overview

No new data models required. This feature uses existing types.

## Existing Types (Reused)

### Route Union (useRouter.ts)

```typescript
export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'project'; readonly projectId: string }
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string }
  | { readonly view: 'feature-board'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'feature-docs'; readonly projectId: string; readonly featureId: string };
```

No changes needed. `project` and `docs` views already defined.

### DocTree (shared/types.ts)

```typescript
export type DocNode =
  | { readonly type: 'file'; readonly name: string; readonly path: string }
  | { readonly type: 'directory'; readonly name: string; readonly path: string; readonly children: readonly DocNode[] };

export interface DocTree {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}
```

Already used by `useDocTree(projectId)` and `DocViewer`.

### ProjectId (shared/types.ts)

```typescript
export type ProjectId = string & { readonly __brand: 'ProjectId' };
```

Already used for type-safe project identification.

## API Contracts (Existing)

### GET /api/projects/{projectId}/docs/tree

**Response**: `DocTree`
```json
{
  "root": [
    { "type": "directory", "name": "adrs", "path": "adrs", "children": [...] },
    { "type": "file", "name": "README.md", "path": "README.md" }
  ],
  "fileCount": 15
}
```

### GET /api/projects/{projectId}/docs/content?path={path}

**Response**: `text/plain` (markdown content)

Both endpoints already implemented and used by `DocsView`.

## State Shape

No new state. `ProjectView` adds no documentation-related state.

Tab navigation is stateless - derived from URL hash via `useRouter()`.
