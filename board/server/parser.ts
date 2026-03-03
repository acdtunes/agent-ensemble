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
  type Roadmap,
  type RoadmapStep,
  type RoadmapPhase,
  type RoadmapMeta,
  type RoadmapSummary,
  type StepStatus,
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

// --- DES feature roadmap → ExecutionPlan ---

interface DesStep {
  readonly id?: string;
  readonly step_id?: string;
  readonly name: string;
  readonly description?: string;
  readonly files_to_modify?: readonly string[];
  readonly dependencies?: readonly string[];
}

interface DesPhase {
  readonly id?: string;
  readonly phase_id?: string;
  readonly name: string;
  readonly steps: readonly DesStep[];
}

const parseDesRoadmap = (raw: unknown): Result<ExecutionPlan, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'root must be an object' });

  const phases = raw.phases;
  if (!Array.isArray(phases)) return err({ type: 'invalid_schema', message: 'phases must be an array' });

  const roadmapMeta = isRecord(raw.roadmap) ? raw.roadmap : {};
  const totalSteps = typeof roadmapMeta.total_steps === 'number' ? roadmapMeta.total_steps : 0;

  const layers: ExecutionLayer[] = phases.map((phase: DesPhase, i: number) => ({
    layer: i,
    parallel: false,
    use_worktrees: false,
    steps: (phase.steps ?? []).map((s: DesStep) => ({
      step_id: String(s.step_id ?? s.id ?? ''),
      name: String(s.name ?? ''),
      description: s.description !== undefined ? String(s.description) : undefined,
      files_to_modify: Array.isArray(s.files_to_modify) ? s.files_to_modify.map(String) : [],
      conflicts_with: [],
    })),
  }));

  return ok({
    schema_version: '1.0',
    summary: {
      total_steps: totalSteps || layers.reduce((n, l) => n + l.steps.length, 0),
      total_layers: layers.length,
      max_parallelism: 1,
      requires_worktrees: false,
    },
    layers,
  });
};

export const parseFeatureRoadmap = (content: string): Result<ExecutionPlan, ParseError> => {
  const yamlResult = loadYaml(content);
  if (!yamlResult.ok) return yamlResult;

  const raw = yamlResult.value;
  // Try board schema first, fall back to DES roadmap format
  const boardResult = validateExecutionPlan(raw);
  if (boardResult.ok) return boardResult;
  return parseDesRoadmap(raw);
};


// --- DES feature execution-log → DeliveryState ---

interface DesEvent {
  readonly sid: string;
  readonly p: string;
  readonly s: string;
  readonly t: string;
}

const parseDesExecutionLog = (raw: unknown): Result<DeliveryState, ParseError> => {
  if (!isRecord(raw)) return err({ type: 'invalid_schema', message: 'root must be an object' });

  const events = raw.events;
  if (!Array.isArray(events)) return err({ type: 'invalid_schema', message: 'events must be an array' });

  // Derive step states from events (last event per step wins)
  const stepMap = new Map<string, { status: StepState['status']; updated_at: string }>();
  for (const event of events as DesEvent[]) {
    const sid = String(event.sid ?? '');
    const phase = String(event.p ?? '');
    const status = String(event.s ?? '');
    const timestamp = String(event.t ?? '');

    if (phase === 'COMMIT' && status === 'EXECUTED') {
      stepMap.set(sid, { status: 'completed', updated_at: timestamp });
    } else if (status === 'FAILED') {
      stepMap.set(sid, { status: 'failed', updated_at: timestamp });
    } else if (!stepMap.has(sid) || stepMap.get(sid)!.status !== 'completed') {
      if (status === 'EXECUTED' || status === 'SKIPPED') {
        stepMap.set(sid, { status: 'in_progress', updated_at: timestamp });
      }
    }
  }

  const steps: Record<string, StepState> = {};
  let completed = 0;
  let failed = 0;
  let inProgress = 0;
  let latestTimestamp = '';

  for (const [sid, info] of stepMap) {
    steps[sid] = { status: info.status, updated_at: info.updated_at };
    if (info.status === 'completed') completed++;
    else if (info.status === 'failed') failed++;
    else if (info.status === 'in_progress') inProgress++;
    if (info.updated_at > latestTimestamp) latestTimestamp = info.updated_at;
  }

  const firstTimestamp = events.length > 0 ? String((events[0] as DesEvent).t ?? '') : '';

  return ok({
    schema_version: '1.0',
    created_at: firstTimestamp,
    updated_at: latestTimestamp,
    plan_path: '',
    current_layer: 0,
    summary: {
      total_steps: stepMap.size,
      total_layers: 1,
      completed,
      failed,
      in_progress: inProgress,
    },
    steps,
    teammates: {},
  });
};

export const parseFeatureExecutionLog = (content: string): Result<DeliveryState, ParseError> => {
  const yamlResult = loadYaml(content);
  if (!yamlResult.ok) return yamlResult;

  const raw = yamlResult.value;
  // Try board schema first, fall back to DES execution-log format
  const boardResult = validateDeliveryState(raw);
  if (boardResult.ok) return boardResult;
  return parseDesExecutionLog(raw);
};

// --- Unified Roadmap parser ---

const toStepStatus = (value: unknown): StepStatus =>
  typeof value === 'string' && (STEP_STATUSES as readonly string[]).includes(value)
    ? (value as StepStatus)
    : 'pending';

const toNullableString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' ? value : fallback;

const toStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];

const validateRoadmapStep = (raw: unknown, index: number): Result<RoadmapStep, ParseError> => {
  if (!isRecord(raw))
    return err({ type: 'invalid_schema', message: `step[${index}] must be an object` });

  if (typeof raw.id !== 'string' && typeof raw.id !== 'number')
    return err({ type: 'invalid_schema', message: `step[${index}].id must be present` });

  if (typeof raw.name !== 'string')
    return err({ type: 'invalid_schema', message: `step[${index}].name must be a string` });

  return ok({
    id: String(raw.id),
    name: raw.name,
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    files_to_modify: toStringArray(raw.files_to_modify),
    dependencies: toStringArray(raw.dependencies),
    criteria: toStringArray(raw.criteria),
    status: toStepStatus(raw.status),
    teammate_id: toNullableString(raw.teammate_id),
    started_at: toNullableString(raw.started_at),
    completed_at: toNullableString(raw.completed_at),
    review_attempts: toNumber(raw.review_attempts, 0),
  });
};

const validateRoadmapPhase = (raw: unknown, index: number): Result<RoadmapPhase, ParseError> => {
  if (!isRecord(raw))
    return err({ type: 'invalid_schema', message: `phase[${index}] must be an object` });

  if (typeof raw.id !== 'string' && typeof raw.id !== 'number')
    return err({ type: 'invalid_schema', message: `phase[${index}].id must be present` });

  if (typeof raw.name !== 'string')
    return err({ type: 'invalid_schema', message: `phase[${index}].name must be a string` });

  if (!Array.isArray(raw.steps))
    return err({ type: 'invalid_schema', message: `phase[${index}].steps must be an array` });

  const steps: RoadmapStep[] = [];
  for (let i = 0; i < raw.steps.length; i++) {
    const result = validateRoadmapStep(raw.steps[i], i);
    if (!result.ok) return result;
    steps.push(result.value);
  }

  return ok({
    id: String(raw.id),
    name: raw.name,
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    steps,
  });
};

const validateRoadmapMeta = (raw: unknown): RoadmapMeta => {
  if (!isRecord(raw)) return {};
  return {
    ...(typeof raw.project_id === 'string' ? { project_id: raw.project_id } : {}),
    ...(typeof raw.created_at === 'string' ? { created_at: raw.created_at } : {}),
    ...(typeof raw.total_steps === 'number' ? { total_steps: raw.total_steps } : {}),
    ...(typeof raw.phases === 'number' ? { phases: raw.phases } : {}),
    ...(typeof raw.status === 'string' ? { status: raw.status } : {}),
    ...(typeof raw.reviewer === 'string' ? { reviewer: raw.reviewer } : {}),
    ...(typeof raw.approved_at === 'string' ? { approved_at: raw.approved_at } : {}),
  };
};

const validateRoadmap = (raw: unknown): Result<Roadmap, ParseError> => {
  if (!isRecord(raw))
    return err({ type: 'invalid_schema', message: 'root must be an object' });

  if (!Array.isArray(raw.phases))
    return err({ type: 'invalid_schema', message: 'phases must be an array' });

  const phases: RoadmapPhase[] = [];
  for (let i = 0; i < raw.phases.length; i++) {
    const result = validateRoadmapPhase(raw.phases[i], i);
    if (!result.ok) return result;
    phases.push(result.value);
  }

  return ok({
    roadmap: validateRoadmapMeta(raw.roadmap),
    phases,
  });
};

export const parseRoadmap = (content: string): Result<Roadmap, ParseError> => {
  const yamlResult = loadYaml(content);
  if (!yamlResult.ok) return yamlResult;
  return validateRoadmap(yamlResult.value);
};

// --- Computed summary (pure, never stored) ---

const IN_PROGRESS_STATUSES: ReadonlySet<StepStatus> = new Set(['claimed', 'in_progress', 'review']);

export const computeRoadmapSummary = (roadmap: Roadmap): RoadmapSummary => {
  const allSteps = roadmap.phases.flatMap((p) => p.steps);
  const completed = allSteps.filter((s) => s.status === 'approved').length;
  const failed = allSteps.filter((s) => s.status === 'failed').length;
  const in_progress = allSteps.filter((s) => IN_PROGRESS_STATUSES.has(s.status)).length;

  return {
    total_steps: allSteps.length,
    total_phases: roadmap.phases.length,
    completed,
    failed,
    in_progress,
    pending: allSteps.length - completed - failed - in_progress,
  };
};

// --- Bridge functions (Roadmap -> legacy types for incremental migration) ---

const roadmapStepToPlanStep = (step: RoadmapStep): PlanStep => ({
  step_id: step.id,
  name: step.name,
  ...(step.description !== undefined ? { description: step.description } : {}),
  files_to_modify: step.files_to_modify as string[],
  conflicts_with: [],
});

export const roadmapToExecutionPlan = (roadmap: Roadmap): ExecutionPlan => {
  const layers: ExecutionLayer[] = roadmap.phases.map((phase, i) => ({
    layer: i,
    parallel: false,
    use_worktrees: false,
    steps: phase.steps.map(roadmapStepToPlanStep),
  }));

  return {
    schema_version: '1.0',
    summary: {
      total_steps: roadmap.phases.reduce((n, p) => n + p.steps.length, 0),
      total_layers: layers.length,
      max_parallelism: 1,
      requires_worktrees: false,
    },
    layers,
  };
};

const roadmapStepToStepState = (step: RoadmapStep, layerIndex: number): StepState => ({
  step_id: step.id,
  name: step.name,
  layer: layerIndex,
  status: step.status,
  teammate_id: step.teammate_id,
  started_at: step.started_at,
  completed_at: step.completed_at,
  review_attempts: step.review_attempts,
  files_to_modify: step.files_to_modify as string[],
});

export const roadmapToDeliveryState = (roadmap: Roadmap): DeliveryState => {
  const steps: Record<string, StepState> = {};
  const teammateMap = new Map<string, { current_step: string | null; completed_steps: string[] }>();

  roadmap.phases.forEach((phase, layerIndex) => {
    for (const step of phase.steps) {
      steps[step.id] = roadmapStepToStepState(step, layerIndex);

      if (step.teammate_id !== null) {
        const existing = teammateMap.get(step.teammate_id);
        if (existing) {
          if (step.status === 'approved') existing.completed_steps.push(step.id);
          else existing.current_step = step.id;
        } else {
          teammateMap.set(step.teammate_id, {
            current_step: step.status === 'approved' ? null : step.id,
            completed_steps: step.status === 'approved' ? [step.id] : [],
          });
        }
      }
    }
  });

  const teammates: Record<string, TeammateState> = {};
  for (const [id, info] of teammateMap) {
    teammates[id] = { teammate_id: id, current_step: info.current_step, completed_steps: info.completed_steps };
  }

  const summary = computeRoadmapSummary(roadmap);
  const timestamps = roadmap.phases.flatMap((p) => p.steps).flatMap((s) => [s.started_at, s.completed_at].filter(Boolean)) as string[];
  const latest = timestamps.length > 0 ? timestamps.sort().at(-1)! : '';
  const earliest = timestamps.length > 0 ? timestamps.sort()[0] : '';

  return {
    schema_version: '1.0',
    created_at: roadmap.roadmap.created_at ?? earliest,
    updated_at: latest,
    plan_path: '',
    current_layer: 0,
    summary: {
      total_steps: summary.total_steps,
      total_layers: summary.total_phases,
      completed: summary.completed,
      failed: summary.failed,
      in_progress: summary.in_progress,
    },
    steps,
    teammates,
  };
};
