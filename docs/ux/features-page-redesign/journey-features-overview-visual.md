# Journey: Features Overview Page (Redesigned)

## Journey Flow

```
[Open Project]
     |
     v
+---------------------------+     +---------------------------+
| ARRIVE at features page   |     | Emotional state:          |
| See status-grouped cards  |---->| Oriented, in control      |
| Active first, then        |     | "I can see what matters"  |
| Planned, then Completed   |     +---------------------------+
+---------------------------+
     |
     v  (optional)
+---------------------------+     +---------------------------+
| SEARCH / FILTER           |     | Emotional state:          |
| Type name in search box   |---->| Focused, efficient        |
| Toggle status filter      |     | "I found it instantly"    |
+---------------------------+     +---------------------------+
     |
     v
+---------------------------+     +---------------------------+
| ASSESS feature card       |     | Emotional state:          |
| Read status, progress bar |---->| Informed, confident       |
| See step count & badges   |     | "I know what's happening" |
+---------------------------+     +---------------------------+
     |
     v
+---------------------------+     +---------------------------+
| NAVIGATE to detail        |     | Emotional state:          |
| Click card -> Board view  |---->| Purposeful                |
| (or Docs view if no       |     | "I'm taking action"       |
| roadmap)                  |     +---------------------------+
+---------------------------+
```

## Emotional Arc
- **Start**: Curious but potentially overwhelmed (many features)
- **Middle**: Oriented and focused (grouping + search narrows scope)
- **End**: Confident and purposeful (clear next action)

Pattern: **Confidence Building** -- from overwhelmed to in-control through progressive filtering.

---

## UI Mockup: Redesigned Features Page

```
+============================================================================+
|  Overview > my-project                                                      |
+============================================================================+
|                                                                             |
|  +--[ Search features... ]---------------------------+  [ All | Active |   |
|  |                                                   |    Planned |        |
|  +---------------------------------------------------+    Completed ]     |
|                                                                             |
|  --- Active (3) ---------------------------------------------------------- |
|                                                                             |
|  +--------------------+ +--------------------+ +--------------------+       |
|  | auth-service       | | payment-gateway    | | user-dashboard     |       |
|  |           Active   | |           Active   | |           Active   |       |
|  | 5 of 12            | | 3 of 8             | | 7 of 10            |       |
|  | [=====>         ]  | | [===>           ]  | | [=======>       ]  |       |
|  | 2 in progress      | | 1 in progress      | | 1 failed           |       |
|  +--------------------+ +--------------------+ +--------------------+       |
|                                                                             |
|  +--------------------+ +--------------------+ +--------------------+       |
|  | email-templates    | | api-documentation  | | onboarding-flow    |       |
|  +--------------------+ +--------------------+ +--------------------+       |
|                                                                             |
|  --- Planned (4) --------------------------------------------------------- |
|                                                                             |
|  +--------------------+ +--------------------+ +--------------------+       |
|  | billing-reports    | | data-export        | | notification-svc   |       |
|  |          Planned   | |          Planned   | |          Planned   |       |
|  | 0 of 6             | | 0 of 4             | | 0 of 9             |       |
|  | [                ] | | [                ] | | [                ] |       |
|  +--------------------+ +--------------------+ +--------------------+       |
|                                                                             |
|  +--------------------+                                                     |
|  | search-indexing    |                                                     |
|  |          Planned   |                                                     |
|  | 0 of 3             |                                                     |
|  | [                ] |                                                     |
|  +--------------------+                                                     |
|                                                                             |
|  --- Completed (2) ------------------------------------------------------- |
|                                                                             |
|  +--------------------+ +--------------------+                              |
|  | ci-pipeline        | | logging-setup      |                              |
|  |        Completed   | |        Completed   |                              |
|  | 5 of 5             | | 3 of 3             |                              |
|  | [================] | | [================] |                              |
|  +--------------------+ +--------------------+                              |
|                                                                             |
+============================================================================+
```

### Key Design Decisions

1. **Status group headers** with count ("Active (3)") provide instant orientation
2. **Cards without roadmaps** (formerly "Docs only") appear under Planned with no progress bar -- no misleading label
3. **Search bar** spans the top -- always visible, no need to discover it
4. **Status filter** as toggle buttons beside search -- single-click to focus on one group
5. **Narrower cards** -- roughly half current width, allowing 6 per row on XL instead of 4
6. **Alphabetical within groups** -- predictable, scannable ordering

### Cards Without Roadmaps

Features without a roadmap no longer show any status label. They appear under the "Planned" group
(since they have no progress to report), display only their name, and navigate to Docs view on click.
The "Docs only" label is removed entirely.

Alternative considered: a separate ungrouped section for roadmap-less features. Rejected because it
adds cognitive load and a fourth group. Treating them as Planned is the simplest mental model.

**Update based on requirements**: Features without roadmaps should simply not show a status tag at all.
They still appear in the card grid but with no status badge, no progress bar, and no step count.
They are sorted alphabetically after all status-grouped features, or within the Planned section.
