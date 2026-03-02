export interface BreadcrumbSegment {
  readonly label: string;
  readonly onClick?: () => void;
}

interface BreadcrumbProps {
  readonly segments: readonly BreadcrumbSegment[];
}

export const Breadcrumb = ({ segments }: BreadcrumbProps) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-gray-400">
    {segments.map((segment, index) => (
      <span key={segment.label} className="flex items-center gap-1">
        {index > 0 && <span className="text-gray-600">/</span>}
        {segment.onClick ? (
          <button
            onClick={segment.onClick}
            className="hover:text-gray-200 transition-colors"
          >
            {segment.label}
          </button>
        ) : (
          <span className="text-gray-200">{segment.label}</span>
        )}
      </span>
    ))}
  </nav>
);
