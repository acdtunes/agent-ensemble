import type { StatusFilterOption, StatusFilterValue } from '../utils/featureStatusFilter';

interface StatusFilterControlsProps {
  readonly options: readonly StatusFilterOption[];
  readonly selected: StatusFilterValue;
  readonly onSelect: (value: StatusFilterValue) => void;
}

export const StatusFilterControls = ({
  options,
  selected,
  onSelect,
}: StatusFilterControlsProps) => (
  <div
    role="group"
    aria-label="Filter by status"
    className="flex flex-wrap gap-2"
  >
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onSelect(option.value)}
        aria-pressed={option.value === selected}
        className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
          option.value === selected
            ? 'bg-cyan-600 text-white'
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
        }`}
      >
        {option.label} ({option.count})
      </button>
    ))}
  </div>
);
