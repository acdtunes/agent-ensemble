# Four Forces Analysis: Conflict Detection

## Primary Job: See which cards will conflict

### Push (Current Frustration)

- **Merge conflicts discovered late**: Team lead only finds out cards touched the same files when merging branches
- **Blind parallel execution**: No visibility into which AI agents are modifying overlapping files
- **Wasted rework**: Conflicts require manual resolution and sometimes redoing work
- **Mental tracking burden**: Must remember which files each card touches

### Pull (Desired Future)

- **Visual conflict indicators**: See at a glance which cards share files
- **Worktree recommendations**: Clear signal when worktrees are needed for isolation
- **Connected card awareness**: Know exactly which cards conflict with each other
- **Proactive planning**: Decide work sequencing before starting, not after conflicts arise

### Anxiety (Adoption Concerns)

- **Information overload**: Too many conflict warnings might cause "alert fatigue"
- **False positives**: What if conflict detection flags cards that wouldn't actually conflict?
- **Performance impact**: Will conflict calculation slow down the board?
- **Learning curve**: Understanding what conflict indicators mean

### Habit (Current Behavior)

- **Manual file scanning**: Mentally comparing `files_to_modify` across cards
- **Sequential work**: Avoiding parallelism to sidestep conflicts entirely
- **Late-stage merging**: Dealing with conflicts only when they appear in git
- **Worktree overuse**: Using worktrees for everything "just in case"

## Switching Trigger

The strongest trigger is **experiencing a painful merge conflict** after two AI agents modified the same file. This "never again" moment creates demand for proactive conflict visibility.

## Design Implications

| Force | Design Response |
|-------|-----------------|
| Push: Late discovery | Show conflicts immediately on the board |
| Pull: Connected cards | Link conflicting cards visually (hover/click to highlight) |
| Anxiety: Alert fatigue | Only show conflicts for non-done cards; use subtle indicators |
| Habit: Sequential work | Enable confident parallelism through visibility |
