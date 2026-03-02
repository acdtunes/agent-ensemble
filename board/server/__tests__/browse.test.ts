/**
 * Server-side tests: Browse pure validation core
 *
 * Driving ports: validateBrowsePath, filterDirectoryEntries (server pure core)
 * Validates: path security, directory entry filtering, pipeline composition
 *
 * Pure function tests — no filesystem access needed.
 */

import { describe, it, expect } from 'vitest';
import {
  validateBrowsePath,
  filterDirectoryEntries,
  computeParentPath,
} from '../browse.js';

// =================================================================
// Acceptance: validate path then filter entries pipeline
// =================================================================
describe('browse pipeline: validate path and filter directory entries', () => {
  it('validates a safe absolute path and filters entries to sorted directories only', () => {
    // Given a valid absolute path
    const pathResult = validateBrowsePath('/projects/nw-teams/docs');

    // Then validation succeeds
    expect(pathResult.ok).toBe(true);

    // Given raw directory entries with files, hidden dirs, and regular dirs
    const rawEntries = [
      { name: 'zebra', path: '/projects/nw-teams/docs/zebra', isDirectory: true },
      { name: '.hidden', path: '/projects/nw-teams/docs/.hidden', isDirectory: true },
      { name: 'readme.md', path: '/projects/nw-teams/docs/readme.md', isDirectory: false },
      { name: 'alpha', path: '/projects/nw-teams/docs/alpha', isDirectory: true },
    ];

    // When filtering entries
    const filtered = filterDirectoryEntries(rawEntries);

    // Then only non-hidden directories remain, sorted alphabetically
    expect(filtered).toEqual([
      { name: 'alpha', path: '/projects/nw-teams/docs/alpha' },
      { name: 'zebra', path: '/projects/nw-teams/docs/zebra' },
    ]);
  });
});

// =================================================================
// validateBrowsePath: accepts valid absolute paths
// =================================================================
describe('validateBrowsePath: accepts valid absolute paths', () => {
  it('accepts a simple absolute directory path', () => {
    const result = validateBrowsePath('/projects/nw-teams/docs');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe('/projects/nw-teams/docs');
    }
  });

  it('accepts root path', () => {
    const result = validateBrowsePath('/');

    expect(result.ok).toBe(true);
  });

  it('accepts path with hyphens and underscores', () => {
    const result = validateBrowsePath('/my-project/sub_dir');

    expect(result.ok).toBe(true);
  });
});

// =================================================================
// validateBrowsePath: REJECTS unsafe paths (SECURITY CRITICAL)
// =================================================================
describe('validateBrowsePath: rejects unsafe paths', () => {
  it('rejects null bytes', () => {
    const result = validateBrowsePath('/projects/docs\0/secret');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects URL-encoded null bytes (%00)', () => {
    const result = validateBrowsePath('/projects/docs%00/secret');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects dot-dot traversal sequences', () => {
    const result = validateBrowsePath('/projects/../../../etc');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects encoded dot-dot traversal', () => {
    const result = validateBrowsePath('/projects/..%2F..%2Fetc');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects non-absolute (relative) paths', () => {
    const result = validateBrowsePath('relative/path');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects empty path', () => {
    const result = validateBrowsePath('');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });

  it('rejects malformed URL encoding', () => {
    const result = validateBrowsePath('/projects/%GG/docs');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('invalid_path');
    }
  });
});

// =================================================================
// filterDirectoryEntries: filters and sorts entries
// =================================================================
describe('filterDirectoryEntries: filters and sorts directory entries', () => {
  it('excludes files, keeps only directories', () => {
    const entries = [
      { name: 'src', path: '/project/src', isDirectory: true },
      { name: 'README.md', path: '/project/README.md', isDirectory: false },
      { name: 'package.json', path: '/project/package.json', isDirectory: false },
    ];

    const result = filterDirectoryEntries(entries);

    expect(result).toEqual([{ name: 'src', path: '/project/src' }]);
  });

  it('excludes hidden directories starting with dot', () => {
    const entries = [
      { name: '.git', path: '/project/.git', isDirectory: true },
      { name: '.vscode', path: '/project/.vscode', isDirectory: true },
      { name: 'src', path: '/project/src', isDirectory: true },
    ];

    const result = filterDirectoryEntries(entries);

    expect(result).toEqual([{ name: 'src', path: '/project/src' }]);
  });

  it('sorts entries alphabetically by name', () => {
    const entries = [
      { name: 'zebra', path: '/project/zebra', isDirectory: true },
      { name: 'alpha', path: '/project/alpha', isDirectory: true },
      { name: 'middle', path: '/project/middle', isDirectory: true },
    ];

    const result = filterDirectoryEntries(entries);

    expect(result).toEqual([
      { name: 'alpha', path: '/project/alpha' },
      { name: 'middle', path: '/project/middle' },
      { name: 'zebra', path: '/project/zebra' },
    ]);
  });

  it('returns empty array when no directories match', () => {
    const entries = [
      { name: '.hidden', path: '/project/.hidden', isDirectory: true },
      { name: 'file.txt', path: '/project/file.txt', isDirectory: false },
    ];

    const result = filterDirectoryEntries(entries);

    expect(result).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const result = filterDirectoryEntries([]);

    expect(result).toEqual([]);
  });
});

// =================================================================
// computeParentPath: computes parent directory or null for root
// =================================================================
describe('computeParentPath: computes parent or null for filesystem root', () => {
  it('returns parent directory for a nested path', () => {
    expect(computeParentPath('/home/user/projects')).toBe('/home/user');
  });

  it('returns null for filesystem root', () => {
    expect(computeParentPath('/')).toBeNull();
  });

  it('returns parent for a single-level path', () => {
    expect(computeParentPath('/home')).toBe('/');
  });
});
