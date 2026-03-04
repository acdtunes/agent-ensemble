# ADR-004: Project Manifest Persistence Strategy

## Status

Accepted

## Context

The multi-project-selector feature allows users to register projects from arbitrary filesystem paths via the UI (POST /api/projects). These registrations must survive server restarts. We need to decide where and how to persist the list of registered project paths.

The current system discovers projects by scanning a single `PROJECTS_ROOT` directory. The new feature supports arbitrary paths outside this directory, so the discovery mechanism alone is insufficient.

## Options Considered

### Option A: JSON file at `~/.nwave/projects.json`

A simple JSON file in the user's home directory storing project IDs and their absolute paths. Written atomically (write to temp file, rename). Read on server startup to restore registrations.

- (+) Zero dependencies -- `JSON.stringify`/`JSON.parse` + `node:fs`
- (+) Human-readable if debugging is needed, though not user-edited
- (+) Atomic write prevents corruption
- (+) `~/.nwave/` is a natural location for app-global config (not per-project)
- (+) Simple schema: version field for future migration
- (-) Not user-editable by design (UI is the interface)
- (-) Single-file means no concurrent writes (not a concern for solo dev on single server)

### Option B: SQLite database

Store registrations in a SQLite database at `~/.nwave/board.db`.

- (+) Structured queries, transactional writes
- (+) Could store additional metadata (registration timestamp, display names)
- (-) New dependency (`better-sqlite3` or `sql.js`) -- 6+ MB native addon
- (-) Overkill for storing 2-5 entries
- (-) Schema migrations for a simple list

### Option C: Per-project marker file

Create a `.nwave-registered` marker file in each project directory. Server scans known directories on startup.

- (+) Registration is co-located with the project
- (+) No central config file to manage
- (-) Requires scanning all registered paths on startup to discover them -- but where is the list of paths to scan?
- (-) Circular: need a list to find the markers, defeating the purpose
- (-) Pollutes project directories with board-specific files

## Decision

**Option A: JSON file at `~/.nwave/projects.json`.**

## Consequences

- New module `manifest-store.ts` with pure validation/transformation functions and IO adapters for read/write
- `~/.nwave/` directory created on first project registration if absent
- Server loads manifest on startup and registers all listed projects
- On `POST /api/projects`: registry.add() then saveManifest()
- On `DELETE /api/projects/:id`: registry.remove() then saveManifest()
- Manifest version field (`"version": 1`) enables future schema migration
- Write uses temp-file + rename for atomicity
- If manifest file is missing on startup, server starts with empty project list (not an error)
