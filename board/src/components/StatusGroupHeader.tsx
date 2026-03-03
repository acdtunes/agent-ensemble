// --- Pure functions ---

export const formatGroupLabel = (groupName: string, count: number): string =>
  `${groupName} (${count})`;

// --- Component ---

interface StatusGroupHeaderProps {
  readonly groupName: string;
  readonly count: number;
}

export const StatusGroupHeader = ({ groupName, count }: StatusGroupHeaderProps) => (
  <h2 className="col-span-full rounded-md bg-gray-800/50 px-3 py-2 text-sm font-semibold uppercase tracking-wide text-gray-200">
    {formatGroupLabel(groupName, count)}
  </h2>
);
