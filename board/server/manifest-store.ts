/**
 * Manifest Store — pure core + IO adapters
 *
 * Pure functions for manifest validation, entry add/remove, duplicate detection.
 * IO adapters for loading/saving manifest JSON files.
 * All transforms are immutable — they return new manifest values.
 */

import type { ProjectManifest, ManifestEntry, ManifestError, FeatureId, ProjectId, Result } from '../shared/types.js';
import { ok, err, createProjectId, createFeatureId } from '../shared/types.js';

// --- Validation ---

const ENTRY_REQUIRED_FIELDS = ['featureId', 'name', 'roadmapPath', 'executionLogPath', 'docsRoot'] as const;

const validateEntry = (raw: unknown, index: number): Result<ManifestEntry, ManifestError> => {
  if (typeof raw !== 'object' || raw === null) {
    return err({ type: 'invalid_manifest', message: `features[${index}] must be an object` });
  }

  const record = raw as Record<string, unknown>;

  for (const field of ENTRY_REQUIRED_FIELDS) {
    if (typeof record[field] !== 'string') {
      return err({ type: 'invalid_manifest', message: `features[${index}].${field} must be a string` });
    }
  }

  const featureIdResult = createFeatureId(record.featureId as string);
  if (!featureIdResult.ok) {
    return err({ type: 'invalid_manifest', message: `features[${index}].featureId is invalid: ${featureIdResult.error}` });
  }

  return ok({
    featureId: featureIdResult.value,
    name: record.name as string,
    roadmapPath: record.roadmapPath as string,
    executionLogPath: record.executionLogPath as string,
    docsRoot: record.docsRoot as string,
  });
};

export const validateManifest = (data: unknown): Result<ProjectManifest, ManifestError> => {
  if (typeof data !== 'object' || data === null) {
    return err({ type: 'invalid_manifest', message: 'Manifest must be a non-null object' });
  }

  const record = data as Record<string, unknown>;

  if (typeof record.projectId !== 'string') {
    return err({ type: 'invalid_manifest', message: 'projectId must be a string' });
  }

  const projectIdResult = createProjectId(record.projectId);
  if (!projectIdResult.ok) {
    return err({ type: 'invalid_manifest', message: `projectId is invalid: ${projectIdResult.error}` });
  }

  if (!Array.isArray(record.features)) {
    return err({ type: 'invalid_manifest', message: 'features must be an array' });
  }

  const entries: ManifestEntry[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < record.features.length; i++) {
    const entryResult = validateEntry(record.features[i], i);
    if (!entryResult.ok) return entryResult;

    const fid = entryResult.value.featureId as string;
    if (seenIds.has(fid)) {
      return err({ type: 'invalid_manifest', message: `features contains duplicate featureId: '${fid}'` });
    }
    seenIds.add(fid);
    entries.push(entryResult.value);
  }

  return ok({
    projectId: projectIdResult.value,
    features: entries,
  });
};

// --- Empty manifest (first-use default) ---

export const emptyManifest = (projectId: ProjectId): ProjectManifest => ({
  projectId,
  features: [],
});

// --- Duplicate detection ---

export const findDuplicate = (
  manifest: ProjectManifest,
  featureId: FeatureId,
): ManifestEntry | undefined =>
  manifest.features.find((entry) => entry.featureId === featureId);

// --- Immutable transforms ---

export const addEntry = (
  manifest: ProjectManifest,
  entry: ManifestEntry,
): Result<ProjectManifest, ManifestError> => {
  if (findDuplicate(manifest, entry.featureId)) {
    return err({ type: 'duplicate_entry', featureId: entry.featureId });
  }

  return ok({
    ...manifest,
    features: [...manifest.features, entry],
  });
};

export const removeEntry = (
  manifest: ProjectManifest,
  featureId: FeatureId,
): Result<ProjectManifest, ManifestError> => {
  if (!findDuplicate(manifest, featureId)) {
    return err({ type: 'entry_not_found', featureId });
  }

  return ok({
    ...manifest,
    features: manifest.features.filter((entry) => entry.featureId !== featureId),
  });
};

// =====================================================================
// IO Adapters — side-effect shell for filesystem operations
// =====================================================================

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const isNodeError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && 'code' in error;

export const ensureManifestDir = async (
  dirPath: string,
): Promise<Result<void, ManifestError>> => {
  try {
    await mkdir(dirPath, { recursive: true });
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({ type: 'io_error', message: `Failed to create directory: ${message}` });
  }
};

export const loadManifest = async (
  filePath: string,
  projectId: ProjectId,
): Promise<Result<ProjectManifest, ManifestError>> => {
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return ok(emptyManifest(projectId));
    }
    const message = error instanceof Error ? error.message : String(error);
    return err({ type: 'io_error', message: `Failed to read manifest: ${message}` });
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({ type: 'io_error', message: `Failed to parse manifest JSON: ${message}` });
  }

  return validateManifest(data);
};

export const saveManifest = async (
  filePath: string,
  manifest: ProjectManifest,
): Promise<Result<void, ManifestError>> => {
  const json = JSON.stringify(manifest, null, 2) + '\n';
  const dir = dirname(filePath);
  const tempPath = join(dir, `.manifest-${randomBytes(8).toString('hex')}.tmp`);

  try {
    await writeFile(tempPath, json, 'utf-8');
    await rename(tempPath, filePath);
    return ok(undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err({ type: 'io_error', message: `Failed to save manifest: ${message}` });
  }
};
