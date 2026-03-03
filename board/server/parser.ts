import yaml from 'js-yaml';
import {
  type Result,
  type DeliveryState,
  type ParseError,
  type StepState,
  type Roadmap,
  type RoadmapStep,
  type RoadmapPhase,
  type RoadmapMeta,
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

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// --- DES feature execution-log → DeliveryState (kept for DES audit trail) ---

interface DesEvent {
  readonly sid: string;
  readonly p: string;
  readonly s: string;
  readonly t: string;
}

export const parseDesExecutionLog = (raw: unknown): Result<DeliveryState, ParseError> => {
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

// --- Re-export bridge functions from shared module ---

export { computeRoadmapSummary, roadmapToExecutionPlan, roadmapToDeliveryState } from '../shared/roadmap-bridge.js';
