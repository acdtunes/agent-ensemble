# ADR-003: Documentation Root Configuration Strategy

## Status

Accepted

## Context

The doc-viewer feature needs to know where each project's documentation lives on the filesystem. Projects are discovered by scanning `{projectsRoot}/{projectId}/` directories for `state.yaml`. The actual documentation files may live in a different location (e.g., `~/projects/my-app/docs/`). We need a strategy to map project IDs to their documentation root directories.

## Options Considered

### Option A: Explicit configuration via project.yaml

Each project's state directory (`{projectsRoot}/{projectId}/`) contains an optional `project.yaml` file with a `docs_root` field specifying the absolute or relative path to the docs directory.

- (+) Explicit and unambiguous — no guessing
- (+) Configurable per project — different projects can have docs in different locations
- (+) Graceful degradation — no `project.yaml` means no docs (empty tree, not an error)
- (+) Extensible — `project.yaml` can carry other project metadata in the future
- (+) Reuses existing `js-yaml` dependency for parsing
- (-) Requires user to create `project.yaml` for each project
- (-) One more file to manage per project

### Option B: Convention-based (derive from project path)

Assume docs are always at `{projectsRoot}/{projectId}/docs/` or `{projectsRoot}/../docs/`.

- (+) Zero configuration needed
- (+) Works immediately for single-project setups
- (-) Fragile assumption — docs may not be in the project state directory
- (-) Fails for multi-project setups where each project has a separate workspace
- (-) No override mechanism when convention doesn't match reality

### Option C: Extend state.yaml with docs_root field

Add a `docs_root` field to the existing `state.yaml` schema.

- (+) Single source of truth — no new files
- (-) Couples doc-viewer feature to the Python CLI tools that generate state.yaml
- (-) Requires modifying `team_state.py` — breaks ADR-001 principle (zero CLI modifications)
- (-) Schema version bump needed
- (-) Mixing infrastructure config (where docs live) with runtime state (delivery progress)

## Decision

**Option A: Explicit configuration via project.yaml.**

## Consequences

- New optional file: `{projectsRoot}/{projectId}/project.yaml` with schema `{ docs_root?: string }`
- `toConfig()` in multi-project-server.ts reads `project.yaml` when building `ProjectConfig`
- If `project.yaml` is absent or has no `docs_root`, `ProjectConfig.docsRoot` is `undefined`
- Relative paths in `docs_root` are resolved against the project state directory
- Absolute paths are used as-is
- No modification to `state.yaml`, `team_state.py`, or any Python CLI tools
- `project.yaml` is read once at project registration (not watched for changes — restart server to pick up config changes)
- Future: `project.yaml` can hold additional per-project settings (e.g., display name, theme)
