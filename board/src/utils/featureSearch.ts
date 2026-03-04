import type { FeatureSummary } from '../../shared/types';

/**
 * Filters features by case-insensitive substring match on feature name.
 *
 * @param features - The features to filter
 * @param searchTerm - The search term (case-insensitive)
 * @returns Features whose name contains the search term
 */
export const filterFeaturesBySearch = (
  features: readonly FeatureSummary[],
  searchTerm: string,
): readonly FeatureSummary[] => {
  const normalizedTerm = searchTerm.toLowerCase().trim();

  if (normalizedTerm === '') {
    return features;
  }

  return features.filter((feature) =>
    feature.name.toLowerCase().includes(normalizedTerm),
  );
};
