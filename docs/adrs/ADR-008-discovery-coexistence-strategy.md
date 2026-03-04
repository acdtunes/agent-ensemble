# ADR-008: Project Discovery and Manifest Coexistence

## Status

Accepted

## Context

The current system discovers projects by polling a `PROJECTS_ROOT` directory for subdirectories containing `state.yaml` (via `createProjectDiscovery` in `discovery.ts`). The multi-project-selector feature introduces UI-based registration where projects can be at arbitrary filesystem paths, persisted in `~/.nwave/projects.json`.

We need to decide whether these two mechanisms coexist or whether manifest registration replaces directory scanning entirely.

## Options Considered

### Option A: Manifest-primary, discovery-optional (coexistence)

The manifest (`~/.nwave/projects.json`) is the primary source. `PROJECTS_ROOT` directory scanning continues as a secondary source when configured. Both feed into the same `ProjectRegistry`. Discovery-found projects are not persisted to the manifest -- they appear only while present in PROJECTS_ROOT.

- (+) Backward compatible -- existing setups with PROJECTS_ROOT continue working
- (+) Smooth migration path: users can start with PROJECTS_ROOT and gradually switch to manifest
- (+) Discovery handles ephemeral projects (appears/disappears with the directory)
- (-) Two sources of truth: a project could be in both manifest and PROJECTS_ROOT
- (-) Removal ambiguity: DELETE /api/projects/:id only removes from manifest, not from PROJECTS_ROOT

### Option B: Manifest replaces discovery entirely

Remove PROJECTS_ROOT support. All projects must be registered via POST /api/projects.

- (+) Single source of truth -- simpler mental model
- (+) No ambiguity about where projects come from
- (-) Breaking change for existing setups
- (-) Requires manual re-registration of all projects
- (-) Loses the auto-discovery convenience for co-located projects

### Option C: Auto-import PROJECTS_ROOT into manifest on first run

On first server start, scan PROJECTS_ROOT, register all found projects into the manifest, then disable discovery. One-time migration.

- (+) Clean migration -- all projects end up in manifest
- (+) Single source of truth after migration
- (-) One-time migration logic that runs once and is never tested again
- (-) Edge case: what if PROJECTS_ROOT changes after migration?
- (-) More complex startup sequence

## Decision

**Option A: Manifest-primary, discovery-optional (coexistence).**

## Consequences

- Server startup: load manifest first, register all manifest entries. Then, if `PROJECTS_ROOT` is configured, start discovery polling (existing behavior).
- Manifest entries and discovery entries share the same `ProjectRegistry` -- duplicates detected by projectId (discovery's `registry.add` returns `project_exists` for already-registered projects, which is silently ignored)
- `DELETE /api/projects/:id` removes from manifest and registry. If the project was also in PROJECTS_ROOT, discovery will re-add it on next poll. This is acceptable: the user can remove the directory from PROJECTS_ROOT if they want it gone.
- `POST /api/projects` registers in manifest and registry. If the project is also in PROJECTS_ROOT, no conflict -- the manifest registration takes priority (project is already in registry when discovery finds it).
- `PROJECTS_ROOT` config becomes optional (default: not configured). New users start with manifest-only. Existing users keep PROJECTS_ROOT if they have it set.
- No changes to `discovery.ts` -- it continues polling and calling `registry.add`, which handles duplicates gracefully.
