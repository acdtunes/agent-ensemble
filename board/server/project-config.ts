import * as path from 'node:path';

export interface ProjectYamlConfig {
  readonly docs_root?: string;
}

/**
 * Resolve the absolute docs root path from project config.
 * Returns undefined when no config or no docs_root field.
 *
 * Pure function — no filesystem access.
 */
export const resolveDocsRoot = (
  projectDir: string,
  config?: ProjectYamlConfig,
): string | undefined => {
  if (!config || !config.docs_root) {
    return undefined;
  }

  return path.isAbsolute(config.docs_root)
    ? config.docs_root
    : path.resolve(projectDir, config.docs_root);
};
