import { describe, it, expect } from 'vitest';
import { getTeammateEmoji } from '../utils/teammateEmoji';

describe('getTeammateEmoji', () => {
  it('returns crafter emoji for crafter-XX', () => {
    expect(getTeammateEmoji('crafter-01')).toBe('🛠️');
    expect(getTeammateEmoji('crafter-99')).toBe('🛠️');
  });

  it('returns reviewer emoji for reviewer-XX', () => {
    expect(getTeammateEmoji('reviewer-01')).toBe('🔍');
    expect(getTeammateEmoji('reviewer-42')).toBe('🔍');
  });

  it('returns researcher emoji for researcher-XX', () => {
    expect(getTeammateEmoji('researcher-01')).toBe('🔬');
  });

  it('returns planner emoji for planner-XX', () => {
    expect(getTeammateEmoji('planner-01')).toBe('📋');
  });

  it('returns debugger emoji for debugger-XX', () => {
    expect(getTeammateEmoji('debugger-01')).toBe('🐛');
  });

  it('returns default emoji for unknown roles', () => {
    expect(getTeammateEmoji('unknown-01')).toBe('👤');
    expect(getTeammateEmoji('agent-alpha')).toBe('👤');
    expect(getTeammateEmoji('random-string')).toBe('👤');
  });

  it('is deterministic', () => {
    expect(getTeammateEmoji('crafter-01')).toBe(getTeammateEmoji('crafter-01'));
  });
});
