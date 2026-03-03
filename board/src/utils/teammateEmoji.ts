// Deterministic teammate emoji assignment.
// Palette: 10 distinct animals for visual teammate identification.

export const EMOJI_PALETTE: readonly string[] = [
  '🐙', '🦊', '🐢', '🦉', '🐬', '🦋', '🐺', '🦈', '🦁', '🐝',
] as const;

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getTeammateEmoji = (teammateId: string): string =>
  EMOJI_PALETTE[hashString(teammateId) % EMOJI_PALETTE.length];
