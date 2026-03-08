# Journey: Remove Teammates Section — Visual

## Journey Overview

**Goal**: Andres opens the board and immediately sees a clean, full-width view of delivery progress without agent-related noise.

**Persona**: Andres, project owner monitoring 3 concurrent features with 5-8 AI agents.

**Emotional Arc**: Overwhelmed (before) → Focused (after)

---

## Before State

```
+-- Board View ----------------------------------------------------------+
|                                                                         |
|  [Progress Header: 24 steps | Phase 3 of 5 | 12 completed]             |
|                                                                         |
|  +-- Kanban Board (3/4 width) ---+  +-- Sidebar (1/4 width) ---------+ |
|  |                               |  |                                 | |
|  | Phase 1: Setup                |  |  TEAMMATES                      | |
|  | +-------+-------+-----+----+  |  |  +---------------------------+  | |
|  | |Pending|In Prog|Revw |Done|  |  |  | crafter-01                |  | |
|  | |       |       |     |    |  |  |  | Build auth module         |  | |
|  | |       | step-A|     |step|  |  |  | 3 completed               |  | |
|  | |       | 🔧    |     |-B  |  |  |  +---------------------------+  | |
|  | |       |@craft |     |    |  |  |                                 | |
|  | |       |er-01  |     |    |  |  |  (Sidebar takes 25% width)     | |
|  | +-------+-------+-----+----+  |  |                                 | |
|  |                               |  +--------------------------------+ | |
|  | Phase 2: Integration          |                                     |
|  | +-------+-------+-----+----+  |                                     |
|  | |       | step-C|     |    |  |                                     |
|  | |       | 🔬    |     |    |  |                                     |
|  | |       |@resear|     |    |  |                                     |
|  | |       |cher   |     |    |  |                                     |
|  | +-------+-------+-----+----+  |                                     |
|  +-------------------------------+                                     |
+------------------------------------------------------------------------+

ISSUES:
├── Sidebar consumes 25% of screen width
├── Cards show @agent-id adding visual noise
├── Teammate section duplicates card info
└── Agent identity provides no actionable insight
```

---

## After State

```
+-- Board View (Full Width) ---------------------------------------------+
|                                                                         |
|  [Progress Header: 24 steps | Phase 3 of 5 | 12 completed]             |
|                                                                         |
|  +-- Kanban Board (FULL WIDTH) ----------------------------------------+|
|  |                                                                     ||
|  | Phase 1: Setup                                                      ||
|  | +-----------+-----------+-----------+-----------+                   ||
|  | | Pending   | In Prog   | Review    | Done      |                   ||
|  | |           |           |           |           |                   ||
|  | |           | step-A    |           | step-B    |                   ||
|  | |           | Setup API |           | Init DB   |                   ||
|  | |           | routes    |           | schema    |                   ||
|  | +-----------+-----------+-----------+-----------+                   ||
|  |                                                                     ||
|  | Phase 2: Integration                                                ||
|  | +-----------+-----------+-----------+-----------+                   ||
|  | |           | step-C    |           |           |                   ||
|  | |           | Connect   |           |           |                   ||
|  | |           | services  |           |           |                   ||
|  | +-----------+-----------+-----------+-----------+                   ||
|  |                                                                     ||
|  +---------------------------------------------------------------------+|
+------------------------------------------------------------------------+

IMPROVEMENTS:
├── Full-width board uses 100% of available space
├── Cards show step name and status only
├── No sidebar — all info is on the board
└── Cleaner visual hierarchy, faster scanning
```

---

## Modal: Before vs After

### Before
```
+-- Step Detail Modal --------------------------------------------------+
|                                                                        |
|  Setup API routes                      🔧 crafter-01        [X Close] |
|  01-02  · In Progress                                                 |
|                                                                        |
|  +-- Description ------------------------------------------------+    |
|  | Create REST API route handlers for authentication endpoints.  |    |
|  +---------------------------------------------------------------+    |
|                                                                        |
|  +-- Files ------------------------------------------------------+    |
|  | src/routes.ts                                                 |    |
|  +---------------------------------------------------------------+    |
|                                                                        |
+-----------------------------------------------------------------------+
```

### After
```
+-- Step Detail Modal --------------------------------------------------+
|                                                                        |
|  Setup API routes                                           [X Close] |
|  01-02  · In Progress                                                 |
|                                                                        |
|  +-- Description ------------------------------------------------+    |
|  | Create REST API route handlers for authentication endpoints.  |    |
|  +---------------------------------------------------------------+    |
|                                                                        |
|  +-- Files ------------------------------------------------------+    |
|  | src/routes.ts                                                 |    |
|  +---------------------------------------------------------------+    |
|                                                                        |
+-----------------------------------------------------------------------+

CHANGE: Removed "🔧 crafter-01" from header — agent identity not actionable
```

---

## Emotional Arc

```
BEFORE                              AFTER

Scanning ──┐                        Scanning ──┐
           │                                   │
           ▼                                   ▼
    Filtering noise                     Immediate clarity
    (agent colors,                      (status-focused,
     sidebar info)                       full-width view)
           │                                   │
           ▼                                   ▼
    Mental overhead                     Quick assessment
    ("who is doing                      ("what's in progress,
     what?")                             what's done")
           │                                   │
           ▼                                   ▼
    ❌ Overwhelmed                      ✓ Focused
```

---

## Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| Board width | 75% | 100% |
| Visual elements per card | 4-5 (name, status, agent, emoji, color) | 2-3 (name, status, color) |
| Sidebar sections | 1 (Teammates) | 0 |
| Time to scan board | Higher (filtering noise) | Lower (direct info) |
