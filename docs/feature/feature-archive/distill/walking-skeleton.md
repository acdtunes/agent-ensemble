# Feature Archive - Walking Skeleton

## Purpose

The walking skeleton establishes the thinnest possible end-to-end slice through all architectural layers. It proves the integration works before adding business logic complexity.

## Chosen Slice

**Archive a feature via HTTP endpoint**

This slice touches all layers:
1. **HTTP Route** - POST endpoint receives request
2. **Pure Core** - Path resolution and validation
3. **IO Adapter** - Filesystem directory move
4. **Response** - 204 No Content on success

## Walking Skeleton Scenario

```gherkin
Feature: Archive Walking Skeleton
  As a developer
  I want to verify the archive infrastructure works end-to-end
  So I can confidently build out the full feature

  Scenario: Archive endpoint accepts valid feature and returns 204
    Given project "test-project" is registered
    And feature "my-feature" exists in docs/feature/
    When I POST to /api/projects/test-project/features/my-feature/archive
    Then the response status is 204 No Content
    And the directory docs/feature/my-feature no longer exists
    And the directory docs/archive/my-feature exists
```

## Implementation Checklist

### Layer 1: Types (shared/types.ts)
- [ ] Add `ArchivedFeature` interface
- [ ] Add `ArchiveError` discriminated union
- [ ] Add `RestoreError` discriminated union

### Layer 2: Pure Core (archive-path-resolver.ts)
- [ ] `resolveArchiveDir(projectPath, featureId) → string`

### Layer 3: IO Adapter (archive-io.ts)
- [ ] `moveToArchiveFs(from, to) → Promise<Result<void, ArchiveError>>`
- [ ] `ensureArchiveDirFs(archiveRoot) → Promise<void>`

### Layer 4: HTTP Route (index.ts)
- [ ] POST `/api/projects/:id/features/:featureId/archive`
- [ ] Wire deps: `archiveFeature` in `MultiProjectHttpDeps`

### Layer 5: Test
- [ ] Walking skeleton test passing with real filesystem (temp dir)

## Success Criteria

The walking skeleton is complete when:
1. Test creates temp project directory with a feature
2. HTTP POST archives the feature (moves directory)
3. Response is 204
4. Feature directory is in `docs/archive/`

## Next Steps After Walking Skeleton

Once the skeleton passes:
1. Add error cases (404, 409)
2. Add restore endpoint
3. Add list archived endpoint
4. Add frontend hooks and UI
