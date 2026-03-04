# Component Boundaries: Documentation Viewer (doc-viewer)

## Server-Side Modules

### `server/doc-tree.ts` — Pure Core + Effect Shell

**Responsibility**: Scan filesystem for markdown files, produce tree structure.

| Function | Purity | Input | Output |
|----------|--------|-------|--------|
| `buildDocTree` | Pure | `readonly DirEntry[]` | `DocTree` |
| `sortNodes` | Pure | `readonly DocNode[]` | `readonly DocNode[]` |
| `scanDocsDir` | Effect | `docsRoot: string` | `Promise<Result<DocTree, DocTreeError>>` |

- `scanDocsDir` is the only effect — it calls `readdir` recursively
- `buildDocTree` transforms flat directory entries into the nested `DocNode` tree
- `sortNodes` applies consistent ordering: directories first (alphabetical), then files (alphabetical)
- Filters to `.md` files only
- Ignores hidden directories (starting with `.`) and `node_modules`

### `server/doc-content.ts` — Pure Core + Effect Shell

**Responsibility**: Validate doc path, read file content.

| Function | Purity | Input | Output |
|----------|--------|-------|--------|
| `validateDocPath` | Pure | `docsRoot: string, relativePath: string` | `Result<string, DocContentError>` |
| `readDocContent` | Effect | `docsRoot: string, validatedPath: string` | `Promise<Result<string, DocContentError>>` |

- `validateDocPath` is security-critical — prevents path traversal
- `readDocContent` reads the file as UTF-8 string
- Separation allows unit testing path validation without filesystem

### `server/project-config.ts` — Effect Shell

**Responsibility**: Read per-project configuration (project.yaml).

| Function | Purity | Input | Output |
|----------|--------|-------|--------|
| `readProjectConfig` | Effect | `configPath: string` | `Result<ProjectYamlConfig, string>` |
| `resolveDocsRoot` | Pure | `projectDir: string, config?: ProjectYamlConfig` | `string \| undefined` |

- `readProjectConfig` reads and parses `project.yaml` (reuses existing `js-yaml`)
- `resolveDocsRoot` determines absolute `docsRoot` from config or returns `undefined`

### `server/index.ts` — Extended HTTP Adapter

**Responsibility**: Two new Express route handlers.

| Endpoint | Method | Dependencies |
|----------|--------|-------------|
| `/api/projects/:id/docs/tree` | GET | `getProjectConfig`, `scanDocsDir` |
| `/api/projects/:id/docs/content` | GET | `getProjectConfig`, `validateDocPath`, `readDocContent` |

- Both endpoints resolve `docsRoot` from `ProjectConfig` via registry
- Both validate `projectId` using existing `createProjectId`
- Content endpoint validates `path` query parameter before reading

## Client-Side Components

### `DocViewer.tsx` — Layout Component

**Responsibility**: Two-panel layout (sidebar + content), state coordination.

- Owns `selectedDocPath` state
- Renders `DocTree` (sidebar) and `DocContent` (main panel)
- Passes `selectedDocPath` down to `DocContent` and `CopyPathButton`
- Shows empty state when no document selected

### `DocTree.tsx` — Navigation Component

**Responsibility**: Collapsible tree with search input.

- Receives `DocTree` data and `onSelectDoc` callback as props
- Owns `expandedFolders` state (Set of folder paths)
- Owns `searchQuery` state
- Filters tree client-side when search query is non-empty
- Preserves parent folder context in search results
- Shows document counts per folder
- Shows empty state when tree is empty or search has no results

### `DocContent.tsx` — Rendering Component

**Responsibility**: Render markdown content with rich formatting.

- Receives `selectedDocPath` and `projectId` as props
- Uses `useDocContent` hook to fetch raw markdown
- Renders via react-markdown with rehype-highlight and mermaid support
- Shows loading state while fetching
- Shows error state with retry on fetch failure
- Content scrolls independently of sidebar

### `CopyPathButton.tsx` — Action Component

**Responsibility**: Copy file path to clipboard with confirmation.

- Receives `filePath: string` as prop
- Uses `navigator.clipboard.writeText()` on click
- Shows "Copied!" for 2 seconds via timeout
- Keyboard accessible (button element)

### Tab Navigation (in project header)

**Responsibility**: Switch between Board and Docs views.

- Renders "Board" and "Docs" tabs
- Active tab highlighted
- Navigates via `window.location.hash` (consistent with existing pattern)
- Shared across BoardView and DocsView

## Client-Side Hooks

### `useDocTree(projectId: ProjectId)`

**Responsibility**: Fetch doc tree via HTTP.

- Calls `GET /api/projects/{projectId}/docs/tree`
- Returns `{ tree: DocTree | null, loading: boolean, error: string | null, refetch: () => void }`
- Fetches on mount and when `projectId` changes
- No caching (tree reflects current filesystem state)

### `useDocContent(projectId: ProjectId, docPath: string | null)`

**Responsibility**: Fetch doc content via HTTP.

- Calls `GET /api/projects/{projectId}/docs/content?path={docPath}`
- Returns `{ content: string | null, loading: boolean, error: string | null, retry: () => void }`
- Fetches when `docPath` changes
- Skips fetch when `docPath` is `null` (no document selected)

## Data Flow

```
User clicks "Docs" tab
  |
  v
useRouter parses hash -> { view: 'docs', projectId }
  |
  v
App renders DocsView -> DocViewer
  |
  +---> useDocTree(projectId)
  |       |
  |       v
  |     GET /api/projects/{id}/docs/tree
  |       |
  |       v
  |     Server: registry.get(id) -> config.docsRoot -> scanDocsDir -> buildDocTree -> JSON response
  |       |
  |       v
  |     DocTree renders sidebar with tree data
  |
  +---> User clicks a document in tree
          |
          v
        DocViewer sets selectedDocPath
          |
          v
        useDocContent(projectId, selectedDocPath)
          |
          v
        GET /api/projects/{id}/docs/content?path={selectedDocPath}
          |
          v
        Server: validateDocPath -> readDocContent -> raw markdown response
          |
          v
        DocContent renders markdown via react-markdown pipeline
          |
          v
        CopyPathButton displays path with copy action
```

## Pure Functions vs Effect Boundaries

```
PURE (unit testable, no mocks):
  buildDocTree, sortNodes, validateDocPath, resolveDocsRoot,
  parseHash (extended), filterTree, deriveProjectSummary (existing)

EFFECT (integration testable):
  scanDocsDir (fs.readdir), readDocContent (fs.readFile),
  readProjectConfig (fs.readFile + yaml.load),
  useDocTree (fetch), useDocContent (fetch)

ADAPTER (e2e testable):
  Express handlers, React components, clipboard API
```
