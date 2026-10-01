import { test, expect, adminState } from '../fixtures';
import type { Page } from '@playwright/test';
import { reseed } from '../helpers/reseed';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../helpers/auth';

test.use(adminState);
// Le changement de mot de passe invalide la session partagée : le seed la rétablit
// (admin à id fixe, session_version 0, mot de passe du .env).
test.afterAll(reseed);

const NEW_PASSWORD = 'nouveau-mdp-e2e';

async function fillPasswordForm(page: Page, current: string, next: string, confirm = next) {
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name: 'Sécurité' }).click();
  await page.getByLabel('Mot de passe actuel').fill(current);
  await page.getByLabel('Nouveau mot de passe').fill(next);
  await page.getByLabel('Confirmer').fill(confirm);
  await page.getByRole('button', { name: 'Modifier le mot de passe' }).click();
}

// A26 Sécurité
test.describe('A26 — Changement du mot de passe admin', () => {
  test('un mot de passe actuel erroné est refusé', async ({ page }) => {
    await fillPasswordForm(page, 'pas-le-bon', NEW_PASSWORD);
    await expect(page.getByText('Mot de passe actuel incorrect')).toBeVisible();
  });

  test('une confirmation différente est refusée sans appel à l\'API', async ({ page }) => {
    let called = false;
    page.on('request', (r) => { if (r.url().endsWith('/api/auth/password')) called = true; });
    await fillPasswordForm(page, ADMIN_PASSWORD, NEW_PASSWORD, 'autre-chose');
    await expect(page.getByText('Les mots de passe ne correspondent pas')).toBeVisible();
    expect(called).toBe(false);
  });

  test('un nouveau mot de passe trop court est signalé dans le formulaire', async ({ page }) => {
    test.fail(true, 'Bug connu : le front accepte 6 caractères, l\'API en exige 8 et répond « Mot de passe actuel incorrect »');
    await fillPasswordForm(page, ADMIN_PASSWORD, 'abc1234');
    await expect(page.getByText(/8 caractères/)).toBeVisible();
  });

  test('un changement réussi invalide les sessions et seul le nouveau mot de passe fonctionne', async ({ page, adminApi, playwright, baseURL }) => {
    await fillPasswordForm(page, ADMIN_PASSWORD, NEW_PASSWORD);
    await expect(page.getByText('Mot de passe modifié')).toBeVisible();

    expect((await adminApi.get('/api/auth/me')).status()).toBe(401);

    const api = await playwright.request.newContext({ baseURL });
    const login = (password: string) => api.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password } });
    expect((await login(ADMIN_PASSWORD)).status()).toBe(401);
    expect((await login(NEW_PASSWORD)).status()).toBe(200);
    expect((await api.get('/api/auth/me')).status()).toBe(200);
    await api.dispose();
  });
});
