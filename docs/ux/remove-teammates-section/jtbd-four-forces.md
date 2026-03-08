# Four Forces Analysis: Remove Teammates Section

## Force Diagram

```
                    PROGRESS
                       ↑
    +------------------+------------------+
    |                  |                  |
    |      PUSH        |       PULL       |
    |   (frustration)  |   (attraction)   |
    |                  |                  |
    | • Sidebar takes  | • Full-width     |
    |   25% of screen  |   board view     |
    | • Agent IDs add  | • Cleaner cards  |
    |   visual noise   | • Faster scanning|
    | • No action on   | • Focus on steps |
    |   agent info     |   not agents     |
    |                  |                  |
    +------------------+------------------+
    |                  |                  |
    |     ANXIETY      |      HABIT       |
    |    (concerns)    | (current state)  |
    |                  |                  |
    | • Lose workload  | • Accustomed to  |
    |   visibility?    |   seeing agents  |
    | • Debugging gets | • Mental model   |
    |   harder?        |   of "team"      |
    | • Future features| • Color coding   |
    |   might need it  |   aids scanning  |
    |                  |                  |
    +------------------+------------------+
                       ↓
                   NO CHANGE
```

## Force Analysis

### Push Forces (Current Pain)

| Force | Severity | Evidence |
|-------|----------|----------|
| Sidebar consumes 25% screen width | High | Layout uses `lg:grid-cols-4` with sidebar in 1 column |
| Agent IDs provide no actionable insight | High | Cannot message, reassign, or coordinate with AI agents |
| Visual noise from teammate indicators | Medium | Each card shows emoji + color + ID for non-done status |
| Teammates section shows limited info | Medium | Only shows current step and completed count |

### Pull Forces (Desired Future)

| Force | Strength | Benefit |
|-------|----------|---------|
| Full-width Kanban board | High | More cards visible, better use of screen real estate |
| Cleaner card design | High | Faster visual scanning, reduced cognitive load |
| Focus on outcomes | Medium | Steps and their status matter; agent identity doesn't |
| Simpler mental model | Medium | "What's being done" vs "who's doing it" |

### Anxiety Forces (Adoption Concerns)

| Concern | Mitigation |
|---------|------------|
| Lose workload distribution visibility | Cards already show work-in-progress; count steps per status instead |
| Debugging agent behavior gets harder | Edge case for developers, not primary monitoring use case |
| Future features might need agent info | Data remains in roadmap; can re-add UI if needed |

### Habit Forces (Current Behavior)

| Habit | Transition Strategy |
|-------|---------------------|
| Looking at sidebar for "team" status | Board itself shows all active work more directly |
| Using agent colors to scan cards | Status colors remain; less visual competition |
| Mental model of agents as team members | Reframe: agents are ephemeral executors, not persistent identities |

## Conclusion

**Push + Pull significantly outweigh Anxiety + Habit.**

The teammates section and agent indicators solve a problem that doesn't exist for AI agent monitoring: you cannot take action on agent identity. Removing them eliminates noise and improves the primary job of monitoring delivery progress.
