import { test, expect } from '../fixtures';

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

test.describe('V13 — Protection de /unlock (bugs connus)', () => {
  test('une requête sans mot de passe est rejetée proprement (400)', async ({ request }) => {
    test.fail(true, 'Bug connu : pas de schéma sur /unlock → TypeError → 500');
    const res = await request.post('/api/albums/album-prive-mdp/unlock', { data: {} });
    expect(res.status()).toBe(400);
  });

  // En dernier : un futur rate limit bloquerait les tests suivants de ce fichier
  test('les essais répétés sont limités (429)', async ({ request }) => {
    test.fail(true, 'Bug connu : pas de rate limit, le mot de passe peut être brute-forcé');
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      statuses.push((await request.post('/api/albums/album-prive-mdp/unlock', { data: { password: `essai-${i}` } })).status());
    }
    expect(statuses).toContain(429);
  });
});
