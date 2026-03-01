import { describe, it, expect } from 'vitest';
import { createProjectId } from '../types.js';

describe('createProjectId', () => {
  it('should accept valid slug patterns', () => {
    const cases = ['my-project', 'abc', 'project-123', 'a-b-c', 'x1'];
    for (const slug of cases) {
      const result = createProjectId(slug);
      expect(result.ok, `Expected '${slug}' to be valid`).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(slug);
      }
    }
  });

  it('should reject empty string', () => {
    const result = createProjectId('');
    expect(result.ok).toBe(false);
  });

  it('should reject strings with uppercase letters', () => {
    const result = createProjectId('My-Project');
    expect(result.ok).toBe(false);
  });

  it('should reject strings with spaces', () => {
    const result = createProjectId('my project');
    expect(result.ok).toBe(false);
  });

  it('should reject strings with special characters', () => {
    const cases = ['my_project', 'hello!', 'proj@1', 'a/b', 'a.b'];
    for (const slug of cases) {
      const result = createProjectId(slug);
      expect(result.ok, `Expected '${slug}' to be rejected`).toBe(false);
    }
  });

  it('should reject strings starting or ending with hyphens', () => {
    expect(createProjectId('-leading').ok).toBe(false);
    expect(createProjectId('trailing-').ok).toBe(false);
  });

  it('should provide descriptive error message on rejection', () => {
    const result = createProjectId('INVALID!');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid project ID');
    }
  });
});
