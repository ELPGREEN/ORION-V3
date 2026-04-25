import { test, expect } from '@playwright/test';

test('verify maestro status widget on dashboard', async ({ page }) => {
  await page.goto('http://localhost:8080/dashboard');
  // Check if MaestroStatusWidget is visible
  // It should have some text like "Maestro" or "Neural"
  await expect(page.locator('body')).toContainText('Maestro');
  await page.screenshot({ path: 'dashboard_maestro.png' });
});

test('verify maestro marketplace insights', async ({ page }) => {
  await page.goto('http://localhost:8080/marketplace');
  await expect(page.locator('body')).toContainText('Maestro');
  await page.screenshot({ path: 'marketplace_maestro.png' });
});
