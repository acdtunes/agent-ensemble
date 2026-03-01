import { describe, it, expect } from 'vitest';
import { parseStateYaml, parsePlanYaml } from '../parser.js';
import type { DeliveryState, ExecutionPlan } from '../../shared/types.js';

// --- Fixtures ---

const validStateYaml = `
schema_version: '1.0'
created_at: '2026-03-01T00:52:39.387516+00:00'
updated_at: '2026-03-01T00:53:28.540286+00:00'
plan_path: .nw-teams/plan.yaml
current_layer: 1
summary:
  total_steps: 2
  total_layers: 2
  completed: 0
  failed: 0
  in_progress: 1
steps:
  01-01:
    step_id: 01-01
    name: 'Server foundation'
    layer: 1
    status: in_progress
    teammate_id: crafter-01-01
    started_at: null
    completed_at: null
    review_attempts: 0
    files_to_modify:
    - board/shared/types.ts
    - board/server/parser.ts
  01-02:
    step_id: 01-02
    name: 'WebSocket broadcasting'
    layer: 2
    status: pending
    teammate_id: null
    started_at: null
    completed_at: null
    review_attempts: 0
    files_to_modify:
    - board/server/differ.ts
teammates:
  crafter-01-01:
    teammate_id: crafter-01-01
    current_step: 01-01
    completed_steps: []
`;

const validPlanYaml = `
schema_version: '1.0'
summary:
  total_steps: 2
  total_layers: 2
  max_parallelism: 1
  requires_worktrees: false
layers:
- layer: 1
  parallel: false
  use_worktrees: false
  steps:
  - step_id: 01-01
    name: 'Server foundation'
    files_to_modify:
    - board/shared/types.ts
    conflicts_with: []
- layer: 2
  parallel: false
  use_worktrees: false
  steps:
  - step_id: 01-02
    name: 'WebSocket broadcasting'
    files_to_modify:
    - board/server/differ.ts
    conflicts_with:
    - 01-03
`;

describe('parseStateYaml', () => {
  it('should parse valid state.yaml into DeliveryState', () => {
    const result = parseStateYaml(validStateYaml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const state: DeliveryState = result.value;
    expect(state.schema_version).toBe('1.0');
    expect(state.current_layer).toBe(1);
    expect(state.plan_path).toBe('.nw-teams/plan.yaml');
    expect(state.summary.total_steps).toBe(2);
    expect(state.summary.in_progress).toBe(1);
    expect(Object.keys(state.steps)).toHaveLength(2);
    expect(state.steps['01-01'].status).toBe('in_progress');
    expect(state.steps['01-01'].teammate_id).toBe('crafter-01-01');
    expect(state.steps['01-01'].files_to_modify).toEqual([
      'board/shared/types.ts',
      'board/server/parser.ts',
    ]);
    expect(state.steps['01-02'].status).toBe('pending');
    expect(state.steps['01-02'].teammate_id).toBeNull();
    expect(Object.keys(state.teammates)).toHaveLength(1);
    expect(state.teammates['crafter-01-01'].current_step).toBe('01-01');
    expect(state.teammates['crafter-01-01'].completed_steps).toEqual([]);
  });

  it('should preserve null values for started_at and completed_at', () => {
    const result = parseStateYaml(validStateYaml);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.steps['01-01'].started_at).toBeNull();
    expect(result.value.steps['01-01'].completed_at).toBeNull();
  });

  it('should reject malformed YAML', () => {
    const result = parseStateYaml('key: [unclosed bracket');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_yaml');
  });

  it('should reject YAML missing required fields', () => {
    const missingFields = `
schema_version: '1.0'
created_at: '2026-03-01T00:00:00+00:00'
`;
    const result = parseStateYaml(missingFields);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('should reject YAML with invalid step status', () => {
    const invalidStatus = validStateYaml.replace('status: in_progress', 'status: exploding');
    const result = parseStateYaml(invalidStatus);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('should handle empty steps and teammates gracefully', () => {
    const emptyCollections = `
schema_version: '1.0'
created_at: '2026-03-01T00:00:00+00:00'
updated_at: '2026-03-01T00:00:00+00:00'
plan_path: .nw-teams/plan.yaml
current_layer: 1
summary:
  total_steps: 0
  total_layers: 0
  completed: 0
  failed: 0
  in_progress: 0
steps: {}
teammates: {}
`;
    const result = parseStateYaml(emptyCollections);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.keys(result.value.steps)).toHaveLength(0);
    expect(Object.keys(result.value.teammates)).toHaveLength(0);
  });
});

describe('parsePlanYaml', () => {
  it('should parse valid plan.yaml into ExecutionPlan', () => {
    const result = parsePlanYaml(validPlanYaml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const plan: ExecutionPlan = result.value;
    expect(plan.schema_version).toBe('1.0');
    expect(plan.summary.total_steps).toBe(2);
    expect(plan.summary.max_parallelism).toBe(1);
    expect(plan.summary.requires_worktrees).toBe(false);
    expect(plan.layers).toHaveLength(2);
    expect(plan.layers[0].layer).toBe(1);
    expect(plan.layers[0].parallel).toBe(false);
    expect(plan.layers[0].steps[0].step_id).toBe('01-01');
    expect(plan.layers[1].steps[0].conflicts_with).toEqual(['01-03']);
  });

  it('should reject malformed YAML', () => {
    const result = parsePlanYaml('{{not: yaml: at all}}');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_yaml');
  });

  it('should reject plan missing required fields', () => {
    const incomplete = `
schema_version: '1.0'
`;
    const result = parsePlanYaml(incomplete);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('should default conflicts_with to empty array when omitted', () => {
    const noPlanConflicts = `
schema_version: '1.0'
summary:
  total_steps: 1
  total_layers: 1
  max_parallelism: 1
  requires_worktrees: false
layers:
- layer: 1
  parallel: false
  use_worktrees: false
  steps:
  - step_id: 01-01
    name: 'Solo step'
    files_to_modify:
    - file.ts
`;
    const result = parsePlanYaml(noPlanConflicts);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.layers[0].steps[0].conflicts_with).toEqual([]);
  });
});
