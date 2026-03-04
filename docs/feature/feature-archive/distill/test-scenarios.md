# Feature Archive - Test Scenarios

## Overview

Acceptance tests for the Feature Archive capability, organized by user story. Tests exercise the driving ports (HTTP API, React components) without mocking internal logic.

## User Stories

### US-01: Archive a Feature from Project

**As a** developer using the NW Teams board
**I want to** archive a completed or abandoned feature
**So that** it no longer clutters my active feature list while preserving documentation

### US-02: View Archived Features

**As a** developer
**I want to** see a list of archived features for my project
**So that** I can track what was previously worked on and potentially restore features

### US-03: Restore an Archived Feature

**As a** developer
**I want to** restore a previously archived feature
**So that** I can resume work on it or reference its documentation in the active list

### US-04: Confirmation Before Archive

**As a** developer
**I want to** confirm before archiving a feature
**So that** I don't accidentally archive an active feature

---

## Test Scenarios by User Story

### US-01: Archive a Feature

| Scenario | Given | When | Then |
|----------|-------|------|------|
| 1.1 Archive existing feature | Feature "auth-system" exists in docs/feature/ | POST /archive for "auth-system" | 204, feature moved to docs/archive/, feature list updated |
| 1.2 Archive non-existent feature | Feature "unknown" does not exist | POST /archive for "unknown" | 404 error "Feature not found" |
| 1.3 Archive already archived feature | Feature exists in docs/archive/ | POST /archive for same feature | 409 error "Feature already archived" |
| 1.4 Archive creates archive directory | docs/archive/ does not exist | POST /archive for first feature | 204, docs/archive/ created, feature moved |
| 1.5 Feature disappears from active list | Feature "auth-system" visible in project | Archive "auth-system" | Feature no longer in active feature list |

### US-02: View Archived Features

| Scenario | Given | When | Then |
|----------|-------|------|------|
| 2.1 List archived features | 2 features in docs/archive/ | GET /archive | Returns both features with archivedAt timestamps |
| 2.2 Empty archive | No features archived | GET /archive | Returns empty array |
| 2.3 Archived section shows count | 3 archived features | Render ArchivedFeaturesSection | Shows "Archived (3)" header |
| 2.4 Archived section collapsed by default | Archived features exist | Render project view | Archived section is collapsed |

### US-03: Restore an Archived Feature

| Scenario | Given | When | Then |
|----------|-------|------|------|
| 3.1 Restore archived feature | Feature "old-poc" in docs/archive/ | POST /restore for "old-poc" | 204, feature moved to docs/feature/ |
| 3.2 Restore non-existent feature | Feature not in archive | POST /restore for "unknown" | 404 error "Feature not found" |
| 3.3 Restore conflicts with active | Feature exists in both locations (edge case) | POST /restore | 409 error "Feature already exists" |
| 3.4 Feature appears in active list | Feature restored | Check feature list | Feature now visible in active features |
| 3.5 Feature removed from archive | Feature restored | Check archived list | Feature no longer in archived section |

### US-04: Confirmation Before Archive

| Scenario | Given | When | Then |
|----------|-------|------|------|
| 4.1 Confirmation dialog shown | User clicks "Archive" button | Archive button clicked | Modal shows with feature name |
| 4.2 Cancel aborts archive | Confirmation dialog open | User clicks "Cancel" | Dialog closes, no API call |
| 4.3 Confirm triggers archive | Confirmation dialog open | User clicks "Archive" | API called, dialog closes on success |
| 4.4 Loading state during archive | User confirms archive | Archive in progress | Button shows loading indicator |

---

## Implementation Order

Following Outside-In TDD, tests are implemented in this order:

1. **Walking Skeleton** - Archive endpoint returns 204 for valid feature
2. **Milestone 1** - Core archive/restore HTTP routes
3. **Milestone 2** - Archive list endpoint and timestamps
4. **Milestone 3** - Frontend hooks (useArchiveFeature, useRestoreFeature)
5. **Milestone 4** - UI components (confirmation dialog, archived section)
6. **Integration** - Full flow from button click to list update

---

## Test File Mapping

| Test File | Layer | Scenarios |
|-----------|-------|-----------|
| `archive-http.test.ts` | Server | US-01 (1.1-1.4), US-02 (2.1-2.2), US-03 (3.1-3.3) |
| `archive_ui_steps.test.tsx` | UI | US-01 (1.5), US-02 (2.3-2.4), US-03 (3.4-3.5), US-04 (all) |

---

## Non-Functional Requirements

| Requirement | Test Approach |
|-------------|---------------|
| Atomic operations | Verify rollback on move failure (mock fs error) |
| WebSocket notification | Verify `project_list` sent after archive/restore |
| Invalid feature ID | 400 for malformed slug patterns |
