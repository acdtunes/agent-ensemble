// --- Pure functions ---

export const formatGroupLabel = (groupName: string, count: number): string =>
  `${groupName} (${count})`;

// --- Component ---

interface StatusGroupHeaderProps {
  readonly groupName: string;
  readonly count: number;
}

export const StatusGroupHeader = ({ groupName, count }: StatusGroupHeaderProps) => (
  <h2 className="col-span-full px-1 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
    {formatGroupLabel(groupName, count)}
  </h2>
);
