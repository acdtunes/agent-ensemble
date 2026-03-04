/**
 * Feature docs root resolution — pure core.
 *
 * Given a project path, feature ID, and candidate directories,
 * returns matching directories. The caller provides a dirExists
 * predicate to keep this function pure.
 */

import { join, basename } from 'node:path';

// --- Types ---

export interface LabeledRoot {
  readonly label: string;
  readonly root: string;
}

// --- Pure functions ---

const extractLabel = (candidateDir: string): string =>
  basename(candidateDir);

/**
 * Returns the first existing directory for a feature (backward compat).
 */
export const findFeatureDocsRoot = (
  projectPath: string,
  featureId: string,
  candidateDirs: readonly string[],
  dirExists: (path: string) => boolean,
): string | undefined => {
  for (const dir of candidateDirs) {
    const candidate = join(projectPath, dir, featureId);
    if (dirExists(candidate)) return candidate;
  }
  return undefined;
};

/**
 * Returns ALL existing directories for a feature with labels.
 * Labels are derived from the last segment of each candidate directory.
 */
export const findAllFeatureDocsRoots = (
  projectPath: string,
  featureId: string,
  candidateDirs: readonly string[],
  dirExists: (path: string) => boolean,
): readonly LabeledRoot[] =>
  candidateDirs
    .map((dir) => ({
      label: extractLabel(dir),
      root: join(projectPath, dir, featureId),
    }))
    .filter(({ root }) => dirExists(root));
