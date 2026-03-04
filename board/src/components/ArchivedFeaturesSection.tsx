/**
 * ArchivedFeaturesSection - Collapsible section displaying archived features
 *
 * Pure presentational component. Receives all state and callbacks via props.
 * Collapsed by default, shows count in header, lists features with restore button.
 */

import { useState } from 'react';
import type { ArchivedFeature } from '../../shared/types';

// --- Props type ---

export interface ArchivedFeaturesSectionProps {
  readonly archivedFeatures: readonly ArchivedFeature[];
  readonly onRestore: (featureId: string) => void;
  readonly restoringFeatureId: string | null;
}

// --- Pure helpers ---

const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// --- Component ---

export const ArchivedFeaturesSection = ({
  archivedFeatures,
  onRestore,
  restoringFeatureId,
}: ArchivedFeaturesSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (archivedFeatures.length === 0) {
    return null;
  }

  const handleToggle = () => setIsExpanded((prev) => !prev);

  return (
    <section>
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        aria-expanded={isExpanded}
      >
        <span>Archived</span>
        <span className="text-gray-500">({archivedFeatures.length})</span>
      </button>

      {isExpanded && (
        <ul className="mt-1 space-y-1 pl-3">
          {archivedFeatures.map((feature) => {
            const isRestoring = restoringFeatureId === feature.featureId;

            return (
              <li
                key={feature.featureId}
                className="flex items-center justify-between rounded bg-gray-800/50 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-sm text-gray-300">{feature.name}</span>
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(feature.archivedAt)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRestore(feature.featureId)}
                  disabled={isRestoring}
                  className="rounded px-2 py-1 text-xs text-blue-400 hover:bg-gray-700 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
