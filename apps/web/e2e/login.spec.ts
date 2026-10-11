import { expect, test } from '@playwright/test';

import { ADMIN_EMAIL, ADMIN_PASSWORD } from './fixtures';

test.describe('login flow', () => {
  test('rejects invalid credentials and shows the server error', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/e-mail/i).fill('wrong@boticario.local');
    await page.getByLabel(/senha/i).fill('not-the-password');
    await page.getByRole('button', { name: /entrar/i }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('authenticates the admin and redirects to the dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/e-mail/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/senha/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    await page.waitForURL('**/dashboard');
    await expect(page.getByRole('heading', { name: /painel da loja/i })).toBeVisible();
  });
});
