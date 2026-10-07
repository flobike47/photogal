import { test, expect, adminState } from '../fixtures';
import type { Page, APIRequestContext, Request } from '@playwright/test';
import sharp from 'sharp';
import { reseed } from '../helpers/reseed';
import { fixture, HEIC_FIXTURE, imageSize } from '../helpers/files';

test.use(adminState);
test.afterAll(reseed);

interface Photo {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  share_token: string;
}

const cards = (page: Page) => page.locator('.ant-card-body [style*="grid"] > div');
const card = (page: Page, name: string) => cards(page).filter({ hasText: name });
const names = (page: Page) =>
  cards(page)
    .locator('img')
    .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')));
const albumPhotos = async (api: APIRequestContext, albumId: string) =>
  ((await (await api.get(`/api/albums/${albumId}/photos`)).json()) as { photos: Photo[] }).photos;

async function upload(page: Page, file: string) {
  const done = page.waitForResponse((r) => r.url().includes('/api/photos/upload/') && r.request().method() === 'POST');
  await page.locator('input[type=file]').setInputFiles(file);
  return (await done).json() as Promise<{ photos: Photo[]; skipped: string[] }>;
}

// A11 → A17
test.describe("A11 — Photos d'un album", () => {
  test("affiche le nom, la description, le compteur et les photos dans l'ordre", async ({ page }) => {
    await page.goto('/admin/albums/album-mariage');
    await expect(page.locator('.ant-card-head')).toContainText('Mariage Julie & Thomas');
    await expect(page.locator('.ant-card-head .ant-badge-count')).toHaveText('40');
    await expect(page.getByText('Album long pour tester le tri, le ZIP et le défilement')).toBeVisible();
    await expect(cards(page)).toHaveCount(40);
    expect((await names(page)).slice(0, 3)).toEqual(['IMG_01.jpg', 'IMG_02.jpg', 'IMG_03.jpg']);
  });

  test("un album vide affiche un message d'aide", async ({ page }) => {
    await page.goto('/admin/albums/album-vide');
    await expect(page.getByText('Aucune photo. Utilisez le bouton ci-dessus pour en ajouter.')).toBeVisible();
  });

  test('un album inexistant affiche « Album introuvable »', async ({ page }) => {
    await page.goto('/admin/albums/inexistant');
    await expect(page.getByText('Album introuvable')).toBeVisible();
  });

  test("le fil d'Ariane ramène à la liste", async ({ page }) => {
    await page.goto('/admin/albums/album-mariage');
    await page.locator('.ant-breadcrumb').getByRole('link', { name: 'Albums' }).click();
    await expect(page).toHaveURL('/admin/albums');
  });
});

test.describe('A12 — Upload de photos', () => {
  test('un JPEG apparaît avec sa miniature et incrémente le compteur', async ({ page }) => {
    await page.goto('/admin/albums/album-vide');
    await upload(page, fixture('paysage.jpg'));
    await expect(cards(page)).toHaveCount(1);
    await expect(page.locator('.ant-card-head .ant-badge-count')).toHaveText('1');
    const img = card(page, 'paysage.jpg').locator('img');
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
  });

  test('une photo de téléphone (EXIF orientation 6) a une miniature en portrait', async ({ page, adminApi }) => {
    await page.goto('/admin/albums/album-vide');
    const { photos } = await upload(page, fixture('iphone-exif6.jpg'));
    const thumb = await adminApi.get(`/api/photos/${photos[0].id}/thumb`);
    const { width, height } = await imageSize(await thumb.body());
    expect(height).toBeGreaterThan(width);
  });

  test("un HEIC est converti en JPEG à l'upload", async ({ page, adminApi }) => {
    await page.goto('/admin/albums/album-vide');
    const { photos } = await upload(page, HEIC_FIXTURE);
    expect(photos[0]).toMatchObject({ original_name: 'sample.jpg', mime_type: 'image/jpeg' });
    expect(photos[0].filename).toMatch(/\.jpg$/);
    await expect(card(page, 'sample.jpg')).toBeVisible();

    const original = await adminApi.get(`/api/photos/${photos[0].id}/original`);
    expect(original.headers()['content-type']).toBe('image/jpeg');
    expect(await imageSize(await original.body())).toMatchObject({ format: 'jpeg', width: 1280, height: 854 });
  });
});

test.describe('A12b — Upload en masse', () => {
  test("30 photos partent 3 par 3, la grille n'est rechargée qu'au fil des lots, toutes ont leur miniature", async ({
    page,
    adminApi,
  }) => {
    test.setTimeout(120_000);
    const files = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => ({
        name: `lot_${String(i + 1).padStart(2, '0')}.jpg`,
        mimeType: 'image/jpeg',
        buffer: await sharp({
          create: { width: 1600, height: 1200, channels: 3, background: { r: 40 + i * 5, g: 90, b: 140 } },
        })
          .jpeg()
          .toBuffer(),
      })),
    );

    const isUpload = (r: Request) => r.url().includes('/api/photos/upload/') && r.method() === 'POST';
    // Intervalles mesurés par le navigateur : l'ordre d'arrivée des événements côté test n'est pas fiable
    const uploads: { start: number; end: number }[] = [];
    let listFetches = 0;
    page.on('request', (r) => {
      if (r.url().includes('/api/albums/album-vide/photos')) listFetches++;
    });
    page.on('requestfinished', (r) => {
      if (!isUpload(r)) return;
      const { startTime, responseEnd } = r.timing();
      uploads.push({ start: startTime, end: startTime + responseEnd });
    });

    const before = (await albumPhotos(adminApi, 'album-vide')).length;
    await page.goto('/admin/albums/album-vide');
    await expect(page.locator('.ant-card-head .ant-badge-count')).toHaveText(String(before));
    const fetchesBefore = listFetches;

    await page.locator('input[type=file]').setInputFiles(files);
    const banner = page.getByTestId('upload-progress');
    await expect(banner).toContainText(/Envoi des photos — \d+ \/ 30/);
    await expect(banner.locator('.ant-progress')).toBeVisible();
    await expect(cards(page)).toHaveCount(before + 30, { timeout: 90_000 });
    await expect(page.getByTestId('upload-progress')).toBeHidden();

    expect(uploads).toHaveLength(30);
    const maxInFlight = Math.max(
      ...uploads.map((u) => uploads.filter((o) => o.start <= u.start && u.start < o.end).length),
    );
    expect(maxInFlight).toBeLessThanOrEqual(3);
    // Un rafraîchissement intermédiaire (20 photos) et un final, au lieu d'un par photo
    expect(listFetches - fetchesBefore).toBeLessThanOrEqual(3);

    const uploaded = (await albumPhotos(adminApi, 'album-vide')).filter((p) => p.original_name.startsWith('lot_'));
    expect(uploaded).toHaveLength(30);
    for (const photo of uploaded) {
      const thumb = await adminApi.get(`/api/photos/${photo.id}/thumb`);
      expect(thumb.status()).toBe(200);
      expect(thumb.headers()['content-type']).toBe('image/jpeg');
    }
  });
});

test.describe('A13 — Fichier refusé', () => {
  test("un fichier qui n'est pas une image est signalé et ignoré", async ({ page }) => {
    await page.goto('/admin/albums/album-mariage');
    await expect(cards(page)).toHaveCount(40);
    const { photos, skipped } = await upload(page, fixture('notes.txt'));
    expect(photos).toEqual([]);
    expect(skipped).toEqual(['notes.txt']);
    await expect(page.getByText(/Fichier refusé : notes\.txt/)).toBeVisible();
    await page.reload();
    await expect(cards(page)).toHaveCount(40);
  });
});

test.describe('A14 — Photo de couverture', () => {
  test('la couverture du seed est signalée sur la première photo', async ({ page }) => {
    await page.goto('/admin/albums/album-mariage');
    await expect(cards(page).first().getByText('Couverture', { exact: true })).toBeVisible();
  });

  test("définir une autre photo comme couverture met à jour l'admin et l'accueil", async ({ page, adminApi }) => {
    const target = (await albumPhotos(adminApi, 'album-portfolio-portraits'))[2];
    await page.goto('/admin/albums/album-portfolio-portraits');
    await card(page, target.original_name).locator('button:has(.anticon-star)').click();
    await expect(page.getByText('Photo de couverture définie')).toBeVisible();
    await expect(card(page, target.original_name).getByText('Couverture', { exact: true })).toBeVisible();
    await expect(page.getByText('Couverture', { exact: true })).toHaveCount(1);

    await page.goto('/');
    await expect(
      page.locator('#galleries .pg-album-card').filter({ hasText: 'Portraits' }).locator('img'),
    ).toHaveAttribute('src', new RegExp(`/api/photos/${target.id}/thumb`));
  });
});

test.describe('A15 — Réordonner par glisser-déposer', () => {
  test('le nouvel ordre est conservé après rechargement et visible sur la galerie publique', async ({ page }) => {
    await page.goto('/admin/albums/album-portfolio-portraits');
    await expect(cards(page)).toHaveCount(8);

    const handle = cards(page).nth(0).getByTitle('Déplacer');
    const target = cards(page).nth(2);
    const from = (await handle.boundingBox())!;
    const to = (await target.boundingBox())!;
    const saved = page.waitForResponse((r) => r.url().endsWith('/api/photos/reorder') && r.ok());
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 30, from.y + 10, { steps: 5 }); // dépasse le seuil d'activation (8 px)
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
    await page.mouse.up();
    await saved;

    const expected = ['IMG_02.jpg', 'IMG_03.jpg', 'IMG_01.jpg'];
    expect((await names(page)).slice(0, 3)).toEqual(expected);
    await page.reload();
    await expect(cards(page)).toHaveCount(8);
    expect((await names(page)).slice(0, 3)).toEqual(expected);

    await page.goto('/share/demo-portraits');
    const publicNames = await page
      .locator('.pg-photo-card img')
      .evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')));
    expect(publicNames.slice(0, 3)).toEqual(expected);
  });
});

test.describe("A16 — Lien de téléchargement d'une photo", () => {
  test("copie un lien direct qui télécharge l'original", async ({ page, readClipboard, request }) => {
    await page.goto('/admin/albums/album-mariage');
    await card(page, 'IMG_05.jpg').locator('button:has(.anticon-copy)').click();
    await expect(page.getByText('Lien copié', { exact: true })).toBeVisible();
    const url = await readClipboard();
    expect(url).toMatch(/\/api\/photos\/download\/[\w-]{12}$/);
    const res = await request.get(url);
    expect(res.headers()['content-disposition']).toContain('attachment; filename="IMG_05.jpg"');
  });
});

test.describe('A17 — Supprimer une photo', () => {
  test('après confirmation, la photo disparaît et le compteur diminue', async ({ page, adminApi }) => {
    const photo = (await albumPhotos(adminApi, 'album-mariage')).find((p) => p.original_name === 'IMG_10.jpg')!;
    await page.goto('/admin/albums/album-mariage');
    await card(page, 'IMG_10.jpg').locator('button:has(.anticon-delete)').click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Photo supprimée')).toBeVisible();
    await expect(card(page, 'IMG_10.jpg')).toHaveCount(0);
    await expect(page.locator('.ant-card-head .ant-badge-count')).toHaveText('39');
    expect((await adminApi.get(`/api/photos/${photo.id}/original`)).status()).toBe(404);
  });
});
