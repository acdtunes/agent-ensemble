import { describe, it, expect } from 'vitest';
import { getTeammateEmoji, EMOJI_PALETTE } from '../utils/teammateEmoji';

describe('EMOJI_PALETTE', () => {
  const EXPECTED_PALETTE = ['🐙', '🦊', '🐢', '🦉', '🐬', '🦋', '🐺', '🦈', '🦁', '🐝'];

  it('contains exactly the 10 animal emojis', () => {
    expect([...EMOJI_PALETTE]).toEqual(EXPECTED_PALETTE);
  });

  it('has no duplicates', () => {
    const unique = new Set(EMOJI_PALETTE);
    expect(unique.size).toBe(EMOJI_PALETTE.length);
  });
});

describe('getTeammateEmoji', () => {
  it('returns emoji from palette for various input lengths', () => {
    const inputs = ['crafter-01', 'a', 'crafter-some-very-long-teammate-identifier-12345'];
    for (const teammateId of inputs) {
      expect(EMOJI_PALETTE).toContain(getTeammateEmoji(teammateId));
    }
  });

  it('is deterministic — same input always produces same output', () => {
    const first = getTeammateEmoji('agent-alpha');
    const second = getTeammateEmoji('agent-alpha');
    expect(first).toBe(second);
  });
});
