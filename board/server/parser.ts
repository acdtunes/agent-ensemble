import yaml from 'js-yaml';
import {
  type Result,
  type DeliveryState,
  type ExecutionPlan,
  type ParseError,
  type StepState,
  type TeammateState,
  type PlanStep,
  type ExecutionLayer,
  STEP_STATUSES,
  ok,
  err,
} from '../shared/types.js';

// --- YAML deserialization (impure boundary) ---

const loadYaml = (content: string): Result<unknown, ParseError> => {
  try {
    return ok(yaml.load(content));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({ type: 'invalid_yaml' as const, message });
  }
};

// --- Validation helpers (pure functions) ---

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isValidStepStatus = (value: unknown): boolean =>
  typeof value === 'string' && (STEP_STATUSES as readonly string[]).includes(value);

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === 'string';

const validateOptionalStringArray = (value: unknown): string[] | undefined =>
  value === undefined || value === null
    ? []
    : isStringArray(value) ? value : undefined;

// --- State YAML validation ---

const validateStateSummary = (raw: unknown): Result<DeliveryState['summary'], ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'summary must be an object' });

  const required = ['total_steps', 'total_layers', 'completed', 'failed', 'in_progress'] as const;
  for (const field of required) {
    if (typeof raw[field] !== 'number') {
      return err({ type: 'invalid_schema', message: `summary.${field} must be a number` });
    }
  }

  return ok({
    total_steps: raw.total_steps as number,
    total_layers: raw.total_layers as number,
    completed: raw.completed as number,
    failed: raw.failed as number,
    in_progress: raw.in_progress as number,
  });
};

const validateStep = (raw: unknown, stepId: string): Result<StepState, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: `step ${stepId} must be an object` });

  if (typeof raw.step_id !== 'string') return err({ type: 'invalid_schema', message: `step ${stepId}.step_id must be a string` });
  if (typeof raw.name !== 'string') return err({ type: 'invalid_schema', message: `step ${stepId}.name must be a string` });
  if (typeof raw.layer !== 'number') return err({ type: 'invalid_schema', message: `step ${stepId}.layer must be a number` });
  if (!isValidStepStatus(raw.status)) return err({ type: 'invalid_schema', message: `step ${stepId}.status must be a valid StepStatus` });
  if (!isNullableString(raw.teammate_id)) return err({ type: 'invalid_schema', message: `step ${stepId}.teammate_id must be string or null` });
  if (!isNullableString(raw.started_at)) return err({ type: 'invalid_schema', message: `step ${stepId}.started_at must be string or null` });
  if (!isNullableString(raw.completed_at)) return err({ type: 'invalid_schema', message: `step ${stepId}.completed_at must be string or null` });
  if (typeof raw.review_attempts !== 'number') return err({ type: 'invalid_schema', message: `step ${stepId}.review_attempts must be a number` });
  if (!isStringArray(raw.files_to_modify)) return err({ type: 'invalid_schema', message: `step ${stepId}.files_to_modify must be a string array` });

  return ok({
    step_id: raw.step_id,
    name: raw.name,
    layer: raw.layer,
    status: raw.status as StepState['status'],
    teammate_id: raw.teammate_id,
    started_at: raw.started_at,
    completed_at: raw.completed_at,
    review_attempts: raw.review_attempts,
    files_to_modify: raw.files_to_modify,
    ...(raw.worktree !== undefined ? { worktree: Boolean(raw.worktree) } : {}),
  });
};

const validateSteps = (raw: unknown): Result<Record<string, StepState>, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'steps must be an object' });

  const steps: Record<string, StepState> = {};
  for (const [id, step] of Object.entries(raw)) {
    const result = validateStep(step, id);
    if (!result.ok) return result;
    steps[id] = result.value;
  }
  return ok(steps);
};

const validateTeammate = (raw: unknown, teammateId: string): Result<TeammateState, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: `teammate ${teammateId} must be an object` });

  if (typeof raw.teammate_id !== 'string') return err({ type: 'invalid_schema', message: `teammate ${teammateId}.teammate_id must be a string` });
  if (!isNullableString(raw.current_step)) return err({ type: 'invalid_schema', message: `teammate ${teammateId}.current_step must be string or null` });
  if (!isStringArray(raw.completed_steps)) return err({ type: 'invalid_schema', message: `teammate ${teammateId}.completed_steps must be a string array` });

  return ok({
    teammate_id: raw.teammate_id,
    current_step: raw.current_step,
    completed_steps: raw.completed_steps,
  });
};

const validateTeammates = (raw: unknown): Result<Record<string, TeammateState>, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'teammates must be an object' });

  const teammates: Record<string, TeammateState> = {};
  for (const [id, teammate] of Object.entries(raw)) {
    const result = validateTeammate(teammate, id);
    if (!result.ok) return result;
    teammates[id] = result.value;
  }
  return ok(teammates);
};

const validateDeliveryState = (raw: unknown): Result<DeliveryState, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'root must be an object' });

  if (typeof raw.schema_version !== 'string') return err({ type: 'invalid_schema', message: 'schema_version must be a string' });
  if (typeof raw.created_at !== 'string') return err({ type: 'invalid_schema', message: 'created_at must be a string' });
  if (typeof raw.updated_at !== 'string') return err({ type: 'invalid_schema', message: 'updated_at must be a string' });
  if (typeof raw.plan_path !== 'string') return err({ type: 'invalid_schema', message: 'plan_path must be a string' });
  if (typeof raw.current_layer !== 'number') return err({ type: 'invalid_schema', message: 'current_layer must be a number' });

  const summaryResult = validateStateSummary(raw.summary);
  if (!summaryResult.ok) return summaryResult;

  const stepsResult = validateSteps(raw.steps);
  if (!stepsResult.ok) return stepsResult;

  const teammatesResult = validateTeammates(raw.teammates);
  if (!teammatesResult.ok) return teammatesResult;

  return ok({
    schema_version: raw.schema_version,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    plan_path: raw.plan_path,
    current_layer: raw.current_layer,
    summary: summaryResult.value,
    steps: stepsResult.value,
    teammates: teammatesResult.value,
  });
};

// --- Plan YAML validation ---

const validatePlanSummary = (raw: unknown): Result<ExecutionPlan['summary'], ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'summary must be an object' });

  if (typeof raw.total_steps !== 'number') return err({ type: 'invalid_schema', message: 'summary.total_steps must be a number' });
  if (typeof raw.total_layers !== 'number') return err({ type: 'invalid_schema', message: 'summary.total_layers must be a number' });
  if (typeof raw.max_parallelism !== 'number') return err({ type: 'invalid_schema', message: 'summary.max_parallelism must be a number' });
  if (typeof raw.requires_worktrees !== 'boolean') return err({ type: 'invalid_schema', message: 'summary.requires_worktrees must be a boolean' });

  return ok({
    total_steps: raw.total_steps,
    total_layers: raw.total_layers,
    max_parallelism: raw.max_parallelism,
    requires_worktrees: raw.requires_worktrees,
  });
};

const validatePlanStep = (raw: unknown, index: number): Result<PlanStep, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: `step[${index}] must be an object` });

  if (typeof raw.step_id !== 'string') return err({ type: 'invalid_schema', message: `step[${index}].step_id must be a string` });
  if (typeof raw.name !== 'string') return err({ type: 'invalid_schema', message: `step[${index}].name must be a string` });
  if (!isStringArray(raw.files_to_modify)) return err({ type: 'invalid_schema', message: `step[${index}].files_to_modify must be a string array` });

  const description = raw.description;
  if (description !== undefined && typeof description !== 'string') {
    return err({ type: 'invalid_schema', message: `step[${index}].description must be a string` });
  }

  const conflictsWith = validateOptionalStringArray(raw.conflicts_with);
  if (conflictsWith === undefined) {
    return err({ type: 'invalid_schema', message: `step[${index}].conflicts_with must be a string array` });
  }

  return ok({
    step_id: raw.step_id,
    name: raw.name,
    ...(description !== undefined ? { description } : {}),
    files_to_modify: raw.files_to_modify,
    conflicts_with: conflictsWith,
  });
};

const validateExecutionLayer = (raw: unknown, index: number): Result<ExecutionLayer, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: `layer[${index}] must be an object` });

  if (typeof raw.layer !== 'number') return err({ type: 'invalid_schema', message: `layer[${index}].layer must be a number` });
  if (typeof raw.parallel !== 'boolean') return err({ type: 'invalid_schema', message: `layer[${index}].parallel must be a boolean` });
  if (typeof raw.use_worktrees !== 'boolean') return err({ type: 'invalid_schema', message: `layer[${index}].use_worktrees must be a boolean` });
  if (!Array.isArray(raw.steps)) return err({ type: 'invalid_schema', message: `layer[${index}].steps must be an array` });

  const steps: PlanStep[] = [];
  for (let i = 0; i < raw.steps.length; i++) {
    const result = validatePlanStep(raw.steps[i], i);
    if (!result.ok) return result;
    steps.push(result.value);
  }

  return ok({
    layer: raw.layer,
    parallel: raw.parallel,
    use_worktrees: raw.use_worktrees,
    steps,
  });
};

const validateExecutionPlan = (raw: unknown): Result<ExecutionPlan, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'root must be an object' });

  if (typeof raw.schema_version !== 'string') return err({ type: 'invalid_schema', message: 'schema_version must be a string' });

  const summaryResult = validatePlanSummary(raw.summary);
  if (!summaryResult.ok) return summaryResult;

  if (!Array.isArray(raw.layers)) return err({ type: 'invalid_schema', message: 'layers must be an array' });

  const layers: ExecutionLayer[] = [];
  for (let i = 0; i < raw.layers.length; i++) {
    const result = validateExecutionLayer(raw.layers[i], i);
    if (!result.ok) return result;
    layers.push(result.value);
  }

  return ok({
    schema_version: raw.schema_version,
    summary: summaryResult.value,
    layers,
  });
};

// --- Public API: parse YAML string -> Result ---

export const parseStateYaml = (content: string): Result<DeliveryState, ParseError> => {
  const yamlResult = loadYaml(content);
  if (!yamlResult.ok) return yamlResult;
  return validateDeliveryState(yamlResult.value);
};

export const parsePlanYaml = (content: string): Result<ExecutionPlan, ParseError> => {
  const yamlResult = loadYaml(content);
  if (!yamlResult.ok) return yamlResult;
  return validateExecutionPlan(yamlResult.value);
};
