import { test, expect } from '../fixtures';
import type { Download } from '@playwright/test';
import { readFile } from 'fs/promises';
import { zipEntries } from '../helpers/files';

const readDownload = async (download: Download) => readFile((await download.path())!);

// V7 Sélection et ZIP · V8 Tout télécharger · V9 Photo unitaire · V10 Album non téléchargeable
test.describe('V7 — Sélection de photos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/share/demo-mariage');
    await expect(page.locator('.pg-photo-card')).toHaveCount(40);
  });

  const checkbox = (page: import('@playwright/test').Page, index: number) =>
    page.locator('.pg-photo-card').nth(index).locator('> div:not(.ant-image)');

  test('cocher des photos affiche la barre de sélection, « Annuler » la vide', async ({ page }) => {
    await checkbox(page, 0).click();
    await checkbox(page, 3).click();
    await expect(page.getByText('2 photos sélectionnées')).toBeVisible();

    await checkbox(page, 3).click();
    await expect(page.getByText('1 photo sélectionnée')).toBeVisible();

    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByText(/sélectionnée/)).toBeHidden();
  });

  test('« Tout sélectionner » sélectionne les 40 photos, puis « Tout désélectionner »', async ({ page }) => {
    await page.getByRole('button', { name: 'Tout sélectionner' }).click();
    await expect(page.getByText('40 photos sélectionnées')).toBeVisible();
    await page.getByRole('button', { name: 'Tout désélectionner' }).click();
    await expect(page.getByText(/sélectionnée/)).toBeHidden();
  });

  test('« Télécharger la sélection » produit un ZIP contenant exactement les photos choisies', async ({ page }) => {
    await checkbox(page, 0).click();
    await checkbox(page, 1).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger la sélection' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('selection.zip');
    expect(zipEntries(await readDownload(download)).sort()).toEqual(['IMG_01.jpg', 'IMG_02.jpg']);
  });

  test("tout sélectionner puis télécharger donne le ZIP de l'album complet (sans limite de nombre)", async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Tout sélectionner' }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Télécharger la sélection' }).click();
    const download = await downloadPromise;
    expect(decodeURIComponent(download.suggestedFilename())).toBe('Mariage Julie & Thomas.zip');
    expect(zipEntries(await readDownload(download))).toHaveLength(40);
  });
});

test.describe('V8 — Tout télécharger', () => {
  test("produit un ZIP de toutes les photos de l'album, avec leurs noms d'origine", async ({ page }) => {
    await page.goto('/share/demo-mariage');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Tout télécharger' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.zip$/);
    const names = zipEntries(await readDownload(download));
    expect(names).toHaveLength(40);
    expect(names).toContain('IMG_01.jpg');
    expect(names).toContain('IMG_40.jpg');
  });
});

test.describe('V9 — Télécharger une photo', () => {
  test("le bouton « Télécharger » au survol renvoie l'original avec son nom", async ({ page }) => {
    await page.goto('/share/demo-mariage');
    const card = page.locator('.pg-photo-card').first();
    await card.hover();
    const downloadPromise = page.waitForEvent('download');
    await card.getByRole('button', { name: 'Télécharger' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('IMG_01.jpg');
    expect((await readDownload(download)).subarray(0, 2).toString('hex')).toBe('ffd8'); // JPEG
  });
});

test.describe('V10 — Album non téléchargeable', () => {
  test("aucune action de téléchargement n'est proposée", async ({ page }) => {
    await page.goto('/share/demo-non-telechargeable');
    await expect(page.locator('.pg-photo-card')).toHaveCount(5);
    await expect(page.locator('.pg-photo-card > div:not(.ant-image)')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tout télécharger' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tout sélectionner' })).toHaveCount(0);
    await expect(page.getByText("Survolez une photo pour l'apercevoir")).toBeVisible();

    await page.locator('.pg-photo-card').first().hover();
    await expect(page.locator('.pg-photo-card').first().getByRole('button', { name: 'Télécharger' })).toHaveCount(0);
  });

  test("le ZIP de l'album est refusé par l'API", async ({ request }) => {
    const res = await request.get('/api/albums/share/demo-non-telechargeable/download');
    expect(res.status()).toBe(403);
  });
});
