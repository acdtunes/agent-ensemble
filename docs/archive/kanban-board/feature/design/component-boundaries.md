# Component Boundaries: Kanban Board

## Boundary: Server vs Client

The server and client are separated by a WebSocket protocol. They share TypeScript type definitions but have no runtime coupling beyond message passing.

```
server/                          src/
├── Owns: file watching          ├── Owns: rendering
├── Owns: YAML parsing           ├── Owns: layout/styling
├── Owns: state diffing          ├── Owns: user interactions
├── Exposes: WebSocket API       ├── Consumes: WebSocket API
└── Exposes: HTTP REST API       └── Consumes: HTTP REST API
```

## Server Components

### FileWatcher (watcher.ts)
- **Responsibility**: Watch `.nw-teams/state.yaml` for changes
- **Input**: File path
- **Output**: Raw YAML string on change
- **Behavior**: Debounces rapid writes (100ms) to avoid partial reads
- **Dependencies**: chokidar

### StateParser (parser.ts)
- **Responsibility**: Parse YAML into typed TypeScript objects
- **Input**: Raw YAML string
- **Output**: `DeliveryState` typed object
- **Dependencies**: js-yaml, shared types

### StateDiffer (differ.ts)
- **Responsibility**: Compare previous and current state, produce transition events
- **Input**: Previous `DeliveryState`, current `DeliveryState`
- **Output**: List of `StateTransition` events (stepId, fromStatus, toStatus, timestamp)
- **Dependencies**: Shared types

### WebSocketServer (index.ts)
- **Responsibility**: Broadcast state and transition events to connected clients
- **Input**: `DeliveryState` + `StateTransition[]` from differ
- **Output**: WebSocket messages to all connected clients
- **Protocol**:
  - On connect: send `{ type: "init", state: DeliveryState, plan: ExecutionPlan }`
  - On change: send `{ type: "update", state: DeliveryState, transitions: StateTransition[] }`
  - On disconnect: cleanup

## Client Components

### useDeliveryState (hooks/useDeliveryState.ts)
- **Responsibility**: Manage WebSocket connection and expose state to React tree
- **Output**: `{ state, plan, transitions, connected, error }`
- **Behavior**: Auto-reconnect on disconnect (exponential backoff, max 5s)

### App (App.tsx)
- **Responsibility**: Root layout, WebSocket lifecycle, connection status indicator
- **Children**: ProgressHeader, KanbanBoard, TeamPanel, ActivityFeed

### ProgressHeader (components/ProgressHeader.tsx)
- **Responsibility**: Show overall completion progress
- **Displays**: Project name, N/total completed, progress bar, elapsed time, current layer
- **Input**: `DeliveryState.summary`

### KanbanBoard (components/KanbanBoard.tsx)
- **Responsibility**: Matrix layout with layer swim lanes (rows) × status columns
- **Columns**: Pending | Claimed | In Progress | Review | Approved | Failed
- **Rows**: One LayerLane per execution layer (from plan.yaml)
- **Children**: LayerLane instances, one per layer
- **Input**: `DeliveryState.steps` + `ExecutionPlan.layers`
- **State**: `selectedStepId: string | null` (controls ConflictPanel visibility)

### LayerLane (components/LayerLane.tsx)
- **Responsibility**: Horizontal swim lane row for one execution layer
- **Header displays**:
  - Layer number
  - Parallelism indicator: "N parallel" or "1 sequential"
  - Worktree requirement: "WORKTREES" badge when layer has file conflicts
  - Layer progress: "N/M done"
  - Blocked indicator: dimmed/locked when all steps are blocked by prior layer
- **Children**: StepCard instances positioned in the correct status column
- **Input**: `ExecutionLayer` (from plan) + filtered `StepState[]` (from state) + `onSelectStep` callback

### StepCard (components/StepCard.tsx)
- **Responsibility**: Render a single step as a kanban card with conflict/worktree badges
- **Displays**: step_id, name, assignee, file count
- **Badges** (shown as compact icons/pills):
  - `🌳` Worktree: step runs in worktree isolation (from `step.worktree`)
  - `⚡N` Conflicts: step has N file conflicts with other steps (from `plan.conflicts_with`)
  - `r:N` Reviews: review attempt count when > 0 (from `step.review_attempts`)
  - `🔒` Blocked: step's dependencies are not all approved (derived from state)
- **Visual cues**:
  - Color-coded left border by status
  - Subtle pulse animation when status is `in_progress`
  - Dimmed appearance when blocked
- **Interaction**: Click to open ConflictPanel for this step
- **Input**: `StepState` + `PlanStep` (for conflicts_with) + `onClick` callback

### ConflictPanel (components/ConflictPanel.tsx)
- **Responsibility**: Detail panel showing selected step's file conflicts and worktree status
- **Appears**: On StepCard click, as a slide-out panel or popover
- **Displays**:
  - Step name and ID
  - Worktree status: active/inactive, branch name (`worktree-crafter-{step_id}`)
  - List of conflicting steps with:
    - Conflicting step_id and name
    - Shared files between the two steps
    - Current status of the conflicting step
  - Full list of files_to_modify for the selected step
- **Interaction**: Close button or click outside to dismiss
- **Input**: Selected `StepState` + `PlanStep` + related `StepState[]` (conflicting steps)

### TeamPanel (components/TeamPanel.tsx)
- **Responsibility**: Show active teammates in a sidebar
- **Displays**: Teammate name, current step assignment, completed step count, role (crafter/reviewer)
- **Input**: `DeliveryState.teammates`

### ActivityFeed (components/ActivityFeed.tsx)
- **Responsibility**: Scrolling log of recent state transitions
- **Displays**: Timestamp, step_id, from → to status
- **Behavior**: Newest first, limited to last 50 transitions
- **Input**: `StateTransition[]` accumulated from WebSocket events

## Shared Types (types.ts)

```typescript
// Mirrors state.yaml structure
interface DeliveryState {
  schema_version: string;
  created_at: string;
  updated_at: string;
  plan_path: string;
  current_layer: number;
  summary: {
    total_steps: number;
    total_layers: number;
    completed: number;
    failed: number;
    in_progress: number;
  };
  steps: Record<string, StepState>;
  teammates: Record<string, TeammateState>;
}

interface StepState {
  step_id: string;
  name: string;
  layer: number;
  status: StepStatus;
  teammate_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  review_attempts: number;
  files_to_modify: string[];
  worktree?: boolean;
}

type StepStatus = 'pending' | 'claimed' | 'in_progress' | 'review' | 'approved' | 'failed';

interface TeammateState {
  teammate_id: string;
  current_step: string | null;
  completed_steps: string[];
}

// Execution plan structure
interface ExecutionPlan {
  schema_version: string;
  summary: {
    total_steps: number;
    total_layers: number;
    max_parallelism: number;
    requires_worktrees: boolean;
  };
  layers: ExecutionLayer[];
}

interface ExecutionLayer {
  layer: number;
  parallel: boolean;
  use_worktrees: boolean;
  steps: PlanStep[];
}

interface PlanStep {
  step_id: string;
  name: string;
  files_to_modify: string[];
  conflicts_with?: string[];
}

// WebSocket protocol
type WSMessage =
  | { type: 'init'; state: DeliveryState; plan: ExecutionPlan }
  | { type: 'update'; state: DeliveryState; transitions: StateTransition[] };

interface StateTransition {
  step_id: string;
  from_status: StepStatus;
  to_status: StepStatus;
  teammate_id: string | null;
  timestamp: string;
}
```

## Dependency Rules

1. Server never imports from `src/` (client code)
2. Client never imports from `server/` (server code)
3. Both import from `shared/types.ts` (shared domain types)
4. No component imports from `hooks/` except `App.tsx` (single state provider)
5. Components receive data via props, not by reading global state directly
6. ConflictPanel receives pre-computed conflict data from App (not raw plan.yaml)
7. Plan data (layers, conflicts_with) flows alongside state data through the same WebSocket hook
