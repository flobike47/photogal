import { test, expect } from '../fixtures';
import { reseed } from '../helpers/reseed';

test.afterAll(reseed); // un album est créé pour le test de limite d'essais

// V13 Album privé avec mot de passe
test.describe('V13 — Album privé protégé par mot de passe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#albums .pg-album-card').filter({ hasText: 'Séance privée' }).click();
  });

  test('la carte ouvre une modale de mot de passe, « Annuler » la ferme', async ({ page }) => {
    const modal = page.getByRole('dialog');
    await expect(modal).toContainText('Séance privée (mot de passe)');
    await expect(modal).toContainText('Cet album est protégé');
    await modal.getByRole('button', { name: 'Annuler' }).click();
    await expect(modal).toBeHidden();
    await expect(page).toHaveURL('/');
  });

  test('un mauvais mot de passe affiche une erreur et reste sur l\'accueil', async ({ page }) => {
    await page.getByPlaceholder('Mot de passe').fill('mauvais');
    await page.getByRole('button', { name: 'Accéder' }).click();
    await expect(page.getByText('Mot de passe incorrect')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('le bon mot de passe ouvre la galerie', async ({ page }) => {
    await page.getByPlaceholder('Mot de passe').fill('test1234');
    await page.getByRole('button', { name: 'Accéder' }).click();
    await expect(page).toHaveURL('/share/demo-prive-mdp');
    await expect(page.locator('.pg-photo-card')).toHaveCount(6);
  });

  test('les espaces autour du mot de passe sont ignorés et Entrée valide', async ({ page }) => {
    await page.getByPlaceholder('Mot de passe').fill('  test1234  ');
    await page.getByPlaceholder('Mot de passe').press('Enter');
    await expect(page).toHaveURL('/share/demo-prive-mdp');
  });
});

test.describe('V13 — Protection de /unlock', () => {
  test('une requête sans mot de passe est rejetée proprement (400)', async ({ request }) => {
    const res = await request.post('/api/albums/album-prive-mdp/unlock', { data: {} });
    expect(res.status()).toBe(400);
  });

  // Album dédié : le blocage (15 min, en mémoire) ne doit pas gêner les autres tests ni les runs suivants
  test('après 10 échecs, l\'album est bloqué pour ce client, même avec le bon mot de passe (429)', async ({ request, adminApi }) => {
    const created = await adminApi.post('/api/albums', { data: { name: `E2E rate limit ${Date.now()}`, is_public: false, password: 'le-bon' } });
    const { id } = await created.json();
    const unlock = (password: string) => request.post(`/api/albums/${id}/unlock`, { data: { password } });

    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) statuses.push((await unlock(`essai-${i}`)).status());
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(statuses[10]).toBe(429);
    expect((await unlock('le-bon')).status()).toBe(429);
  });
});
