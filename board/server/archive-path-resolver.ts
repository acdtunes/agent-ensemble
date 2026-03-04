/**
 * Archive path resolver — pure functions for resolving archive paths.
 *
 * All functions are pure: projectPath + FeatureId → absolute path string.
 * No filesystem access, no side effects.
 */

import type { FeatureId } from '../shared/types.js';

const ARCHIVE_BASE = 'docs/archive';

export const resolveArchiveDir = (projectPath: string, featureId: FeatureId): string =>
  `${projectPath}/${ARCHIVE_BASE}/${featureId}`;
