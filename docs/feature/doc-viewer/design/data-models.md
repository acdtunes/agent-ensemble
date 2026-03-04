# Data Models: Documentation Viewer (doc-viewer)

All types use TypeScript discriminated unions (sum types) and readonly modifiers (immutable). Extends `shared/types.ts`.

## Doc Tree Types

```typescript
// --- Doc tree node (sum type) ---

type DocNode =
  | { readonly type: 'file'; readonly name: string; readonly path: string }
  | { readonly type: 'directory'; readonly name: string; readonly path: string; readonly children: readonly DocNode[] };

// --- Doc tree (product type with metadata) ---

interface DocTree {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}
```

**Design notes**:
- `DocNode.path` is always relative from docs root (e.g., `adrs/ADR-001-file-watching.md`)
- `DocNode.name` is the display name (filename without extension for files, folder name for directories)
- `fileCount` enables the "8 documents" count in tree headers without traversal
- Directory nodes contain children inline — the tree is materialized, not lazy

## Error Types

```typescript
// --- Doc tree errors (sum type) ---

type DocTreeError =
  | { readonly type: 'not_found'; readonly path: string }
  | { readonly type: 'scan_failed'; readonly message: string };

// --- Doc content errors (sum type) ---

type DocContentError =
  | { readonly type: 'not_found'; readonly path: string }
  | { readonly type: 'invalid_path'; readonly message: string }
  | { readonly type: 'read_failed'; readonly message: string };
```

**Design notes**:
- `invalid_path` covers path traversal attempts and malformed paths
- All errors carry enough context for meaningful client-side error messages
- Compatible with existing `Result<T, E>` pattern

## API Types

### Tree Endpoint

```typescript
// GET /api/projects/:id/docs/tree
// Success (200): DocTreeResponse
// Error (404): { error: string }

interface DocTreeResponse {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}
```

### Content Endpoint

```typescript
// GET /api/projects/:id/docs/content?path={relativePath}
// Success (200): plain text (Content-Type: text/plain; charset=utf-8)
// Error (400): { error: string } (invalid path)
// Error (404): { error: string } (file not found)
```

**Design note**: Content endpoint returns raw markdown as plain text, not JSON-wrapped. This avoids double-encoding and simplifies client consumption.

## Project Configuration Extension

```typescript
// --- Extended ProjectConfig (existing type + docsRoot) ---

interface ProjectConfig {
  readonly projectId: ProjectId;
  readonly statePath: string;
  readonly planPath: string;
  readonly docsRoot?: string;  // absolute path to documentation directory
}

// --- project.yaml schema (optional config file per project) ---

interface ProjectYamlConfig {
  readonly docs_root?: string;  // absolute or relative path
}
```

**Design notes**:
- `docsRoot` is optional — projects without it simply have no docs
- The `toConfig` function resolves `docsRoot` from `project.yaml` if present
- Relative paths in `project.yaml` are resolved against the project state directory

## Route Extension

```typescript
// --- Extended Route (existing type + docs variant) ---

type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string };
```

**Design note**: `docs` route uses same `projectId` parameter as `board` route, enabling tab switching without losing project context.

## Client State Types

```typescript
// --- useDocTree return type ---

interface UseDocTreeResult {
  readonly tree: DocTree | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

// --- useDocContent return type ---

interface UseDocContentResult {
  readonly content: string | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly retry: () => void;
}
```

## Internal Server Types

```typescript
// --- Directory entry (intermediate type for buildDocTree) ---

interface DirEntry {
  readonly name: string;
  readonly path: string;  // relative from docsRoot
  readonly isDirectory: boolean;
}
```

**Design note**: `DirEntry` is the flat representation from `readdir`. `buildDocTree` transforms `DirEntry[]` into the nested `DocNode[]` tree. This separation keeps the recursive directory scanning (effect) separate from the tree construction (pure).

## Extended HTTP Dependencies

```typescript
// --- Extended MultiProjectHttpDeps ---

interface MultiProjectHttpDeps {
  readonly listProjectSummaries: () => readonly ProjectSummary[];
  readonly getProject: (projectId: ProjectId) => Result<ProjectEntry, unknown>;
  readonly getProjectDocsRoot: (projectId: ProjectId) => Result<string | undefined, unknown>;
}
```

**Design note**: `getProjectDocsRoot` added as a separate function rather than bundling into `getProject` — keeps the existing `ProjectEntry` type unchanged and avoids coupling docs concerns into the registry's core interface. Returns `undefined` when no docsRoot is configured (not an error).

## Type Relationships

```
ProjectConfig (extended)
  |
  +-- docsRoot? ---------> scanDocsDir ---------> DocTree
                                                    |
                                                    +-- DocNode[] (recursive)
                                                          |
                                                          +-- file: name + path
                                                          +-- directory: name + path + children

Route (extended)
  |
  +-- 'docs' + projectId ---> DocViewer
                                 |
                                 +-- useDocTree(projectId) --> DocTree
                                 +-- selectedDocPath ---------> useDocContent(projectId, path) --> string (raw md)
                                 +-- selectedDocPath ---------> CopyPathButton
```
