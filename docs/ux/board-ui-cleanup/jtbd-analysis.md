# JTBD Analysis: Board UI Cleanup

## Job Classification

**Job Type**: Brownfield Improvement (Job 2 from workflow selection)
**Workflow**: discuss -> design -> distill -> baseline -> roadmap -> split -> execute -> review
**UX Research Depth**: Lightweight (focused UI cleanup improvements)
**Number of Jobs**: 4 distinct jobs identified

---

## Job 1: Declutter the Board Sidebar

### Job Story

**When** I am monitoring a multi-agent delivery on the board and the sidebar shows an Activity section with raw status transitions,
**I want to** see only the information that helps me make decisions,
**so I can** focus on what matters (team workload and board state) without parsing noise.

### Job Dimensions

| Dimension | Description |
|-----------|-------------|
| **Functional** | Remove visual noise that does not aid decision-making |
| **Emotional** | Feel focused and in control rather than overwhelmed by data |
| **Social** | Present a clean, professional board when sharing screen with stakeholders |

### Four Forces Analysis

| Force | Description |
|-------|-------------|
| **Push** | The Activity section shows raw transitions ("01-01: pending -> in_progress") that Andres never acts on. It takes up vertical space, pushing the Teammates panel down. The data is too granular to be useful for a project owner -- it is a developer-level audit log, not an executive summary. |
| **Pull** | A cleaner sidebar with only the Teammates panel would let Andres see team status immediately without scrolling. Less cognitive load per board visit. |
| **Anxiety** | Low -- the transition data is not used for any decision today. Concern: "What if I need that data later?" Mitigation: data remains available via WebSocket protocol and could be surfaced in a dedicated audit view if ever needed. |
| **Habit** | The Activity section has been present since board inception, but user never expressed reliance on it. |

### Assessment

- Switch likelihood: **High**
- Key blocker: None significant
- Key enabler: Strong push (wasted space, no decision value)
- Design implication: Remove the Activity section entirely from the board sidebar

### Outcome Statements

1. Minimize the number of non-actionable UI elements visible on the board
2. Minimize the time it takes to locate team status information on the sidebar

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize non-actionable UI elements on board | 80% | 30% | 13.0 | Underserved |
| 2 | Minimize time to locate team status on sidebar | 70% | 50% | 9.0 | Appropriately Served |

**Data Quality**: Team estimate (single stakeholder -- Andres as product owner and primary user)

---

## Job 2: See Only Active Teammates

### Job Story

**When** I glance at the Teammates panel to understand current team workload,
**I want to** see only the teammates who are actively working on steps,
**so I can** instantly assess how many agents are engaged and what they are doing without mentally filtering out idle ones.

### Job Dimensions

| Dimension | Description |
|-----------|-------------|
| **Functional** | Filter teammate list to show only those with active assignments (claimed, in_progress, review statuses) |
| **Emotional** | Feel confident that the panel reflects real-time team engagement, not a historical roster |
| **Social** | When sharing the board with stakeholders, the teammate panel accurately represents the current working team |

### Four Forces Analysis

| Force | Description |
|-------|-------------|
| **Push** | The current TeamPanel shows every teammate who was ever assigned to any step. When tickets are done and teammates unassigned, they appear as "Idle" -- cluttering the panel with historical data. A project with 8 past agents and 2 currently active shows all 8, making it hard to see who is actually working. |
| **Pull** | A filtered list showing only active teammates would give instant clarity: "2 teammates working right now." The panel becomes a real-time status indicator rather than a historical roster. |
| **Anxiety** | Low -- "What about completed count?" The completed count for active teammates can still be shown. Historical teammate data is preserved in the roadmap YAML. |
| **Habit** | Andres currently scans past the idle teammates mentally. Removing them formalizes what he already does cognitively. |

### Assessment

- Switch likelihood: **High**
- Key blocker: None
- Key enabler: Strong push (mental filtering already happening)
- Design implication: Filter `deriveTeammates()` to exclude teammates with no active steps

### Outcome Statements

1. Minimize the likelihood of confusing historical teammates with active team members
2. Minimize the time to assess current team engagement from the sidebar

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize confusion between historical and active teammates | 85% | 25% | 14.5 | Underserved |
| 2 | Minimize time to assess current team engagement | 80% | 40% | 12.0 | Underserved |

---

## Job 3: Clean Up Done Cards

### Job Story

**When** I look at the Done column on the board and see teammate indicators on completed cards,
**I want to** see done cards without teammate attribution when the teammate is no longer assigned,
**so I can** focus on who is actively working on what rather than who historically worked on completed tasks.

### Job Dimensions

| Dimension | Description |
|-----------|-------------|
| **Functional** | Hide teammate indicator on cards in the Done column when the teammate has been unassigned (teammate_id is null) |
| **Emotional** | Feel that the Done column represents closure -- clean, resolved work rather than ongoing attribution |
| **Social** | Board appears orderly: active cards show ownership, done cards show completion |

### Four Forces Analysis

| Force | Description |
|-------|-------------|
| **Push** | Done cards showing teammate names create visual noise. When scanning the board, Andres reads teammate names on done cards and momentarily wonders "is this person still working?" before realizing the card is done. This micro-confusion happens dozens of times per board scan. |
| **Pull** | Clean done cards: just the step name, ID, and file count. The teammate information remains accessible in the step detail modal for anyone who needs the history. |
| **Anxiety** | "Will I lose who worked on what?" -- No, the StepDetailModal already shows teammate info, and the roadmap YAML preserves full history. |
| **Habit** | Low habit -- the teammate indicator on done cards is passively observed, not actively used. |

### Assessment

- Switch likelihood: **High**
- Key blocker: None
- Key enabler: Push (micro-confusion on every board scan)
- Design implication: Conditionally hide teammate indicator on cards where `displayColumn === 'done'` and teammate is unassigned. Note: the user's request specifies "when tickets are done AND teammates are unassigned" -- this means the condition checks both done status and null teammate_id.

### Outcome Statements

1. Minimize the likelihood of visual noise from completed task attribution
2. Minimize the cognitive effort to distinguish active work from completed work

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize visual noise from completed task attribution | 75% | 30% | 11.25 | Appropriately Served |
| 2 | Minimize cognitive effort to distinguish active vs. completed work | 80% | 35% | 12.5 | Underserved |

---

## Job 4: Replace Review Badge with Review History

### Job Story

**When** I see a card on the board and want to understand its review status,
**I want to** access the reviewer's actual feedback and the full review history instead of just a count badge,
**so I can** understand what happened during review (what was flagged, what was fixed) without digging through external logs.

### Job Dimensions

| Dimension | Description |
|-----------|-------------|
| **Functional** | Remove the review count badge from cards (it provides no actionable info at card level). In the step detail modal, show review feedback content and the complete history if multiple review cycles occurred. |
| **Emotional** | Feel informed and confident about the quality journey of each step -- not just "2 reviews happened" but "here is what reviewers said" |
| **Social** | Be able to demonstrate to stakeholders that review feedback is tracked and visible, not just a counter |

### Four Forces Analysis

| Force | Description |
|-------|-------------|
| **Push** | The current review badge ("2 reviews") on cards adds visual clutter without explaining what happened. Seeing "2 reviews" tells Andres nothing about whether the step had minor formatting issues or critical logic bugs. The badge takes up card space for zero decision-making value. |
| **Pull** | Rich review history in the modal: each review cycle with its feedback, timestamps, and outcome. This transforms the modal from a status viewer into a quality audit tool. |
| **Anxiety** | "How will the review feedback data get there?" -- This is a valid concern. The current `RoadmapStep` type only has `review_attempts: number`. Displaying review history requires a new data structure for review feedback. This is a **data dependency** that needs to be tracked. |
| **Habit** | Low -- the review badge is passively observed but never used to make decisions at the card level. |

### Assessment

- Switch likelihood: **Medium** (data dependency on review feedback structure)
- Key blocker: **Data structure** -- `RoadmapStep.review_attempts` is just a number; review feedback content does not exist in the current schema
- Key enabler: Strong pull (quality audit capability)
- Design implication: Two parts -- (1) Remove review badge from cards (simple, no dependency). (2) Add review history to modal (requires schema evolution for review feedback data). These should be separate stories.

### Outcome Statements

1. Minimize the number of non-actionable badges on board cards
2. Minimize the time to understand what happened during a step's review cycles
3. Minimize the likelihood of missing critical review feedback

### Opportunity Scoring

| # | Outcome Statement | Imp. | Sat. | Score | Priority |
|---|-------------------|------|------|-------|----------|
| 1 | Minimize non-actionable badges on cards | 70% | 20% | 12.0 | Underserved |
| 2 | Minimize time to understand review cycle outcomes | 90% | 10% | 17.0 | Extremely Underserved |
| 3 | Minimize likelihood of missing critical review feedback | 85% | 10% | 15.5 | Extremely Underserved |

---

## JTBD-to-Story Bridge

| Job # | Job Statement | Priority | Story Candidates |
|-------|--------------|----------|-----------------|
| 1 | Remove Activity section from sidebar | Must Have | US-01: Remove Activity Section |
| 2 | Show only active teammates | Must Have | US-02: Active-Only Teammates Panel |
| 3 | Clean up done cards | Should Have | US-03: Clean Done Card Appearance |
| 4a | Remove review badge from cards | Must Have | US-04: Remove Review Badge from Cards |
| 4b | Show review history in modal | Should Have | US-05: Review History in Step Detail Modal |

### Dependency Map

```
US-01 (Remove Activity)     -- no dependencies, standalone
US-02 (Active Teammates)    -- no dependencies, standalone
US-03 (Clean Done Cards)    -- no dependencies, standalone
US-04 (Remove Review Badge) -- no dependencies, standalone
US-05 (Review History)      -- depends on schema evolution (review feedback data structure)
                               This is a spike/schema design task that precedes US-05
```

### Consolidated Opportunity Scoring

| # | Outcome Statement | Score | Story |
|---|-------------------|-------|-------|
| 1 | Minimize time to understand review cycle outcomes | 17.0 | US-05 |
| 2 | Minimize likelihood of missing critical review feedback | 15.5 | US-05 |
| 3 | Minimize confusion between historical and active teammates | 14.5 | US-02 |
| 4 | Minimize non-actionable UI elements on board | 13.0 | US-01 |
| 5 | Minimize cognitive effort active vs. completed work | 12.5 | US-03 |
| 6 | Minimize non-actionable badges on cards | 12.0 | US-04 |
| 7 | Minimize time to assess current team engagement | 12.0 | US-02 |
| 8 | Minimize visual noise from completed task attribution | 11.25 | US-03 |

**Scoring Method**: Team estimate (single stakeholder). Confidence: Medium.
