import { test, expect, adminState } from '../fixtures';
import type { Page } from '@playwright/test';
import { reseed } from '../helpers/reseed';
import { fixture } from '../helpers/files';

test.use(adminState);
test.afterAll(reseed);

const row = (page: Page, name: string) => page.locator('.ant-table-tbody tr').filter({ hasText: name });
const rowAction = (page: Page, name: string, icon: string) => row(page, name).locator(`button:has(.anticon-${icon})`);
const popconfirm = (page: Page) => page.locator('.ant-popconfirm');
const modal = (page: Page) => page.getByRole('dialog');

async function albumByName(adminApi: import('@playwright/test').APIRequestContext, name: string) {
  const { albums } = await (await adminApi.get('/api/albums')).json() as { albums: { id: string; name: string; share_token: string }[] };
  const album = albums.find((a) => a.name === name);
  if (!album) throw new Error(`Album « ${name} » introuvable`);
  return (await (await adminApi.get(`/api/albums/${album.id}`)).json()) as Record<string, unknown> & { id: string; share_token: string; allowed_emails: string[] };
}

// A4 → A10
test.describe('A4 — Liste des albums', () => {
  test('affiche les 9 albums du seed avec nombre de photos et statut', async ({ page }) => {
    await page.goto('/admin/albums');
    await expect(page.locator('.ant-table-tbody tr')).toHaveCount(9);
    await expect(row(page, 'Mariage Julie & Thomas')).toContainText('40');
    await expect(row(page, 'Mariage Julie & Thomas')).toContainText('Public');
    await expect(row(page, 'Séance privée')).toContainText('Privé');
    await expect(page.locator('.ant-table-tbody').getByText('Privé', { exact: true })).toHaveCount(2);
  });

  test('le nom de l\'album et l\'icône photos mènent à la gestion des photos', async ({ page }) => {
    await page.goto('/admin/albums');
    await row(page, 'Mariage Julie & Thomas').getByRole('link', { name: 'Mariage Julie & Thomas' }).click();
    await expect(page).toHaveURL('/admin/albums/album-mariage');
    await page.goBack();
    await rowAction(page, 'Paysages', 'picture').click();
    await expect(page).toHaveURL('/admin/albums/album-portfolio-paysages');
  });
});

test.describe('A5 — Créer un album', () => {
  test('le nom est obligatoire', async ({ page }) => {
    await page.goto('/admin/albums');
    await page.getByRole('button', { name: 'Nouvel album' }).click();
    await modal(page).getByRole('button', { name: 'Créer' }).click();
    await expect(modal(page).getByText('Nom requis')).toBeVisible();
  });

  test('un album public est créé avec ses options et apparaît dans la section Albums', async ({ page, adminApi }) => {
    await page.goto('/admin/albums');
    await page.getByRole('button', { name: 'Nouvel album' }).click();
    await modal(page).getByLabel('Nom').fill('E2E Public');
    await modal(page).getByLabel('Description').fill('Créé par les tests');
    await modal(page).getByRole('switch', { name: 'Téléchargeable' }).click(); // → non
    await modal(page).getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByText('Album créé')).toBeVisible();
    await expect(row(page, 'E2E Public')).toContainText('Public');

    const album = await albumByName(adminApi, 'E2E Public');
    expect(album).toMatchObject({ description: 'Créé par les tests', is_public: 1, is_downloadable: 0, is_portfolio: 0 });

    await page.goto('/');
    await expect(page.locator('#albums .pg-album-card').filter({ hasText: 'E2E Public' })).toHaveAttribute('href', `/share/${album.share_token}`);
  });

  test('un album portfolio apparaît dans le portfolio', async ({ page }) => {
    await page.goto('/admin/albums');
    await page.getByRole('button', { name: 'Nouvel album' }).click();
    await modal(page).getByLabel('Nom').fill('E2E Portfolio');
    await modal(page).getByRole('switch', { name: 'Afficher dans le Portfolio' }).click();
    await modal(page).getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByText('Album créé')).toBeVisible();

    await page.goto('/');
    await expect(page.locator('#galleries .pg-album-card').filter({ hasText: 'E2E Portfolio' })).toBeVisible();
    await expect(page.locator('#albums .pg-album-card').filter({ hasText: 'E2E Portfolio' })).toHaveCount(0);
  });

  test('un album privé avec mot de passe et emails autorisés est accessible par ces deux moyens', async ({ page, adminApi, request }) => {
    await page.goto('/admin/albums');
    await page.getByRole('button', { name: 'Nouvel album' }).click();
    await modal(page).getByLabel('Nom').fill('E2E Privé');
    await modal(page).getByRole('switch', { name: 'Visible publiquement' }).click(); // → privé
    await modal(page).getByLabel('Mot de passe d\'accès').fill('secret-e2e');
    const emails = modal(page).getByLabel('Accès par email');
    await emails.fill('Ami@Example.com');
    await emails.press('Enter');
    await modal(page).getByRole('button', { name: 'Créer' }).click();
    await expect(page.getByText('Album créé')).toBeVisible();
    await expect(row(page, 'E2E Privé')).toContainText('Privé');

    const album = await albumByName(adminApi, 'E2E Privé');
    expect(album.is_public).toBe(0);
    expect(album.allowed_emails).toEqual(['ami@example.com']); // normalisé
    const unlock = await request.post(`/api/albums/${album.id}/unlock`, { data: { password: 'secret-e2e' } });
    expect(await unlock.json()).toEqual({ share_token: album.share_token });

    await page.goto('/');
    await expect(page.locator('#albums .pg-album-card').filter({ hasText: 'E2E Privé' })).toContainText('Protégé par mot de passe');
  });
});

test.describe('A6 — Modifier un album', () => {
  test('renommer un album et le passer en portfolio le déplace sur l\'accueil', async ({ page }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Épreuves', 'edit').click();
    await expect(modal(page).getByLabel('Nom')).toHaveValue('Épreuves (non téléchargeable)');
    await modal(page).getByLabel('Nom').fill('Épreuves renommées');
    await modal(page).getByRole('switch', { name: 'Afficher dans le Portfolio' }).click();
    await modal(page).getByRole('button', { name: 'Mettre à jour' }).click();
    await expect(page.getByText('Album mis à jour')).toBeVisible();
    await expect(row(page, 'Épreuves renommées')).toBeVisible();

    await page.goto('/');
    await expect(page.locator('#galleries .pg-album-card').filter({ hasText: 'Épreuves renommées' })).toBeVisible();
  });

  test('la modale reprend les options et les emails existants', async ({ page }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Famille Martin', 'edit').click();
    await expect(modal(page).getByRole('switch', { name: 'Visible publiquement' })).not.toBeChecked();
    await expect(modal(page).getByText('client@example.com')).toBeVisible();
  });

  test('modifier un album protégé sans toucher au mot de passe le conserve', async ({ page, request }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Séance privée', 'edit').click();
    await modal(page).getByLabel('Description').fill('Description modifiée');
    await modal(page).getByRole('button', { name: 'Mettre à jour' }).click();
    await expect(page.getByText('Album mis à jour')).toBeVisible();

    const unlock = await request.post('/api/albums/album-prive-mdp/unlock', { data: { password: 'test1234' } });
    expect(unlock.status()).toBe(200);
  });

  test('changer puis retirer le mot de passe d\'un album', async ({ page, request }) => {
    const unlock = (password: string) => request.post('/api/albums/album-prive-mdp/unlock', { data: { password } });
    await page.goto('/admin/albums');
    await rowAction(page, 'Séance privée', 'edit').click();
    await expect(modal(page).getByPlaceholder('Inchangé')).toBeVisible();
    await modal(page).getByLabel('Mot de passe d\'accès').fill('nouveau-mdp');
    await modal(page).getByRole('button', { name: 'Mettre à jour' }).click();
    await expect(page.getByText('Album mis à jour')).toBeVisible();
    expect((await unlock('test1234')).status()).toBe(401);
    expect((await unlock('nouveau-mdp')).status()).toBe(200);

    await rowAction(page, 'Séance privée', 'edit').click();
    await modal(page).getByRole('checkbox', { name: 'Retirer le mot de passe' }).check();
    await modal(page).getByRole('button', { name: 'Mettre à jour' }).click();
    await expect(page.getByText('Album mis à jour').last()).toBeVisible();
    expect((await unlock('nouveau-mdp')).status()).toBe(400); // plus de mot de passe

    await page.goto('/');
    await expect(page.locator('#albums .pg-album-card').filter({ hasText: 'Séance privée' })).toContainText('Accès sur invitation');
  });
});

test.describe('A7 — Couverture indépendante', () => {
  test('l\'image uploadée dans la modale devient la couverture de la carte', async ({ page, adminApi }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Mariage Julie & Thomas', 'edit').click();
    await modal(page).locator('input[type=file]').setInputFiles(fixture('couverture.png'));
    await expect(page.getByText('Couverture mise à jour')).toBeVisible();
    await expect(modal(page).getByRole('img', { name: 'couverture' })).toBeVisible();

    const album = await albumByName(adminApi, 'Mariage Julie & Thomas');
    expect(album.cover_url).toBe('/api/albums/album-mariage/cover');
    const cover = await adminApi.get('/api/albums/album-mariage/cover');
    expect(cover.headers()['content-type']).toBe('image/png');

    await page.goto('/');
    await expect(page.locator('#albums .pg-album-card').filter({ hasText: 'Mariage' }).locator('img'))
      .toHaveAttribute('src', '/api/albums/album-mariage/cover');
  });
});

test.describe('A8 — Copier le lien de partage', () => {
  test('copie l\'URL publique de l\'album', async ({ page, readClipboard }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Paysages', 'link').click();
    await expect(page.getByText('Lien copié dans le presse-papiers')).toBeVisible();
    expect(await readClipboard()).toBe(`${new URL(page.url()).origin}/share/demo-paysages`);
  });
});

test.describe('A9 — Régénérer le lien', () => {
  test('l\'ancien lien ne fonctionne plus, le nouveau est copié et fonctionne', async ({ page, readClipboard }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Portraits', 'reload').click();
    await expect(popconfirm(page)).toContainText('L\'ancien lien ne fonctionnera plus.');
    await popconfirm(page).getByRole('button', { name: 'Oui' }).click();
    await expect(page.getByText('Nouveau lien généré et copié !')).toBeVisible();

    const newUrl = await readClipboard();
    expect(newUrl).toMatch(/\/share\/[\w-]{12}$/);
    expect(newUrl).not.toContain('demo-portraits');

    await page.goto('/share/demo-portraits');
    await expect(page.getByRole('heading', { name: 'Album introuvable' })).toBeVisible();
    await page.goto(newUrl);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portraits');
  });
});

test.describe('A10 — Supprimer un album', () => {
  test('après confirmation, l\'album, son lien et ses photos disparaissent', async ({ page, adminApi }) => {
    const { photos } = await (await adminApi.get('/api/albums/album-portfolio-paysages/photos')).json() as { photos: { id: string }[] };
    expect(photos.length).toBe(8);

    await page.goto('/admin/albums');
    await rowAction(page, 'Paysages', 'delete').click();
    await expect(popconfirm(page)).toContainText('Toutes les photos seront également supprimées.');
    await popconfirm(page).getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Album supprimé')).toBeVisible();
    await expect(row(page, 'Paysages')).toHaveCount(0);

    expect((await adminApi.get('/api/albums/share/demo-paysages')).status()).toBe(404);
    expect((await adminApi.get(`/api/photos/${photos[0].id}/original`)).status()).toBe(404);
    expect((await adminApi.get(`/api/photos/${photos[0].id}/thumb`)).status()).toBe(404);
  });

  test('« Annuler » dans la confirmation ne supprime rien', async ({ page }) => {
    await page.goto('/admin/albums');
    await rowAction(page, 'Album vide', 'delete').click();
    await popconfirm(page).getByRole('button', { name: 'Annuler' }).click();
    await expect(row(page, 'Album vide')).toBeVisible();
  });
});
