import type { FeatureSummary } from '../../shared/types';

interface ContextDropdownsProps {
  readonly projectId: string;
  readonly featureId: string;
  readonly features: readonly FeatureSummary[];
  readonly onFeatureChange: (featureId: string) => void;
}

export const ContextDropdowns = ({
  projectId,
  featureId,
  features,
  onFeatureChange,
}: ContextDropdownsProps) => (
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-1.5 text-sm text-gray-400">
      <span className="font-medium text-gray-300">{projectId}</span>
    </div>

    <span className="text-gray-600">/</span>

    <select
      data-testid="feature-dropdown"
      value={featureId}
      onChange={e => onFeatureChange(e.target.value)}
      className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-200"
    >
      {features.map(f => (
        <option key={f.featureId} value={f.featureId}>
          {f.name}
        </option>
      ))}
    </select>
  </div>
);
