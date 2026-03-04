# Multi-Project Selector -- DISCUSS Wave Requirements Summary

## Feature Overview

Enable the board app to register projects from arbitrary filesystem paths (not just a single parent directory), discover features within each project, and navigate a hierarchy of projects > features > board/docs. This extends the existing multi-project infrastructure to support real-world project organization.

## Story Map

```
Workflow:  [Register]       [Orient]          [Select]           [Drill Down]
              |                |                  |                   |
Row 1:    US-01 Add/Remove  US-03 Overview     US-04 Feature      US-05 Feature
          via UI            with features      view               board
              |                                   |                   |
Row 2:    US-02 Feature                                           US-06 Feature
          discovery                                               docs
```

Row 1 = Must Have (core navigation flow). Row 2 = Must Have (enables Row 1 functionality).

## Stories

| ID | Title | Effort | Scenarios | Dependencies | MoSCoW |
|----|-------|--------|-----------|--------------|--------|
| US-01 | Add and Remove Projects via UI | 1-2 days | 5 | None | Must Have |
| US-02 | Feature Discovery Within Projects | 1-2 days | 5 | US-01 | Must Have |
| US-03 | Project Overview with Feature Counts | 1 day | 5 | US-01, US-02 | Should Have |
| US-04 | Project Feature View | 1-2 days | 6 | US-01, US-02 | Must Have |
| US-05 | Feature-Level Board View (with project/feature selectors) | 2-3 days | 8 | US-01, US-02, US-04 | Must Have |
| US-06 | Feature-Level Documentation View (with project/feature selectors) | 1-2 days | 8 | US-01, US-02, US-04 | Must Have |

**Total estimated effort**: 7-12 days
**Total scenarios**: 37

## Dependency Graph

```
US-01 (Manifest registration)
  |
  v
US-02 (Feature discovery)
  |
  +---> US-03 (Overview with features)
  |
  +---> US-04 (Project feature view)
           |
           +---> US-05 (Feature-level board)
           |
           +---> US-06 (Feature-level docs)
```

**Recommended implementation order**:
1. US-01 (add/remove projects via UI -- foundational, unblocks everything)
2. US-02 (feature discovery -- server-side, unblocks UI stories)
3. US-04 (project feature view -- new route and UI, unblocks drill-down)
4. US-03 (overview with features -- enhances existing overview, lower priority)
5. US-05 (feature board -- reuses existing board with new data source)
6. US-06 (feature docs -- reuses existing doc viewer with new scope)

## Data Model Changes

### New: Add/Remove Project API
```typescript
// New API endpoints
// POST /api/projects { path: string } -> ProjectSummary | ValidationError
// DELETE /api/projects/:id -> void

// Internal persistence (not user-facing)
interface PersistedProjectEntry {
  readonly id: string;    // derived from folder name, validated as ProjectId slug
  readonly path: string;  // absolute filesystem path
}
```

### New: Feature Discovery Types
```typescript
// New types in shared/types.ts
interface FeatureSummary {
  readonly featureId: string;       // directory name slug
  readonly hasRoadmap: boolean;     // roadmap.yaml exists
  readonly hasExecutionLog: boolean; // execution-log.yaml exists
  readonly totalSteps: number;      // from roadmap, 0 if absent
  readonly completed: number;       // from execution-log, 0 if absent
  readonly inProgress: number;
  readonly failed: number;
}
```

### Extended: ProjectSummary
```typescript
// Extend existing ProjectSummary in shared/types.ts
interface ProjectSummary {
  // ... existing fields ...
  readonly featureCount: number;
  readonly features: readonly FeatureSummary[];
}
```

### Extended: Route (useRouter.ts)
```typescript
// Extend Route union in useRouter.ts
export type Route =
  | { readonly view: 'overview' }
  | { readonly view: 'project'; readonly projectId: string }
  | { readonly view: 'feature-board'; readonly projectId: string; readonly featureId: string }
  | { readonly view: 'feature-docs'; readonly projectId: string; readonly featureId: string }
  // Legacy routes (backward compatibility during transition)
  | { readonly view: 'board'; readonly projectId: string }
  | { readonly view: 'docs'; readonly projectId: string };
```

### New API Endpoints
- `GET /api/projects/{projectId}/features` -- returns `FeatureSummary[]`
- `GET /api/projects/{projectId}/features/{featureId}/state` -- returns `DeliveryState`
- `GET /api/projects/{projectId}/features/{featureId}/plan` -- returns `ExecutionPlan`
- `GET /api/projects/{projectId}/features/{featureId}/docs/tree` -- returns `DocTree`
- `GET /api/projects/{projectId}/features/{featureId}/docs/content?path=...` -- returns doc content

### New Components
- `FeatureCard` -- card displaying feature name, progress, Board/Docs links
- `ProjectFeatureView` -- page rendering feature cards for a project

## Job Story Coverage

| Job Story | Covered By |
|-----------|-----------|
| JS-01: Register projects from arbitrary paths | US-01 |
| JS-02: See all projects at a glance | US-03 |
| JS-03: Navigate to feature within project | US-02, US-04, US-05, US-06 |
| JS-04: Switch between projects quickly | US-04 (breadcrumb navigation) |

## Architectural Notes

### Coexistence with Existing Discovery
US-01 introduces UI-based project registration via `POST /api/projects` and `DELETE /api/projects/:id`. The existing `PROJECTS_ROOT` directory scanning (`createProjectDiscovery` in `discovery.ts`) can coexist -- UI-registered projects are the primary source, directory scanning is a secondary/optional source. Both feed into the same `ProjectRegistry`. This is a decision for the DESIGN wave, not prescribed here.

### Feature Artifacts vs Project Artifacts
Currently the board loads `state.yaml` and `plan.yaml` from the project root. Feature-level delivery uses `execution-log.yaml` and `roadmap.yaml` from `docs/feature/{featureId}/`. These may have the same schema but different names. The parser functions are reusable; the path resolution logic is what changes.

### Functional Programming Alignment
All new modules should follow the existing functional patterns:
- Pure functions for parsing, validation, path resolution
- IO adapters for filesystem access
- Result types for error handling (railway-oriented)
- Branded types for IDs (ProjectId, FeatureId)

## Artifacts Produced

| Artifact | Path |
|----------|------|
| JTBD Analysis | `docs/ux/multi-project-selector/jtbd-analysis.md` |
| Journey Visual | `docs/ux/multi-project-selector/journey-multi-project-visual.md` |
| Journey Schema | `docs/ux/multi-project-selector/journey-multi-project.yaml` |
| Journey Gherkin | `docs/ux/multi-project-selector/journey-multi-project.feature` |
| Shared Artifacts Registry | `docs/ux/multi-project-selector/shared-artifacts-registry.md` |
| US-01: Add/Remove Projects via UI | `docs/requirements/multi-project-selector/US-01-project-manifest-registration.md` |
| US-02: Feature Discovery | `docs/requirements/multi-project-selector/US-02-feature-discovery.md` |
| US-03: Overview with Features | `docs/requirements/multi-project-selector/US-03-project-overview-with-features.md` |
| US-04: Project Feature View | `docs/requirements/multi-project-selector/US-04-project-feature-view.md` |
| US-05: Feature Board | `docs/requirements/multi-project-selector/US-05-feature-level-board.md` |
| US-06: Feature Docs | `docs/requirements/multi-project-selector/US-06-feature-level-docs.md` |
| This Summary | `docs/requirements/multi-project-selector/requirements-summary.md` |
| DoR Checklist | `docs/requirements/multi-project-selector/dor-checklist.md` |

## Handoff Readiness

This package is ready for DESIGN wave handoff pending DoR validation. All 6 user stories have:
- Problem statements in domain language
- Persona with specific characteristics
- 3+ domain examples with real data
- 3-7 UAT scenarios in Given/When/Then
- Acceptance criteria derived from scenarios
- Right-sized (1-3 days each)
- Technical notes identifying constraints and dependencies
- Dependencies documented and tracked
