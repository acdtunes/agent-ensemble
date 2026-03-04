# UX Journey: Conflict Visibility

## Journey Map

```
+-------------------+------------------+-------------------+------------------+
|    DISCOVER       |    INVESTIGATE   |      DECIDE       |      ACT         |
+-------------------+------------------+-------------------+------------------+
|                   |                  |                   |                  |
| See conflict      | Click card to    | Understand which  | Start work with  |
| indicator on      | see connected    | files overlap     | worktree or wait |
| kanban card       | conflicting cards|                   |                  |
|                   |                  |                   |                  |
+-------------------+------------------+-------------------+------------------+
| Emotion:          | Emotion:         | Emotion:          | Emotion:         |
| "Heads up!"       | "Show me more"   | "Now I get it"    | "Confident"      |
+-------------------+------------------+-------------------+------------------+
```

## Detailed Steps

### Step 1: Discover Conflict Indicator

**User sees**: A badge on the kanban card showing conflict status
- `conflicts: 2` badge (amber color)
- `needs worktree` badge if card conflicts with in-progress work

**Artifact**: `${conflictCount}` — computed from file overlap analysis

**Emotional arc**: Neutral awareness → "I should look into this"

### Step 2: Investigate Conflicts

**User action**: Hover or click on card to see details

**User sees**:
- List of conflicting card IDs (e.g., "Conflicts with: 1.2, 2.1")
- Highlight conflicting cards on the board
- Shared files listed in tooltip or modal

**Artifact**: `${conflictingStepIds}` — array of step IDs that share files

**Emotional arc**: Curiosity → Understanding

### Step 3: Decide on Approach

**User considers**:
- Can I sequence work to avoid overlap?
- Should I use a worktree for isolation?
- Which card should I start first?

**Information needed**:
- Which files are shared
- Current status of conflicting cards
- Dependency relationships (if any)

**Emotional arc**: Weighing options → Clarity

### Step 4: Act with Confidence

**User action**:
- Starts card work knowing worktree is needed
- Or waits for conflicting card to complete
- Or proceeds with awareness of future merge work

**Emotional arc**: Confidence → Control

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| No conflicts | No indicator shown (clean card) |
| All conflicts are done | Hide conflict indicator |
| Self-referential conflict | Impossible — card can't conflict with itself |
| Transitive conflicts | A→B, B→C doesn't mean A→C (file-based only) |

## Visual Indicators

```
+----------------------------------+
| Step 1.1: Implement auth module  |
|                                  |
| [3 files] [2 deps]              |
| [conflicts: 2] [needs worktree]  |  ← New badges
|                                  |
| teammate-alpha    1.1            |
+----------------------------------+
```
