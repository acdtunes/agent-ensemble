import type { DisplayColumn } from './statusMapping';

const BASE_TRANSITION = 'transition-all duration-300 ease-in-out hover:brightness-110 hover:-translate-y-0.5 hover:shadow-md';

export const getCardAnimationClasses = (column: DisplayColumn): string =>
  column === 'in_progress'
    ? `${BASE_TRANSITION} animate-pulse-glow`
    : BASE_TRANSITION;
