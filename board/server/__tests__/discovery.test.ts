import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { ProjectId } from '../../shared/types.js';
import { createProjectId } from '../../shared/types.js';
import {
  computeDiscoveryDiff,
  createProjectDiscovery,
  scanProjectDirsFs,
  type RegistryActions,
} from '../discovery.js';

// --- Helpers ---

const makeProjectId = (raw: string): ProjectId => {
  const result = createProjectId(raw);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

const createStubRegistry = (): RegistryActions & { readonly added: ProjectId[]; readonly removed: ProjectId[] } => {
  const known = new Set<ProjectId>();
  const added: ProjectId[] = [];
  const removed: ProjectId[] = [];
  return {
    add: (id: ProjectId) => { known.add(id); added.push(id); },
    remove: (id: ProjectId) => { known.delete(id); removed.push(id); },
    knownIds: () => new Set(known),
    added,
    removed,
  };
};

const addProjectDir = async (rootDir: string, name: string): Promise<void> => {
  const projectDir = join(rootDir, name);
  await mkdir(projectDir, { recursive: true });
  await writeFile(join(projectDir, 'roadmap.yaml'), 'roadmap:\n  project_id: test\nphases: []');
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// --- Acceptance Tests ---

describe('ProjectDiscovery (acceptance)', () => {
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'discovery-test-'));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('should detect a new project directory containing roadmap.yaml within one poll', async () => {
    const registry = createStubRegistry();
    await addProjectDir(rootDir, 'my-project');

    const discovery = createProjectDiscovery(rootDir, registry, scanProjectDirsFs, 100);
    const diff = await discovery.poll();
    discovery.stop();

    expect(diff.added).toContain(makeProjectId('my-project'));
    expect(registry.added).toContain(makeProjectId('my-project'));
  });

  it('should detect removal of a project directory within one poll', async () => {
    const registry = createStubRegistry();
    await addProjectDir(rootDir, 'stale-project');

    const discovery = createProjectDiscovery(rootDir, registry, scanProjectDirsFs, 100);

    // First poll: discovers the project
    await discovery.poll();

    // Remove the project directory
    await rm(join(rootDir, 'stale-project'), { recursive: true, force: true });

    // Second poll: detects removal
    const diff = await discovery.poll();
    discovery.stop();

    expect(diff.removed).toContain(makeProjectId('stale-project'));
    expect(registry.removed).toContain(makeProjectId('stale-project'));
  });

  it('should ignore subdirectories that do not contain roadmap.yaml', async () => {
    const registry = createStubRegistry();
    // Create dir without roadmap.yaml
    await mkdir(join(rootDir, 'not-a-project'), { recursive: true });
    // Create dir with roadmap.yaml
    await addProjectDir(rootDir, 'real-project');

    const discovery = createProjectDiscovery(rootDir, registry, scanProjectDirsFs, 100);
    const diff = await discovery.poll();
    discovery.stop();

    expect(diff.added).toHaveLength(1);
    expect(diff.added).toContain(makeProjectId('real-project'));
    expect(registry.added).not.toContain('not-a-project');
  });

  it('should detect additions and removals in the same poll cycle', async () => {
    const registry = createStubRegistry();
    await addProjectDir(rootDir, 'existing-project');

    const discovery = createProjectDiscovery(rootDir, registry, scanProjectDirsFs, 100);
    await discovery.poll();

    // Add new, remove existing
    await addProjectDir(rootDir, 'new-project');
    await rm(join(rootDir, 'existing-project'), { recursive: true, force: true });

    const diff = await discovery.poll();
    discovery.stop();

    expect(diff.added).toContain(makeProjectId('new-project'));
    expect(diff.removed).toContain(makeProjectId('existing-project'));
  });

  it('should automatically poll on interval when started', async () => {
    const registry = createStubRegistry();
    await addProjectDir(rootDir, 'auto-detected');

    const discovery = createProjectDiscovery(rootDir, registry, scanProjectDirsFs, 50);
    discovery.start();

    // Wait for at least one poll cycle
    await delay(150);
    discovery.stop();

    expect(registry.added).toContain(makeProjectId('auto-detected'));
  });
});

// --- Unit Tests: computeDiscoveryDiff ---

describe('computeDiscoveryDiff', () => {
  it('should return added projects not in known set', () => {
    const known = new Set<ProjectId>();
    const found = new Set([makeProjectId('alpha'), makeProjectId('beta')]);

    const diff = computeDiscoveryDiff(known, found);

    expect(diff.added).toEqual(expect.arrayContaining([makeProjectId('alpha'), makeProjectId('beta')]));
    expect(diff.added).toHaveLength(2);
    expect(diff.removed).toHaveLength(0);
  });

  it('should return removed projects not in found set', () => {
    const known = new Set([makeProjectId('alpha'), makeProjectId('beta')]);
    const found = new Set<ProjectId>();

    const diff = computeDiscoveryDiff(known, found);

    expect(diff.removed).toEqual(expect.arrayContaining([makeProjectId('alpha'), makeProjectId('beta')]));
    expect(diff.removed).toHaveLength(2);
    expect(diff.added).toHaveLength(0);
  });

  it('should return empty diff when sets are identical', () => {
    const ids = new Set([makeProjectId('alpha')]);

    const diff = computeDiscoveryDiff(ids, new Set(ids));

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('should return both added and removed when sets differ', () => {
    const known = new Set([makeProjectId('old-project')]);
    const found = new Set([makeProjectId('new-project')]);

    const diff = computeDiscoveryDiff(known, found);

    expect(diff.added).toContain(makeProjectId('new-project'));
    expect(diff.removed).toContain(makeProjectId('old-project'));
  });

  it('should not include projects present in both sets', () => {
    const shared = makeProjectId('shared');
    const known = new Set([shared, makeProjectId('removed')]);
    const found = new Set([shared, makeProjectId('added')]);

    const diff = computeDiscoveryDiff(known, found);

    expect(diff.added).toContain(makeProjectId('added'));
    expect(diff.added).not.toContain(shared);
    expect(diff.removed).toContain(makeProjectId('removed'));
    expect(diff.removed).not.toContain(shared);
  });
});
