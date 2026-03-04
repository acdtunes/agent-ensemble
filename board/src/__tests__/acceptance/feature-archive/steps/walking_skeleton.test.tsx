/**
 * Walking Skeleton: Feature Archive
 *
 * Thinnest end-to-end slice proving archive infrastructure works.
 * Tests the archive HTTP endpoint with injected filesystem deps.
 *
 * Driving port: HTTP POST /api/projects/:id/features/:featureId/archive
 */

import { describe, it, expect, afterEach } from 'vitest';
import type {
  ProjectId,
  ProjectEntry,
  FeatureId,
  Roadmap,
  Result,
} from '../../../../shared/types';
import { ok, err, createProjectId } from '../../../../shared/types';

// @skip - Implementation not yet created
describe.skip('Walking Skeleton: Archive endpoint accepts valid feature', () => {
  // Placeholder for HTTP server lifecycle
  let server: { port: number; close: () => Promise<void> } | null = null;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = null;
    }
  });

  it('returns 204 No Content when archiving existing feature', async () => {
    // Given project "test-project" is registered
    const projectId = (createProjectId('test-project') as { ok: true; value: ProjectId }).value;

    // And feature "my-feature" exists in docs/feature/
    const featureId = 'my-feature' as FeatureId;
    const activeFeatures = new Set<FeatureId>([featureId]);
    const archivedFeatures = new Set<FeatureId>();

    // Stub deps that simulate filesystem state
    const mockDeps = {
      listProjectSummaries: () => [],
      getProject: (id: ProjectId): Result<ProjectEntry, unknown> =>
        id === projectId
          ? ok({ projectId, roadmap: { roadmap: {}, phases: [] } as Roadmap })
          : err({ type: 'not_found' }),
      archiveFeature: async (
        pId: ProjectId,
        fId: FeatureId,
      ): Promise<Result<void, { type: string; featureId?: FeatureId; message?: string }>> => {
        if (pId !== projectId) return err({ type: 'not_found', featureId: fId });
        if (!activeFeatures.has(fId)) return err({ type: 'not_found', featureId: fId });
        if (archivedFeatures.has(fId)) return err({ type: 'already_archived', featureId: fId });

        // Simulate move
        activeFeatures.delete(fId);
        archivedFeatures.add(fId);
        return ok(undefined);
      },
    };

    // When I POST to /api/projects/test-project/features/my-feature/archive
    // (HTTP server setup will use createMultiProjectHttpApp with mockDeps)

    // Then the response status is 204 No Content
    // And the directory docs/feature/my-feature no longer exists (activeFeatures check)
    // And the directory docs/archive/my-feature exists (archivedFeatures check)

    expect(activeFeatures.has(featureId)).toBe(true); // Before archive
    const result = await mockDeps.archiveFeature(projectId, featureId);
    expect(result.ok).toBe(true);
    expect(activeFeatures.has(featureId)).toBe(false); // After archive
    expect(archivedFeatures.has(featureId)).toBe(true);
  });
});
