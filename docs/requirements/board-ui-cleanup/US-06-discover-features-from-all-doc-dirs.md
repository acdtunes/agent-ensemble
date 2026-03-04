# US-06: Discover Features from All Documentation Directories

## Job Story

When I start working on a new feature (discuss/design phase), I want to see it on the board immediately, so I can browse its documentation before a roadmap exists.

## Problem Statement

Feature discovery only scans `docs/feature/` for subdirectories. Documentation artifacts created during earlier workflow waves (DISCUSS, DESIGN) live in `docs/ux/{feature}/` and `docs/requirements/{feature}/`. These features are invisible on the board until a `roadmap.yaml` is created under `docs/feature/{feature}/`, which only happens after the DESIGN wave completes.

## Acceptance Criteria

1. **Given** a feature directory exists in `docs/ux/{feature-id}/` but NOT in `docs/feature/`, **when** the board discovers features, **then** the feature appears in the feature list with `hasRoadmap: false`.

2. **Given** a feature directory exists in `docs/requirements/{feature-id}/` but NOT in `docs/feature/` or `docs/ux/`, **when** the board discovers features, **then** the feature appears in the feature list with `hasRoadmap: false`.

3. **Given** a feature directory exists in both `docs/ux/{feature-id}/` and `docs/feature/{feature-id}/`, **when** the board discovers features, **then** the feature appears exactly once (deduplicated).

4. **Given** a feature appears from `docs/ux/` only (no roadmap), **when** the user clicks on it, **then** they can navigate to its Docs tab and browse the documentation.

5. **Given** a directory name in `docs/ux/` is not a valid feature slug, **when** the board discovers features, **then** it is ignored (same validation as today).

## Technical Context

- `board/server/feature-discovery.ts` — `scanFeatureDirsFs()` currently only reads `docs/feature/`
- The `FEATURE_BASE = 'docs/feature'` constant is the single scan root
- `deriveFeatureSummary()` already handles `roadmap: null` gracefully (returns `hasRoadmap: false`)
- The fix is in `scanFeatureDirsFs`: scan all three directories (`docs/feature/`, `docs/ux/`, `docs/requirements/`), union the feature IDs, deduplicate

## Affected Files

- `board/server/feature-discovery.ts` — extend `scanFeatureDirsFs` to scan additional directories
- `board/server/feature-discovery.test.ts` (or equivalent) — new test cases

## Priority

**Must Have** — Without this, features are invisible during the discuss and design phases.

## Effort

< 1 day

## DoR Checklist

| Item | Status | Evidence |
|------|--------|----------|
| Problem clear | PASS | Features invisible until roadmap exists |
| Persona identified | PASS | Project owner monitoring feature lifecycle |
| Examples provided | PASS | board-ui-cleanup only in docs/ux/ and docs/requirements/ |
| UAT scenarios | PASS | 5 acceptance criteria above |
| Acceptance criteria testable | PASS | All Given-When-Then format |
| Size appropriate | PASS | Single function change + tests |
| Technical notes | PASS | Affected files and approach identified |
| Dependencies | PASS | None — independent of other stories |
