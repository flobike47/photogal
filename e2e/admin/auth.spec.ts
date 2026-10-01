import { test, expect, adminState } from '../fixtures';
import { ADMIN_EMAIL } from '../helpers/auth';

// A1 Protection · A2 Session · A3 Déconnexion
test.describe('A1 — Accès protégé', () => {
  test('sans session, /admin redirige vers la page de connexion', async ({ page }) => {
    await page.goto('/admin/albums');
    await expect(page).toHaveURL('/admin/login');
    await expect(page.getByText('PhotoGal Dev')).toBeVisible();
    await expect(page.getByText('Espace administration')).toBeVisible();
  });
});

test.describe('A2 — Session admin', () => {
  test.use(adminState);

  test('/admin ouvre la liste des albums avec l\'email, les messages non lus et le stockage', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/albums');
    await expect(page.locator('.ant-layout-header')).toContainText(ADMIN_EMAIL);
    await expect(page.locator('.ant-menu').locator('.ant-badge-count')).toHaveText('3');
    await expect(page.getByText(/Stockage · \d+ Mo \/ 10 Go/)).toBeVisible();
  });

  test('« Voir le site » ramène au site public', async ({ page }) => {
    await page.goto('/admin/albums');
    await page.getByRole('link', { name: 'Voir le site' }).click();
    await expect(page).toHaveURL('/');
  });

  test('la page de connexion redirige un admin déjà connecté', async ({ page }) => {
    await page.goto('/admin/albums');
    await expect(page.getByText('Albums').first()).toBeVisible();
    await page.goto('/admin/login');
    await expect(page).toHaveURL('/admin/albums');
  });

  test('le menu mène aux trois sections', async ({ page }) => {
    await page.goto('/admin/albums');
    await page.locator('.ant-menu').getByRole('link', { name: 'Messages' }).click();
    await expect(page).toHaveURL('/admin/messages');
    await page.locator('.ant-menu').getByRole('link', { name: 'Paramètres' }).click();
    await expect(page).toHaveURL('/admin/settings');
    await page.locator('.ant-menu').getByRole('link', { name: 'Albums' }).click();
    await expect(page).toHaveURL('/admin/albums');
  });
});

test.describe('A3 — Déconnexion', () => {
  test.use(adminState);

  test('« Déconnexion » renvoie au login, et /admin redemande la connexion', async ({ page }) => {
    await page.goto('/admin/albums');
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL('/admin/login');
    await page.goto('/admin/albums');
    await expect(page).toHaveURL('/admin/login');
  });
});
