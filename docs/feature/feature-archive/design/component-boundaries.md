# Feature Archive - Component Boundaries

## Dependency Inversion Architecture

Following the project's functional paradigm, components are organized into:
1. **Pure Core** - Business logic with no side effects
2. **IO Adapters** - Thin wrappers for filesystem operations
3. **HTTP Routes** - Request/response handling
4. **UI Components** - React presentation layer

---

## Server-Side Components

### 1. Pure Core: `archive-path-resolver.ts`

```
Input:  (projectPath: string, featureId: FeatureId)
Output: { featurePath: string, archivePath: string }

Responsibilities:
- Resolve absolute paths for feature and archive directories
- No filesystem access
- No side effects
```

**Functions:**
- `resolveArchiveDir(projectPath, featureId) → string`
- `resolveFeatureDir(projectPath, featureId) → string` (re-export from existing)

---

### 2. Pure Core: `archive-core.ts`

```
Input:  Feature/Archive state + request parameters
Output: Validation results, derived data

Responsibilities:
- Validate archive requests (feature exists, not already archived)
- Validate restore requests (archived feature exists, no conflict)
- Derive archived feature list from directory entries
```

**Functions:**
- `validateArchiveRequest(activeFeatureIds, featureId) → Result<void, ArchiveError>`
- `validateRestoreRequest(archivedIds, activeIds, featureId) → Result<void, RestoreError>`
- `deriveArchivedFeature(entry: DirEntry, stats: { mtime: Date }) → ArchivedFeature`
- `isArchiveDir(name: string) → boolean` (same pattern as `isFeatureDir`)

---

### 3. IO Adapter: `archive-io.ts`

```
Input:  Validated paths from pure core
Output: Result<void, error> from filesystem operations

Responsibilities:
- Atomic directory moves (rename)
- Directory scanning
- Error wrapping
```

**Functions:**
- `moveToArchiveFs(featurePath, archivePath) → Promise<Result<void, ArchiveError>>`
- `restoreFromArchiveFs(archivePath, featurePath) → Promise<Result<void, RestoreError>>`
- `scanArchiveDirFs(archiveRoot) → Promise<readonly ArchivedFeature[]>`
- `ensureArchiveDirFs(archiveRoot) → Promise<void>`

---

### 4. HTTP Routes: Extension to `index.ts`

```
Endpoints added to MultiProjectHttpDeps:

archiveFeature?: (projectId, featureId) → Promise<Result<void, ArchiveError>>
restoreFeature?: (projectId, featureId) → Promise<Result<void, RestoreError>>
listArchivedFeatures?: (projectId) → Promise<readonly ArchivedFeature[]>
```

**Route Handlers:**
- `POST /api/projects/:id/features/:featureId/archive`
- `POST /api/projects/:id/archive/:featureId/restore`
- `GET /api/projects/:id/archive`

---

## Client-Side Components

### 5. Hook: `useArchiveFeature.ts`

```typescript
interface UseArchiveFeatureResult {
  readonly archiving: boolean;
  readonly error: string | null;
  readonly archiveFeature: (projectId: string, featureId: string) => Promise<Result>;
}
```

**Responsibilities:**
- API call to archive endpoint
- Loading/error state management
- No confirmation logic (handled by UI)

---

### 6. Hook: `useRestoreFeature.ts`

```typescript
interface UseRestoreFeatureResult {
  readonly restoring: boolean;
  readonly error: string | null;
  readonly restoreFeature: (projectId: string, featureId: string) => Promise<Result>;
}
```

**Responsibilities:**
- API call to restore endpoint
- Loading/error state management

---

### 7. Hook: `useArchivedFeatures.ts`

```typescript
interface UseArchivedFeaturesResult {
  readonly archivedFeatures: readonly ArchivedFeature[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}
```

**Responsibilities:**
- Fetch archived features list
- Auto-refetch on project change

---

### 8. UI: `ArchiveConfirmDialog.tsx`

```typescript
interface ArchiveConfirmDialogProps {
  readonly featureName: string;
  readonly isOpen: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}
```

**Responsibilities:**
- Modal presentation
- Confirm/cancel actions
- Loading state during archive

---

### 9. UI: `ArchivedFeaturesSection.tsx`

```typescript
interface ArchivedFeaturesSectionProps {
  readonly archivedFeatures: readonly ArchivedFeature[];
  readonly onRestore: (featureId: string) => void;
  readonly restoring?: string | null;  // featureId being restored
}
```

**Responsibilities:**
- Collapsible section (collapsed by default)
- List archived features with restore buttons
- Show archived timestamp

---

## Component Dependency Graph

```
HTTP Routes
    ↓
archive-io.ts (IO Adapter)
    ↓
archive-core.ts (Pure Core)
    ↓
archive-path-resolver.ts (Pure Core)
    ↓
shared/types.ts (Types)

---

React Components
    ↓
useArchiveFeature / useRestoreFeature / useArchivedFeatures (Hooks)
    ↓
HTTP API
```

---

## File Locations

```
board/
├── server/
│   ├── archive-path-resolver.ts    # Pure: path resolution
│   ├── archive-core.ts             # Pure: validation, derivation
│   ├── archive-io.ts               # IO: filesystem operations
│   └── index.ts                    # Extended with archive routes
├── src/
│   ├── hooks/
│   │   ├── useArchiveFeature.ts
│   │   ├── useRestoreFeature.ts
│   │   └── useArchivedFeatures.ts
│   └── components/
│       ├── ArchiveConfirmDialog.tsx
│       └── ArchivedFeaturesSection.tsx
└── shared/
    └── types.ts                    # Extended with archive types
```

---

## Interface Contracts

### Server → Client (Archive List Response)

```typescript
// GET /api/projects/:id/archive
{
  archivedFeatures: [
    { featureId: "old-feature", name: "old-feature", archivedAt: "2026-03-01T10:30:00Z" }
  ]
}
```

### Server → Client (Archive/Restore Response)

```typescript
// POST /api/projects/:id/features/:featureId/archive
// 204 No Content on success

// POST /api/projects/:id/archive/:featureId/restore
// 204 No Content on success
```

### Error Responses

```typescript
// 404 - Feature not found
{ error: "Feature 'unknown-feature' not found" }

// 409 - Conflict
{ error: "Feature 'auth-system' is already archived" }
{ error: "Feature 'auth-system' already exists in active features" }

// 500 - Server error
{ error: "Failed to archive: permission denied" }
```
