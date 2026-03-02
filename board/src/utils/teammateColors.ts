// Deterministic teammate color assignment.
// Palette avoids emerald, orange, red, indigo — reserved for status/badges.

export const TEAMMATE_PALETTE: readonly string[] = [
  'text-blue-600',
  'text-violet-600',
  'text-cyan-600',
  'text-pink-600',
  'text-teal-600',
  'text-fuchsia-600',
  'text-sky-600',
  'text-rose-500',
  'text-lime-600',
  'text-amber-600',
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
