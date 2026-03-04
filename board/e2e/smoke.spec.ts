import { test, expect } from '@playwright/test';

test.describe('Dashboard Smoke Tests', () => {
  test('homepage loads and renders React app', async ({ page }) => {
    await page.goto('/');

    // Should show the main heading
    await expect(page.locator('h1')).toContainText('Agent Ensemble');

    // Should have the "Add Project" button
    await expect(page.getByRole('button', { name: /add project/i })).toBeVisible();
  });

  test('API /api/projects responds with array', async ({ request }) => {
    const response = await request.get('/api/projects');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('can click Add Project and see path input', async ({ page }) => {
    await page.goto('/');

    // Click Add Project button
    await page.getByRole('button', { name: /add project/i }).click();

    // Path input field should appear
    await expect(page.getByPlaceholder('/path/to/project')).toBeVisible();
  });

  test('app is interactive with buttons', async ({ page }) => {
    await page.goto('/');

    // The app should be interactive (no crash, no blank screen)
    const body = await page.locator('body');
    await expect(body).not.toBeEmpty();

    // Should have some interactive elements
    const buttons = await page.getByRole('button').count();
    expect(buttons).toBeGreaterThan(0);
  });
});
