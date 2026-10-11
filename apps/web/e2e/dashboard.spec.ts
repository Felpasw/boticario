import { expect, test } from './fixtures';

test.describe('dashboard', () => {
  test('renders KPIs, heatmap, dwell distribution and top recurring devices', async ({
    authenticatedPage: page,
  }) => {
    const kpiList = page.getByRole('list', { name: /métricas da loja/i });
    await expect(kpiList).toBeVisible();
    await expect(kpiList.getByRole('listitem')).toHaveCount(4);
    await expect(page.getByText(/visitas/i).first()).toBeVisible();
    await expect(page.getByText(/dwell mediano/i)).toBeVisible();

    await expect(page.getByRole('heading', { name: /heatmap/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /dwell em faixas/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /top dispositivos recorrentes/i })).toBeVisible();
  });

  test('updates the URL and keeps the KPIs when switching to the 7d shortcut', async ({
    authenticatedPage: page,
  }) => {
    await page.getByRole('button', { name: /7 dias/i }).click();
    await expect(page).toHaveURL(/shortcut=7d/);
    await expect(page.getByRole('list', { name: /métricas da loja/i })).toBeVisible();
  });
});
