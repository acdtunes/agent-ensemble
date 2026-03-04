// Role-based teammate emoji assignment.

const ROLE_EMOJI: Record<string, string> = {
  crafter: '🛠️',
  reviewer: '🔍',
  researcher: '🔬',
  planner: '📋',
  debugger: '🐛',
};

const DEFAULT_EMOJI = '👤';

const extractRole = (teammateId: string): string | null => {
  const match = teammateId.match(/^([a-z]+)-\d+$/);
  return match?.[1] ?? null;
};

export const getTeammateEmoji = (teammateId: string): string => {
  const role = extractRole(teammateId);
  return role !== null ? (ROLE_EMOJI[role] ?? DEFAULT_EMOJI) : DEFAULT_EMOJI;
};
