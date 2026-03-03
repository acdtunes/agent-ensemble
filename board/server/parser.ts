import yaml from 'js-yaml';
import {
  type Result,
  type ParseError,
  type Roadmap,
  type ReviewEntry,
  type ReviewOutcome,
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

const REVIEW_OUTCOMES: ReadonlySet<string> = new Set(['approved', 'rejected']);

const isValidReviewEntry = (raw: unknown): raw is ReviewEntry =>
  isRecord(raw) &&
  typeof raw.cycle === 'number' &&
  typeof raw.timestamp === 'string' &&
  typeof raw.outcome === 'string' &&
  REVIEW_OUTCOMES.has(raw.outcome) &&
  typeof raw.feedback === 'string';

const validateReviewHistory = (raw: unknown): readonly ReviewEntry[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  return raw
    .filter(isValidReviewEntry)
    .map((entry) => ({
      cycle: entry.cycle,
      timestamp: entry.timestamp,
      outcome: entry.outcome as ReviewOutcome,
      feedback: entry.feedback,
    }));
};

const validateRoadmapStep = (raw: unknown, index: number): Result<RoadmapStep, ParseError> => {
  if (!isRecord(raw))
    return err({ type: 'invalid_schema', message: `step[${index}] must be an object` });

  if (typeof raw.id !== 'string' && typeof raw.id !== 'number')
    return err({ type: 'invalid_schema', message: `step[${index}].id must be present` });

  const stepName = typeof raw.name === 'string' ? raw.name
    : typeof raw.title === 'string' ? raw.title
    : undefined;
  if (stepName === undefined)
    return err({ type: 'invalid_schema', message: `step[${index}].name must be a string` });

  const reviewHistory = validateReviewHistory(raw.review_history);

  return ok({
    id: String(raw.id),
    name: stepName,
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    files_to_modify: toStringArray(raw.files),
    dependencies: toStringArray(raw.dependencies),
    criteria: toStringArray(raw.criteria ?? raw.acceptance_criteria),
    status: toStepStatus(raw.status),
    teammate_id: toNullableString(raw.teammate_id),
    started_at: toNullableString(raw.started_at),
    completed_at: toNullableString(raw.completed_at),
    review_attempts: toNumber(raw.review_attempts, 0),
    ...(reviewHistory !== undefined ? { review_history: reviewHistory } : {}),
  });
};

const validateRoadmapPhase = (raw: unknown, index: number): Result<RoadmapPhase, ParseError> => {
  if (!isRecord(raw))
    return err({ type: 'invalid_schema', message: `phase[${index}] must be an object` });

  if (typeof raw.id !== 'string' && typeof raw.id !== 'number')
    return err({ type: 'invalid_schema', message: `phase[${index}].id must be present` });

  const phaseName = typeof raw.name === 'string' ? raw.name
    : typeof raw.title === 'string' ? raw.title
    : undefined;
  if (phaseName === undefined)
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
    name: phaseName,
    ...(typeof raw.description === 'string' ? { description: raw.description } : {}),
    steps,
  });
};

const validateRoadmapMeta = (raw: unknown): RoadmapMeta => {
  if (!isRecord(raw)) return {};
  const projectId = typeof raw.project_id === 'string' ? raw.project_id
    : typeof raw.feature === 'string' ? raw.feature
    : undefined;
  return {
    ...(projectId !== undefined ? { project_id: projectId } : {}),
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
