# JTBD Analysis: Features Page Redesign

## Primary Job Statement

"Help me quickly find and assess the status of specific features across a multi-feature project so I can prioritize my work effectively."

---

## Job Story: Feature Status Assessment

**When** I open the features overview page for a project with 15+ features at various stages,
**I want to** immediately identify which features need my attention based on their status and find specific features by name,
**so I can** decide what to work on next without scanning every card manually.

### Functional Job
Locate a specific feature by name or status within a large feature set and assess its progress at a glance.

### Emotional Job
Feel oriented and in control when facing a large project dashboard -- not overwhelmed by an unsorted wall of cards.

### Social Job
Be seen as someone who stays on top of project progress and can quickly report status to stakeholders.

---

## Forces Analysis: Features Page Redesign

### Demand-Generating

- **Push (frustrations with current solution)**:
  - Cards appear in filesystem order -- no logical grouping, no way to predict where a feature appears
  - "Docs only" label is confusing -- it implies the feature is documentation-only rather than simply lacking a roadmap
  - Cards are too wide for the information they contain, wasting horizontal space and forcing vertical scrolling
  - No way to filter or search -- with 15+ features, finding one requires scanning every card

- **Pull (attractions of the redesigned page)**:
  - Status-grouped ordering (Active > Planned > Completed) puts actionable items first
  - Name search provides instant access to any feature
  - Status filter lets me focus on just the features I care about right now
  - Narrower cards mean more visible at once, reducing scrolling

### Demand-Reducing

- **Anxiety (fears about the new approach)**:
  - Will alphabetical ordering within groups match my mental model? (Some users may expect by-recency)
  - If I filter by status, will I forget about features in other statuses?
  - Will narrower cards lose important information?

- **Habit (inertia of current approach)**:
  - Users have memorized approximate positions of features in the current filesystem order
  - Some users may rely on the "Docs only" label to distinguish features without roadmaps

### Assessment
- **Switch likelihood**: High -- the push forces (no search, no ordering) are strong pain points for projects with many features
- **Key blocker**: Minimal -- anxiety is low because the changes are incremental visual improvements, not workflow changes
- **Key enabler**: Search + status grouping together create a significant productivity improvement
- **Design implication**: Preserve card click behavior (roadmap -> board, no roadmap -> docs) so the core navigation habit is unchanged

---

## Outcome Statements

1. "Minimize the time it takes to locate a specific feature in a large project" (importance: HIGH, current satisfaction: LOW)
2. "Minimize the visual scanning needed to identify which features need attention" (importance: HIGH, current satisfaction: LOW)
3. "Minimize the likelihood of overlooking an active feature that needs work" (importance: MEDIUM, current satisfaction: LOW)
4. "Maximize the number of features visible without scrolling" (importance: MEDIUM, current satisfaction: LOW)
5. "Minimize confusion about what a feature's status means" (importance: MEDIUM, current satisfaction: LOW -- "Docs only" is confusing)

---

## Job Map (8-Step) Applied to "Find and Assess Feature Status"

| Step | Current Experience | Pain Point |
|------|-------------------|------------|
| 1. **Define** | User opens project, wants to check specific features | No pain -- trigger is clear |
| 2. **Locate** | Scan entire card grid visually | No search, no ordering -- pure visual scanning |
| 3. **Prepare** | N/A (no setup needed) | N/A |
| 4. **Confirm** | Read card label to confirm right feature | Card names visible but scattered randomly |
| 5. **Execute** | Click card to navigate to detail view | Works well -- clear click target |
| 6. **Monitor** | Assess progress via card badges and progress bar | "Docs only" label is misleading; status grouping would help |
| 7. **Modify** | N/A (read-only overview) | N/A |
| 8. **Conclude** | Move to next feature or leave | No way to batch-assess by status group |

**Key gaps**: Steps 2 (Locate) and 6 (Monitor) have the most unmet needs. Search/filter addresses Locate; status grouping and removing "Docs only" addresses Monitor.
