/**
 * Server-side tests: Doc Content pure functions
 *
 * Driving port: validateDocPath pure function (server pure core)
 * Driving port: resolveDocsRoot pure function
 * Validates: path traversal prevention, valid path resolution
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
describe('validateDocPath: accepts valid paths', () => {
  it('accepts simple and nested relative markdown paths', async () => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    // Simple filename at docs root
    expect(validateDocPath(docsRoot, 'README.md').ok).toBe(true);

    // Deeply nested path with special chars
    expect(validateDocPath(docsRoot, 'feature/card_redesign/jtbd-analysis.md').ok).toBe(true);
  });
});

// =================================================================
// validateDocPath: REJECTS malicious and invalid paths (SECURITY CRITICAL)
// Security vectors: parent traversal, absolute paths, encoded attacks, null bytes, empty, malformed
// =================================================================
describe('validateDocPath: rejects malicious and invalid paths', () => {
  it.each([
    ['parent dir escape at start', '../../../etc/passwd'],
    ['embedded parent dir escape', 'adrs/../../../etc/shadow'],
    ['absolute path bypass', '/etc/passwd'],
    ['URL-encoded traversal', '..%2F..%2Fetc%2Fpasswd'],
    ['null byte injection', 'adrs/ADR-001.md\0.txt'],
    ['empty path', ''],
    ['malformed URL encoding', 'file%GG.md'],
  ])('rejects %s', async (_label, maliciousPath) => {
    const { validateDocPath } = await import(/* @vite-ignore */ DOC_CONTENT_MODULE_PATH);
    const docsRoot = '/projects/nw-teams/docs';

    const result = validateDocPath(docsRoot, maliciousPath);

    expect(result.ok).toBe(false);
  });
});

// =================================================================
// resolveDocsRoot: resolves docs root from project config
// =================================================================
describe('resolveDocsRoot: determines docs root from config', () => {
  it('resolves absolute and relative docs_root paths', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // Absolute path returned as-is
    expect(resolveDocsRoot(projectDir, { docs_root: '/projects/nw-teams/docs' }))
      .toBe('/projects/nw-teams/docs');

    // Relative path resolved against project directory
    const relativePath = resolveDocsRoot(projectDir, { docs_root: 'docs' });
    expect(relativePath).toContain('/projects/nw-teams');
    expect(relativePath).toContain('docs');
  });

  it('returns undefined when docs_root not configured', async () => {
    const { resolveDocsRoot } = await import(/* @vite-ignore */ PROJECT_CONFIG_MODULE_PATH);
    const projectDir = '/projects/nw-teams';

    // No config
    expect(resolveDocsRoot(projectDir, undefined)).toBeUndefined();

    // Config without docs_root field
    expect(resolveDocsRoot(projectDir, {})).toBeUndefined();
  });
});
