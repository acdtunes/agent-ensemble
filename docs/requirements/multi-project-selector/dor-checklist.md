# Definition of Ready Checklist: Multi-Project Selector

## US-01: Add and Remove Projects via UI

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Andres finds it impossible to monitor both projects because discovery requires all projects under a single PROJECTS_ROOT directory" -- domain language, specific pain |
| User/persona identified | PASS | Solo developer with 2-5 projects at scattered filesystem paths, specific projects named (karateka, nw-teams) |
| 3+ domain examples | PASS | 5 examples: happy path (add 2 projects), invalid path, first launch empty state, remove project, duplicate path |
| UAT scenarios (3-7) | PASS | 5 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 11 AC items, each traceable to scenarios |
| Right-sized | PASS | 1-2 days effort, 5 scenarios |
| Technical notes | PASS | References existing ProjectRegistry, ProjectId brand type, POST/DELETE API endpoints, folder picker, server-side persistence, FP paradigm |
| Dependencies tracked | PASS | None (foundational story) |

**DoR Status**: PASSED

---

## US-02: Feature Discovery Within Projects

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Board shows single delivery state per project but real work is organized by feature under docs/feature/" -- specific structural mismatch |
| User/persona identified | PASS | Solo developer with projects containing 1-5 features in docs/feature/{feature-id}/ |
| 3+ domain examples | PASS | 4 examples: happy path (4 features), no roadmap, no docs/feature dir, malformed roadmap |
| UAT scenarios (3-7) | PASS | 5 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 7 AC items traceable to scenarios |
| Right-sized | PASS | 1-2 days effort, 5 scenarios |
| Technical notes | PASS | References scanProjectDirsFs pattern, existing parsers, caching strategy, slug validation, FP paradigm |
| Dependencies tracked | PASS | Depends on US-01 (documented) |

**DoR Status**: PASSED

---

## US-03: Project Overview with Feature Counts

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Card does not tell him how many features exist or which have active deliveries -- he has to click into each project" |
| User/persona identified | PASS | Solo developer with 2-5 registered projects, each with 1-5 features |
| 3+ domain examples | PASS | 3 examples: happy path (feature counts), error project, empty project |
| UAT scenarios (3-7) | PASS | 5 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 6 AC items traceable to scenarios |
| Right-sized | PASS | 1 day effort, 5 scenarios |
| Technical notes | PASS | References ProjectCard.tsx, ProjectSummary type extension, WebSocket protocol extension |
| Dependencies tracked | PASS | Depends on US-01, US-02 (documented) |

**DoR Status**: PASSED

---

## US-04: Project Feature View

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "No intermediate view showing which features exist, their delivery status, and whether they have boards or just documentation" |
| User/persona identified | PASS | Solo developer who has entered a specific project and wants to see all features |
| 3+ domain examples | PASS | 3 examples: happy path (4 features with mixed state), roadmap without execution, malformed roadmap |
| UAT scenarios (3-7) | PASS | 6 scenarios in Given/When/Then |
| AC derived from UAT | PASS | 8 AC items traceable to scenarios |
| Right-sized | PASS | 1-2 days effort, 6 scenarios |
| Technical notes | PASS | References parseHash() changes, new Route variants, feature API endpoint, FeatureCard component, FP paradigm |
| Dependencies tracked | PASS | Depends on US-01, US-02 (documented) |

**DoR Status**: PASSED

---

## US-05: Feature-Level Board View (with project/feature selectors)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Board cannot load feature-level delivery data -- only project-root state.yaml and plan.yaml" |
| User/persona identified | PASS | Solo developer who selected a specific feature and wants its kanban delivery board |
| 3+ domain examples | PASS | 3 examples: happy path (14 steps, mixed status), roadmap without execution-log, parse error |
| UAT scenarios (3-7) | PASS | 8 scenarios in Given/When/Then (including project/feature dropdown switching) |
| AC derived from UAT | PASS | 10 AC items traceable to scenarios (including project and feature dropdowns) |
| Right-sized | PASS | 2-3 days effort, 8 scenarios |
| Technical notes | PASS | References existing board components, path resolution, WebSocket subscription extension, useDeliveryState hook, file watching, FP paradigm |
| Dependencies tracked | PASS | Depends on US-01, US-02, US-04 (documented) |

**DoR Status**: PASSED

---

## US-06: Feature-Level Documentation View (with project/feature selectors)

| DoR Item | Status | Evidence/Issue |
|----------|--------|----------------|
| Problem statement clear | PASS | "Doc viewer scoped to entire project docs/ but he needs it scoped to feature directory when accessed from feature context" |
| User/persona identified | PASS | Solo developer who selected a specific feature and wants its documentation (discuss/design/distill) |
| 3+ domain examples | PASS | 3 examples: happy path (feature docs tree), empty feature, Board-Docs tab switching |
| UAT scenarios (3-7) | PASS | 8 scenarios in Given/When/Then (including project/feature dropdown switching) |
| AC derived from UAT | PASS | 9 AC items traceable to scenarios (including project and feature dropdowns) |
| Right-sized | PASS | 1-2 days effort, 8 scenarios |
| Technical notes | PASS | References existing DocViewer/DocTree/DocContent components, docsRoot scoping, API endpoint extension, getDocsRoot function, FP paradigm |
| Dependencies tracked | PASS | Depends on US-01, US-02, US-04, existing doc viewer (documented) |

**DoR Status**: PASSED

---

## Summary

| Story | DoR Status | Issues |
|-------|-----------|--------|
| US-01 | PASSED | None |
| US-02 | PASSED | None |
| US-03 | PASSED | None |
| US-04 | PASSED | None |
| US-05 | PASSED | None |
| US-06 | PASSED | None |

**Overall**: All 6 stories pass the 8-item DoR hard gate. Package is ready for DESIGN wave handoff.

## Risk Assessment

### Technical Risks
- **Route migration complexity** (Medium): Existing routes `#/projects/{id}/board` and `#/projects/{id}/docs` need to coexist with new feature-level routes. Backward compatibility must be maintained during transition.
- **File watching at scale** (Low): With 5 projects and 5 features each, up to 25 execution-log files may need watching. The existing `createFileWatcher` pattern handles this, but resource usage should be monitored.
- **Parser reuse** (Low): Feature-level `roadmap.yaml` and `execution-log.yaml` may have the same schema as project-root `plan.yaml` and `state.yaml`. The DESIGN wave should confirm schema compatibility.

### Project Risks
- **Scope creep**: Feature discovery could expand into feature management (creating, archiving features). This is explicitly out of scope -- the board is read-only.
- **Manifest format evolution**: Starting with JSON is simple, but YAML or TOML might be preferred. The DESIGN wave should decide the format. The requirements are format-neutral (they specify structure, not syntax).
