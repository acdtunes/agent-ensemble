# ADR-013: Feature Archive Strategy

## Status

Proposed

## Context

Users need a way to archive completed or abandoned features from projects. Archived features should:
1. Not appear in the active feature list on the project page
2. Have their documentation preserved for future reference
3. Be restorable if needed

The archive operation must be safe (no data loss) and integrate with the existing board UI.

## Decision Drivers

- **Speed/Simplicity** - Users want a quick archive operation with minimal confirmation steps
- **Data Safety** - Documentation must never be lost during archive/restore
- **Restorability** - Archived features must be restorable from the UI
- **Consistency** - Must follow existing codebase patterns (pure core + IO adapters)

## Considered Options

### Option 1: Directory Move to `docs/archive/` (Selected)

Move the entire feature directory from `docs/feature/{name}/` to `docs/archive/{name}/`.

**Pros:**
- Simple mental model: archive = move
- Atomic operation using filesystem `rename()`
- No manifest or database changes required
- Easy to browse/inspect archived content
- Preserves git history (git tracks renames)
- Restore is the inverse operation

**Cons:**
- Feature discovery must skip `docs/archive/`
- Archive timestamp derived from filesystem mtime (not precise)

### Option 2: Soft Delete with Manifest Flag

Add an `archived: true` flag to a manifest file; files stay in place.

**Pros:**
- No file movement
- Precise archive timestamp stored in manifest

**Cons:**
- Requires manifest file changes
- Files still visible in `docs/feature/` (confusing)
- More complex restore logic
- Doesn't match "archive" mental model

### Option 3: Zip Archive

Create `docs/archive/{name}-{timestamp}.zip` and delete original.

**Pros:**
- Compressed storage
- Built-in timestamp versioning (multiple archives of same feature)

**Cons:**
- Harder to browse content
- Restore requires unzip logic
- More complex error handling
- Overkill for text files

### Option 4: External Archive Location

Move to `~/.nwave/archive/{project}/{feature}/` outside the project.

**Pros:**
- Keeps project tree clean

**Cons:**
- Breaks project locality
- Not tracked by git
- Harder to backup with project

## Decision

**Option 1: Directory Move to `docs/archive/`**

Archive features by moving their directory to a sibling `archive/` directory within the project's `docs/` folder.

## Consequences

### Positive

- Zero new dependencies
- Atomic operation (filesystem rename is POSIX-atomic)
- Archived content remains browsable
- Git tracks the move as a rename
- Feature discovery "just works" (only scans `docs/feature/`)
- WebSocket notifications already handle feature list changes

### Negative

- Archive timestamp precision limited to filesystem mtime
- `docs/archive/` directory created on first archive (minor clutter)
- No versioning (archiving same feature twice overwrites)

### Mitigations

- Timestamp precision: Accept filesystem mtime; precise timestamps not critical
- Directory creation: Auto-create on first archive; invisible to users
- Versioning: Out of scope; users can manually rename before re-archiving if needed

## Implementation Notes

1. **Pure Core**: Path resolution and validation functions
2. **IO Adapter**: `rename()` wrapper with error handling
3. **HTTP Routes**: POST for archive/restore, GET for listing
4. **Frontend**: Confirmation dialog, archived section in project view
5. **WebSocket**: Reuse existing `project_list` notification

## References

- [Architecture Design](../feature/feature-archive/design/architecture-design.md)
- [Component Boundaries](../feature/feature-archive/design/component-boundaries.md)
- [Data Models](../feature/feature-archive/design/data-models.md)
