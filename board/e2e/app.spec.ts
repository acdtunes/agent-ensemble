import { test, expect } from '@playwright/test';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test.describe('Project Dashboard', () => {
  let testProjectDir: string;

  test.beforeAll(async () => {
    // Create a temp project with a feature roadmap
    testProjectDir = await mkdtemp(join(tmpdir(), 'e2e-project-'));
    const featureDir = join(testProjectDir, 'docs', 'feature', 'test-feature');
    await mkdir(featureDir, { recursive: true });

    await writeFile(
      join(featureDir, 'roadmap.yaml'),
      `roadmap:
  name: Test Feature
  description: E2E test feature

phases:
  - id: phase-01
    name: Setup
    steps:
      - id: 01-01
        description: First step
        status: done
      - id: 01-02
        description: Second step
        status: in-progress
`,
    );
  });

  test.afterAll(async () => {
    if (testProjectDir) {
      await rm(testProjectDir, { recursive: true, force: true });
    }
  });

  test('loads the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Agent Ensemble');
  });

  test('API returns projects list', async ({ request }) => {
    const response = await request.get('/api/projects');
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('can add a project and see its features', async ({ page }) => {
    await page.goto('/');

    // Add project
    await page.getByRole('button', { name: /add project/i }).click();
    await page.getByPlaceholder('/path/to/project').fill(testProjectDir);
    await page.getByRole('button', { name: /^add$/i }).click();

    // Project appears in list
    const projectName = testProjectDir.split('/').pop()!;
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 5000 });

    // Click project to see features
    await page.getByText(projectName).click();
    await expect(page.getByText('test-feature')).toBeVisible({ timeout: 5000 });
  });
});
