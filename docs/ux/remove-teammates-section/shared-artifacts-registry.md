# Shared Artifacts Registry: Remove Teammates Section

## Overview

This registry tracks all shared artifacts referenced across the journey and acceptance criteria for the "Remove Teammates Section" feature.

---

## Artifacts

### board_view
| Property | Value |
|----------|-------|
| **Type** | UI View |
| **Source** | System (React component) |
| **Producer** | `App.tsx` → `BoardContent` |
| **Consumers** | User (visual), `KanbanBoard` component |
| **Description** | Full-width Kanban board displaying all phases and their status columns |
| **Changes in Feature** | Layout changes from 75% to 100% width; sidebar removed |

### step_card
| Property | Value |
|----------|-------|
| **Type** | UI Component |
| **Source** | System (React component) |
| **Producer** | `StepCard.tsx` |
| **Consumers** | User (visual), click handler |
| **Description** | Individual card representing a roadmap step |
| **Changes in Feature** | Teammate indicator (emoji + ID) removed |

### step_details_view
| Property | Value |
|----------|-------|
| **Type** | UI Modal |
| **Source** | System (React component) |
| **Producer** | `StepDetailModal.tsx` |
| **Consumers** | User (visual) |
| **Description** | Modal showing step details including description, files, dependencies, review history |
| **Changes in Feature** | Teammate display removed from header |

### roadmap_data
| Property | Value |
|----------|-------|
| **Type** | Data Structure |
| **Source** | API/WebSocket |
| **Producer** | Backend server |
| **Consumers** | `useRoadmapState` hook, all board components |
| **Description** | Complete roadmap with phases, steps, and metadata |
| **Changes in Feature** | None - `teammate_id` field preserved in data, just not displayed |

---

## Artifact Flow

```
roadmap_data (WebSocket)
       │
       ▼
   board_view
       │
       ├──► phase columns
       │         │
       │         ▼
       │    step_card (×N)
       │         │
       │         │ (click)
       │         ▼
       │    step_details_view
       │
       └──► progress_header
```

---

## Removed Artifacts

The following artifacts are removed by this feature:

### teammates_panel (REMOVED)
| Property | Value |
|----------|-------|
| **Type** | UI Component |
| **Previous Source** | `TeamPanel.tsx` |
| **Reason for Removal** | Duplicated card info, provided no actionable insight |

### teammate_indicator (REMOVED)
| Property | Value |
|----------|-------|
| **Type** | UI Element |
| **Previous Location** | `StepCard.tsx`, `StepDetailModal.tsx` |
| **Reason for Removal** | Agent identity not actionable for project owners |

---

## Data Preservation Note

The `teammate_id` field remains in the `RoadmapStep` type and is still transmitted via WebSocket. This feature only removes the **UI display** of teammate information, not the underlying data. This allows:

1. Future features to re-introduce teammate visibility if needed
2. Backend/API compatibility maintained
3. No data migration required
