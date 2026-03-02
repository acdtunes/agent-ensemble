import { describe, it, expect } from 'vitest';
import type { BrowseEntry, BrowseError, BrowseResponse } from '../types.js';

describe('Browse types', () => {
  describe('BrowseEntry', () => {
    it('should have readonly name and path string fields', () => {
      const entry: BrowseEntry = { name: 'src', path: '/home/user/src' };

      expect(entry.name).toBe('src');
      expect(entry.path).toBe('/home/user/src');
    });
  });

  describe('BrowseError', () => {
    it('should represent all four error variants', () => {
      const invalidPath: BrowseError = { type: 'invalid_path', message: 'bad path' };
      const notFound: BrowseError = { type: 'not_found', path: '/missing' };
      const permissionDenied: BrowseError = { type: 'permission_denied', path: '/secret' };
      const readFailed: BrowseError = { type: 'read_failed', message: 'IO error' };

      expect(invalidPath.type).toBe('invalid_path');
      expect(notFound.type).toBe('not_found');
      expect(permissionDenied.type).toBe('permission_denied');
      expect(readFailed.type).toBe('read_failed');
    });
  });

  describe('BrowseResponse', () => {
    it('should have path, nullable parent, and readonly entries array', () => {
      const response: BrowseResponse = {
        path: '/home/user',
        parent: '/home',
        entries: [
          { name: 'file.txt', path: '/home/user/file.txt' },
          { name: 'docs', path: '/home/user/docs' },
        ],
      };

      expect(response.path).toBe('/home/user');
      expect(response.parent).toBe('/home');
      expect(response.entries).toHaveLength(2);
      expect(response.entries[0].name).toBe('file.txt');
    });

    it('should allow null parent for root paths', () => {
      const rootResponse: BrowseResponse = {
        path: '/',
        parent: null,
        entries: [],
      };

      expect(rootResponse.parent).toBeNull();
      expect(rootResponse.entries).toHaveLength(0);
    });
  });
});
