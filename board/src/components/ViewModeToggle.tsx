// --- Types ---

export type ViewMode = 'card' | 'list';

interface ViewModeToggleProps {
  readonly mode: ViewMode;
  readonly onToggle: (mode: ViewMode) => void;
}

// --- Component ---

export const ViewModeToggle = ({ mode, onToggle }: ViewModeToggleProps) => (
  <div
    role="group"
    aria-label="View mode"
    className="flex rounded-lg border border-gray-700 bg-gray-800"
  >
    <button
      type="button"
      onClick={() => onToggle('card')}
      aria-pressed={mode === 'card'}
      className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
        mode === 'card'
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-gray-200'
      } rounded-l-md`}
    >
      <CardIcon />
      Card
    </button>
    <button
      type="button"
      onClick={() => onToggle('list')}
      aria-pressed={mode === 'list'}
      className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
        mode === 'list'
          ? 'bg-gray-700 text-white'
          : 'text-gray-400 hover:text-gray-200'
      } rounded-r-md`}
    >
      <ListIcon />
      List
    </button>
  </div>
);

// --- Icons ---

const CardIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
      clipRule="evenodd"
    />
  </svg>
);

const ListIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className="h-4 w-4"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 5A.75.75 0 0 1 2.75 9h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 9.75Zm0 5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z"
      clipRule="evenodd"
    />
  </svg>
);
