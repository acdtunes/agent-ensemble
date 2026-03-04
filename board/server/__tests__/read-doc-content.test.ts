/**
 * Server-side tests: readDocContent effect function
 *
 * Driving port: readDocContent (filesystem effect)
 * Validates: file reading from validated absolute path, not_found error,
 *   read_failed error on permission issues
 *
 * Integration tests with real filesystem (temp dirs) — no mocks.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Result, DocContentError } from '../../shared/types.js';

type ReadDocContent = (validatedPath: string) => Promise<Result<string, DocContentError>>;

// Lazy import to let the module be created during GREEN phase
const importReadDocContent = async (): Promise<ReadDocContent> => {
  const mod = await import('../doc-content.js');
  return mod.readDocContent;
};

// =================================================================
// readDocContent: reads file content successfully
// =================================================================
describe('readDocContent: reads markdown file content from validated path', () => {
  let docsRoot: string;

  beforeEach(async () => {
    docsRoot = await mkdtemp(join(tmpdir(), 'read-doc-test-'));
  });

  afterEach(async () => {
    await rm(docsRoot, { recursive: true, force: true });
  });

  it('returns ok with raw markdown string for existing file', async () => {
    const readDocContent = await importReadDocContent();

    // Given a markdown file with content
    const filePath = join(docsRoot, 'README.md');
    const content = '# Hello World\n\nThis is a test document.\n';
    await writeFile(filePath, content, 'utf-8');

    // When reading the file via validated absolute path
    const result = await readDocContent(filePath);

    // Then returns ok with the raw markdown content
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(content);
  });

  it('preserves UTF-8 content including special characters', async () => {
    const readDocContent = await importReadDocContent();

    // Given a file with UTF-8 content
    const filePath = join(docsRoot, 'unicode.md');
    const content = '# Diseño de Arquitectura\n\nDiagramas → flujos ⟶ decisiones\n';
    await writeFile(filePath, content, 'utf-8');

    // When reading the file
    const result = await readDocContent(filePath);

    // Then UTF-8 content is preserved
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe(content);
  });
});

// =================================================================
// readDocContent: error handling
// =================================================================
describe('readDocContent: returns Result error for inaccessible files', () => {
  let docsRoot: string;

  beforeEach(async () => {
    docsRoot = await mkdtemp(join(tmpdir(), 'read-doc-err-test-'));
  });

  afterEach(async () => {
    await rm(docsRoot, { recursive: true, force: true });
  });

  it('returns not_found error when file does not exist', async () => {
    const readDocContent = await importReadDocContent();

    // Given a path to a non-existent file
    const missingPath = join(docsRoot, 'does-not-exist.md');

    // When reading the file
    const result = await readDocContent(missingPath);

    // Then returns error with not_found type
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('not_found');
    expect(result.error).toHaveProperty('path', missingPath);
  });

  it('returns read_failed error when file cannot be read', async () => {
    const readDocContent = await importReadDocContent();

    // Given a file with no read permissions
    const filePath = join(docsRoot, 'no-read.md');
    await writeFile(filePath, '# Secret', 'utf-8');
    await chmod(filePath, 0o000);

    // When reading the file
    const result = await readDocContent(filePath);

    // Then returns error with read_failed type
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('read_failed');

    // Cleanup: restore permissions for afterEach cleanup
    await chmod(filePath, 0o644);
  });
});
