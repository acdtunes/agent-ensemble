# Journey: Board UI Cleanup -- Visual

## Journey Overview

**Goal**: Andres opens the board to monitor multi-agent delivery and encounters a clean, focused interface that shows only actionable information.

**Persona**: Andres, project owner monitoring 3 concurrent features with 5-8 AI agents.

**Emotional Arc**: Overwhelmed (current) -> Focused (after cleanup) -> Informed (with review history)

---

## Current State (Before)

```
+-- Board View ----------------------------------------------------------+
|                                                                         |
|  [Progress Header: 24 steps | Phase 3 of 5 | 12 completed]            |
|                                                                         |
|  +-- Kanban Board (3/4 width) ---+  +-- Sidebar (1/4 width) --------+ |
|  |                               |  |                                | |
|  | Phase 1: Setup                |  |  TEAMMATES                    | |
|  | +-------+-------+-----+----+ |  |  +---------------------------+ | |
|  | |Pending|In Prog|Revw |Done| |  |  | crafter-01                | | |
|  | |       |       |     |    | |  |  | Build auth module         | | |
|  | |       | step-A|     |step| |  |  | 3 completed               | | |
|  | |       | @craf |     |-B  | |  |  +---------------------------+ | |
|  | |       | ter-01|     |@cr | |  |  | crafter-02                | | |
|  | |       | 1 rev.|     |aft | |  |  | Idle          <-- NOISE   | | |
|  | |       |       |     |er  | |  |  | 5 completed               | | |
|  | |       |       |     |-03 | |  |  +---------------------------+ | |
|  | +-------+-------+-----+----+ |  |  | crafter-03                | | |
|  |                               |  |  | Idle          <-- NOISE   | | |
|  | Phase 2: Integration          |  |  | 2 completed               | | |
|  | ...                           |  |  +---------------------------+ | |
|  |                               |  |                                | |
|  +-------------------------------+  |  ACTIVITY        <-- NOISE    | |
|                                     |  +---------------------------+ | |
|                                     |  | 14:30 01-01 pending->     | | |
|                                     |  |        in_progress        | | |
|                                     |  | 14:28 02-03 review->     | | |
|                                     |  |        approved           | | |
|                                     |  | 14:25 01-02 in_progress  | | |
|                                     |  |        ->review           | | |
|                                     |  | ... (up to 50 entries)    | | |
|                                     |  +---------------------------+ | |
|                                     +--------------------------------+ |
+------------------------------------------------------------------------+
```

### Pain Points Annotated

1. **Activity section**: Raw transition log -- no decision value for project owner
2. **Idle teammates**: Historical roster pollutes active team view
3. **Review badge on cards**: "1 review" badge adds visual noise, no actionable info
4. **Teammate on done cards**: Attribution on completed work distracts from active work

---

## Target State (After)

```
+-- Board View ----------------------------------------------------------+
|                                                                         |
|  [Progress Header: 24 steps | Phase 3 of 5 | 12 completed]            |
|                                                                         |
|  +-- Kanban Board (3/4 width) ---+  +-- Sidebar (1/4 width) --------+ |
|  |                               |  |                                | |
|  | Phase 1: Setup                |  |  TEAMMATES                    | |
|  | +-------+-------+-----+----+ |  |  +---------------------------+ | |
|  | |Pending|In Prog|Revw |Done| |  |  | crafter-01                | | |
|  | |       |       |     |    | |  |  | Build auth module         | | |
|  | |       | step-A|     |step| |  |  | 3 completed               | | |
|  | |       | @craf |     |-B  | |  |  +---------------------------+ | |
|  | |       | ter-01|     |    | |  |                                | |
|  | |       |       |     |    | |  |  (Only active teammates shown) | |
|  | |       |       |     |    | |  |  (No Activity section)         | |
|  | +-------+-------+-----+----+ |  |                                | |
|  |                               |  +--------------------------------+ |
|  | Phase 2: Integration          |                                     |
|  | ...                           |                                     |
|  |                               |                                     |
|  +-------------------------------+                                     |
+------------------------------------------------------------------------+
```

### Changes Highlighted

1. Activity section: **Removed entirely**
2. Teammates: **Only crafter-01 shown** (active on "Build auth module"). crafter-02 and crafter-03 (idle, only completed steps) are hidden.
3. Done cards: **No teammate indicator** when teammate_id is null (unassigned after completion)
4. Cards: **No review badge** -- review count removed from card surface

---

## Step Detail Modal: Review History (Target State)

```
+-- Step Detail Modal ---------------------------------------------------+
|                                                                         |
|  Setup API routes                                           [X Close]  |
|  01-02  * In Progress                                                  |
|                                                                         |
|  +-- Description --------------------------------------------------+   |
|  | Create REST API route handlers for authentication endpoints.    |   |
|  +----------------------------------------------------------------+   |
|                                                                         |
|  +-- Teammate -----------------------------------------------------+   |
|  | crafter-01                                                      |   |
|  +----------------------------------------------------------------+   |
|                                                                         |
|  +-- Files --------------------------------------------------------+   |
|  | src/routes.ts                                                   |   |
|  | src/schema.ts                                                   |   |
|  +----------------------------------------------------------------+   |
|                                                                         |
|  +-- Review History -----------------------------------------------+   |
|  |                                                                  |   |
|  |  Review #2 -- 2026-03-02T15:30:00Z                    APPROVED  |   |
|  |  "All issues addressed. Authentication flow is correct.         |   |
|  |   Error handling improved. Ready to merge."                     |   |
|  |                                                                  |   |
|  |  Review #1 -- 2026-03-01T10:15:00Z                    REJECTED  |   |
|  |  "Missing error handling for expired tokens. The auth           |   |
|  |   middleware does not validate token expiry before granting     |   |
|  |   access. Also: SQL injection risk in user lookup query."      |   |
|  |                                                                  |   |
|  +----------------------------------------------------------------+   |
|                                                                         |
|  +-- Timing -------------------------------------------------------+   |
|  | Started: 3/1/2026, 9:00:00 AM -- Completed: 3/2/2026, 4:00 PM |   |
|  | (31h 0m) * 2 review cycles                                      |   |
|  +----------------------------------------------------------------+   |
|                                                                         |
+------------------------------------------------------------------------+
```

### Key Design Decisions

- Review history shows **newest first** (consistent with Activity ordering pattern)
- Each review entry shows: cycle number, timestamp, outcome (approved/rejected), and feedback text
- When no review history data exists, the section falls back to the current behavior (just showing count)
- Review history section only appears when `review_attempts > 0`

---

## Emotional Arc

```
Current State                        Target State

Overwhelmed ----+                    Focused --------+
(too much       |                    (only what      |
 noise)         |                     matters)       |
                |                                    |
        Scanning +---+               Scanning +------+
        (filtering   |               (clean,         |
         mentally)   |                immediate)     |
                     |                               |
             Confused +              Informed -------+
             (what does              (review history
              "2 reviews"             tells the
              mean?)                  full story)
```
