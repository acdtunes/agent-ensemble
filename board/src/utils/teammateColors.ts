// Deterministic teammate color assignment.
// Palette avoids emerald, orange, red, indigo — reserved for status/badges.

export const TEAMMATE_PALETTE: readonly string[] = [
  'text-blue-400',
  'text-violet-400',
  'text-cyan-400',
  'text-pink-400',
  'text-teal-400',
  'text-fuchsia-400',
  'text-sky-400',
  'text-rose-400',
  'text-lime-400',
  'text-amber-400',
] as const;

const hashString = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getTeammateColor = (teammateId: string): string =>
  TEAMMATE_PALETTE[hashString(teammateId) % TEAMMATE_PALETTE.length];
