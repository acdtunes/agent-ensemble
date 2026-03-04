# Feature Archive - Data Models

## Overview

The archive feature uses filesystem directories as the primary data store, with no database or manifest file required. Archived features are distinguished by their location (`docs/archive/` vs `docs/feature/`).

---

## Domain Types

### ArchivedFeature

Represents a feature that has been moved to the archive.

```typescript
export interface ArchivedFeature {
  readonly featureId: FeatureId;   // Branded slug ID (existing type)
  readonly name: string;           // Human-readable name (same as featureId for now)
  readonly archivedAt: string;     // ISO 8601 timestamp from filesystem mtime
}
```

**Derivation:**
- `featureId`: Directory name under `docs/archive/`
- `name`: Same as `featureId` (mirrors active feature pattern)
- `archivedAt`: Filesystem mtime of the directory

---

## Error Types

### ArchiveError

Discriminated union for archive operation failures.

```typescript
export type ArchiveError =
  | { readonly type: 'not_found'; readonly featureId: FeatureId }
  | { readonly type: 'already_archived'; readonly featureId: FeatureId }
  | { readonly type: 'move_failed'; readonly message: string };
```

| Variant | HTTP Status | Cause |
|---------|-------------|-------|
| `not_found` | 404 | Feature doesn't exist in `docs/feature/` |
| `already_archived` | 409 | Feature already exists in `docs/archive/` |
| `move_failed` | 500 | Filesystem error (permissions, disk full, etc.) |

---

### RestoreError

Discriminated union for restore operation failures.

```typescript
export type RestoreError =
  | { readonly type: 'not_found'; readonly featureId: FeatureId }
  | { readonly type: 'already_exists'; readonly featureId: FeatureId }
  | { readonly type: 'move_failed'; readonly message: string };
```

| Variant | HTTP Status | Cause |
|---------|-------------|-------|
| `not_found` | 404 | Feature doesn't exist in `docs/archive/` |
| `already_exists` | 409 | Feature already exists in `docs/feature/` |
| `move_failed` | 500 | Filesystem error |

---

## Directory Structure

### Before Archive

```
project-root/
└── docs/
    └── feature/
        ├── auth-system/
        │   ├── roadmap.yaml
        │   └── design/
        │       └── architecture.md
        └── user-profile/
            └── roadmap.yaml
```

### After Archiving `auth-system`

```
project-root/
└── docs/
    ├── feature/
    │   └── user-profile/
    │       └── roadmap.yaml
    └── archive/                    # Created on first archive
        └── auth-system/            # Entire directory moved
            ├── roadmap.yaml
            └── design/
                └── architecture.md
```

---

## State Derivation

No persistent state file is needed. All state is derived from the filesystem:

| State | Derivation Method |
|-------|-------------------|
| Active features | Scan `docs/feature/` subdirectories |
| Archived features | Scan `docs/archive/` subdirectories |
| Archive timestamp | `stat(archiveDir).mtime` |

---

## Type Integration with Existing Types

The new types extend `shared/types.ts`:

```typescript
// Existing types (unchanged)
export type FeatureId = string & { readonly __brand: 'FeatureId' };
export interface FeatureSummary { ... }

// New types (added)
export interface ArchivedFeature {
  readonly featureId: FeatureId;
  readonly name: string;
  readonly archivedAt: string;
}

export type ArchiveError = ...;
export type RestoreError = ...;
```

---

## API Response Schemas

### GET `/api/projects/:id/archive`

```typescript
interface ArchivedFeaturesResponse {
  readonly archivedFeatures: readonly ArchivedFeature[];
}
```

**Example:**
```json
{
  "archivedFeatures": [
    {
      "featureId": "auth-system",
      "name": "auth-system",
      "archivedAt": "2026-03-01T10:30:00.000Z"
    },
    {
      "featureId": "old-poc",
      "name": "old-poc",
      "archivedAt": "2026-02-15T14:22:00.000Z"
    }
  ]
}
```

### POST `/api/projects/:id/features/:featureId/archive`

**Success:** `204 No Content`

**Error:**
```json
{
  "error": "Feature 'unknown' not found"
}
```

### POST `/api/projects/:id/archive/:featureId/restore`

**Success:** `204 No Content`

**Error:**
```json
{
  "error": "Feature 'auth-system' already exists in active features"
}
```

---

## Invariants

1. **No duplicate features**: A feature cannot exist in both `docs/feature/` and `docs/archive/` simultaneously
2. **Valid slug IDs**: All feature directories must match the slug pattern (`/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/`)
3. **Atomic operations**: Archive/restore are all-or-nothing; partial moves are not possible
4. **Timestamp accuracy**: `archivedAt` reflects when the directory was last moved (filesystem mtime)
