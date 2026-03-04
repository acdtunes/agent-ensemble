# JTBD Analysis: Last Updated Timestamp on Feature Cards

## Job Stories

### Job Story 1: Identify Stalled Features
**When** I'm reviewing my project board to understand current feature progress,
**I want to** quickly identify which features have not been touched recently,
**so I can** prioritize work on stalled features or investigate blockers without manually checking file timestamps.

#### Functional Job
Identify features that have become stale or inactive by seeing recency of updates at a glance.

#### Emotional Job
Feel confident that I'm focusing on the right features and not letting important work slip through the cracks.

#### Social Job
Be seen as a proactive project manager who catches stalled work before it becomes a problem.

### Job Story 2: Assess Feature Activity
**When** I'm scanning multiple features to understand team velocity and activity patterns,
**I want to** see relative recency of updates across all features (5m ago vs 2d ago vs 2w ago),
**so I can** quickly assess which features are actively being worked on without opening each one.

#### Functional Job
Understand feature activity patterns through visual timestamp indicators on the board view.

#### Emotional Job
Feel in control of project status without anxiety about hidden stale work.

#### Social Job
Demonstrate awareness of team activity and project health to stakeholders.

## Four Forces Analysis

### Demand-Generating Forces

#### Push: Current Frustration
- Cannot tell if a feature is stale without clicking into it and checking files
- Have to manually remember when last worked on each feature
- Stalled features blend in with active ones on the board
- Must use external tools (git log, file browser) to check activity

#### Pull: Desired Solution
- Instant visual feedback on feature recency ("Updated 5m ago")
- Human-readable time format (5m, 2h, 3d, 2w)
- Passive scanning without clicks
- Consistent with GitHub/modern UI patterns for recency display

### Demand-Reducing Forces

#### Anxiety: Fears About New Solution
- Will the timestamp be distracting or add visual clutter?
- Could timestamp data be stale or inaccurate?
- Will this slow down the board rendering?
- Might create false urgency (feature was planned to pause)

#### Habit: Current Workflow
- Currently check git log or file timestamps when needed
- Memory-based tracking ("I know I worked on auth yesterday")
- Focus on status labels (Active/Planned/Completed) without recency

## Assessment

**Switch Likelihood**: High

**Key Enabler**: Instant visual feedback without clicks (strong Pull)

**Key Blocker**: Visual clutter concerns (minor Anxiety)

**Design Implications**:
- Keep timestamp subtle and non-intrusive (small text, muted color)
- Position timestamp where it feels supplementary, not primary
- Use relative time format familiar from GitHub/Slack (5m ago, 2h ago)
- Ensure timestamp updates on every board refresh (no staleness)
- Consider making it optional or hideable if clutter becomes real issue
