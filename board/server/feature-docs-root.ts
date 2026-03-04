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
 * Uses case-insensitive matching for feature directory names.
 */
export const findFeatureDocsRoot = (
  projectPath: string,
  featureId: string,
  candidateDirs: readonly string[],
  dirExists: (path: string) => boolean,
  listDir?: (path: string) => string[],
): string | undefined => {
  for (const dir of candidateDirs) {
    const parentDir = join(projectPath, dir);
    // Try exact match first
    const exactCandidate = join(parentDir, featureId);
    if (dirExists(exactCandidate)) return exactCandidate;
    // Try case-insensitive match if listDir provided
    if (listDir) {
      const entries = listDir(parentDir);
      const match = entries.find((e) => e.toLowerCase() === featureId.toLowerCase());
      if (match) {
        const candidate = join(parentDir, match);
        if (dirExists(candidate)) return candidate;
      }
    }
  }
  return undefined;
};

/**
 * Returns ALL existing directories for a feature with labels.
 * Labels are derived from the last segment of each candidate directory.
 * Uses case-insensitive matching for feature directory names.
 */
export const findAllFeatureDocsRoots = (
  projectPath: string,
  featureId: string,
  candidateDirs: readonly string[],
  dirExists: (path: string) => boolean,
  listDir?: (path: string) => string[],
): readonly LabeledRoot[] =>
  candidateDirs
    .map((dir) => {
      const parentDir = join(projectPath, dir);
      // Try exact match first
      const exactPath = join(parentDir, featureId);
      if (dirExists(exactPath)) {
        return { label: extractLabel(dir), root: exactPath };
      }
      // Try case-insensitive match if listDir provided
      if (listDir) {
        const entries = listDir(parentDir);
        const match = entries.find((e) => e.toLowerCase() === featureId.toLowerCase());
        if (match) {
          const candidate = join(parentDir, match);
          if (dirExists(candidate)) {
            return { label: extractLabel(dir), root: candidate };
          }
        }
      }
      return null;
    })
    .filter((item): item is LabeledRoot => item !== null);
