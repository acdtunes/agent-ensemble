/**
 * Server-side tests: Doc Content pure functions
 *
 * Driving port: validateDocPath pure function (server pure core)
 * Driving port: resolveDocsRoot pure function
 * Validates: path traversal prevention, valid path resolution, edge cases
 *
 * These are pure function tests -- no filesystem mocks needed.
 * Effect functions (readDocContent) are tested separately with filesystem mocks.
 *
 * SECURITY: validateDocPath is the only security-critical function in doc-viewer.
 * Path traversal prevention tests are critical.
 */

import { describe, it, expect } from 'vitest';

// Computed paths prevent Vite from statically resolving imports before files exist.
const DOC_CONTENT_MODULE_PATH = ['..', '..', 'server', 'doc-content'].join('/');
const PROJECT_CONFIG_MODULE_PATH = ['..', '..', 'server', 'project-config'].join('/');

// =================================================================
// validateDocPath: accepts valid relative paths
// =================================================================
describe('validateDocPath: accepts valid relative markdown paths', () => {
  it('accepts a simple filename at docs root', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    // Given a valid relative path to a markdown file
    const result = validateDocPath(docsRoot, 'README.md');

    // Then the path is accepted
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('README.md');
    }
  });

  it('accepts a nested relative path', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    // Given a nested relative path
    const result = validateDocPath(docsRoot, 'adrs/ADR-001-state-management.md');

    // Then the path is accepted
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain('adrs/ADR-001-state-management.md');
    }
  });

  it('accepts deeply nested path', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, 'feature/card-redesign/discuss/jtbd-analysis.md');

    expect(result.ok).toBe(true);
  });
});

// =================================================================
// validateDocPath: REJECTS path traversal attempts (SECURITY CRITICAL)
// =================================================================
describe('validateDocPath: rejects path traversal attempts', () => {
  it.each([
    ['relative ../ at start', '../../../etc/passwd'],
    ['embedded ../ in the middle', 'adrs/../../../etc/shadow'],
    ['../ escape after valid folder', 'adrs/../../secrets/api-key.md'],
  ])('rejects parent directory escape: %s', async (_label, maliciousPath) => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, maliciousPath);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it.each([
    ['raw null byte', 'adrs/ADR-001.md\0.txt'],
    ['URL-encoded null byte', 'file%00.md'],
  ])('rejects null byte injection: %s', async (_label, maliciousPath) => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, maliciousPath);

    expect(result.ok).toBe(false);
  });

  it('rejects absolute path bypassing docs root', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, '/etc/passwd');

    expect(result.ok).toBe(false);
  });

  it('rejects encoded traversal sequences', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, '..%2F..%2Fetc%2Fpasswd');

    expect(result.ok).toBe(false);
  });

  it('rejects empty path', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, '');

    expect(result.ok).toBe(false);
  });

  it('rejects malformed URL encoding', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, 'file%GG.md');

    expect(result.ok).toBe(false);
  });
});

// =================================================================
// validateDocPath: edge cases
// =================================================================
describe('validateDocPath: handles edge cases correctly', () => {
  it('accepts path with spaces in filename', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, 'adrs/ADR 001 state management.md');

    // Paths with spaces are valid
    expect(result.ok).toBe(true);
  });

  it('accepts path with hyphens and underscores', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, 'feature/card_redesign/jtbd-analysis.md');

    expect(result.ok).toBe(true);
  });

  it('normalizes redundant path separators', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, 'adrs///ADR-001.md');

    // Should normalize to valid path
    expect(result.ok).toBe(true);
  });
});

// =================================================================
// resolveDocsRoot: resolves docs root from project config
// =================================================================
describe('resolveDocsRoot: determines docs root from config', () => {
  it('returns absolute path when config specifies absolute docs_root', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // Given a config with absolute docs_root
    const result = resolveDocsRoot(projectDir, { docs_root: '/projects/nw-teams/docs' });

    expect(result).toBe('/projects/nw-teams/docs');
  });

  it('resolves relative path against project directory', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // Given a config with relative docs_root
    const result = resolveDocsRoot(projectDir, { docs_root: 'docs' });

    expect(result).toContain('/projects/nw-teams');
    expect(result).toContain('docs');
  });

  it('returns undefined when no config provided', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // Given no config
    const result = resolveDocsRoot(projectDir, undefined);

    expect(result).toBeUndefined();
  });

  it('returns undefined when config has no docs_root field', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // Given a config without docs_root
    const result = resolveDocsRoot(projectDir, {});

    expect(result).toBeUndefined();
  });
});
