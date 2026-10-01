import { test, expect } from '../fixtures';
import { imageSize } from '../helpers/files';

const expectedNames = Array.from({ length: 40 }, (_, i) => `IMG_${String(i + 1).padStart(2, '0')}.jpg`);

// V5 Galerie · V6 Aperçu · V11 Album vide · V12 Lien invalide · V15 Orientation EXIF
test.describe('V5 — Galerie d\'un album', () => {
  test('affiche titre, date, nombre de photos et description', async ({ page }) => {
    await page.goto('/share/demo-mariage');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mariage Julie & Thomas');
    await expect(page.getByText(/\d{2} \S+ \d{4}\s+·\s+40 photos/)).toBeVisible();
    await expect(page.getByText('Album long pour tester le tri, le ZIP et le défilement')).toBeVisible();
  });

  test('les photos sont affichées dans l\'ordre défini par l\'admin', async ({ page }) => {
    await page.goto('/share/demo-mariage');
    const images = page.locator('.pg-photo-card img');
    await expect(images).toHaveCount(40);
    expect(await images.evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt')))).toEqual(expectedNames);
  });

  test('les miniatures se chargent en JPEG', async ({ page }) => {
    const thumbResponse = page.waitForResponse((r) => /\/api\/photos\/[^/]+\/thumb/.test(r.url()));
    await page.goto('/share/demo-mariage');
    const res = await thumbResponse;
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/jpeg');
    const first = page.locator('.pg-photo-card img').first();
    await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('« Retour aux galeries » ramène à l\'accueil', async ({ page }) => {
    await page.goto('/share/demo-mariage');
    await page.getByRole('link', { name: '← Retour aux galeries' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('V6 — Aperçu plein écran', () => {
  test('un clic ouvre l\'original, on passe à la suivante, Échap ferme', async ({ page }) => {
    await page.goto('/share/demo-mariage');
    // Le masque antd (« Aperçu ») recouvre l'image : c'est lui que l'utilisateur clique
    await page.locator('.pg-photo-card').first().getByText('Aperçu').click();

    const preview = page.locator('.ant-image-preview-img');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute('src', /\/api\/photos\/[^/]+\/original$/);
    const firstSrc = await preview.getAttribute('src');

    await page.keyboard.press('ArrowRight');
    await expect(preview).not.toHaveAttribute('src', firstSrc!);

    await page.keyboard.press('Escape');
    await expect(preview).toBeHidden();
  });
});

test.describe('V11 — Album vide', () => {
  test('affiche un état vide sans actions de téléchargement', async ({ page }) => {
    await page.goto('/share/demo-vide');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Album vide');
    await expect(page.getByText('Aucune photo dans cet album')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tout télécharger' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Tout sélectionner' })).toHaveCount(0);
  });
});

test.describe('V12 — Lien de partage invalide', () => {
  test('affiche « Album introuvable » et permet de revenir à l\'accueil', async ({ page }) => {
    await page.goto('/share/lien-inexistant');
    await expect(page.getByRole('heading', { name: 'Album introuvable' })).toBeVisible();
    await page.getByRole('link', { name: 'Retour à l\'accueil' }).click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('V15 — Orientation EXIF', () => {
  test('les photos de téléphone (EXIF 1, 3, 6, 8) ont des miniatures droites, en portrait', async ({ page, request }) => {
    await page.goto('/share/demo-orientation');
    await expect(page.locator('.pg-photo-card img')).toHaveCount(4);

    const { photos } = await (await request.get('/api/albums/share/demo-orientation')).json() as { photos: { id: string }[] };
    for (const photo of photos) {
      const thumb = await request.get(`/api/photos/${photo.id}/thumb`);
      const { width, height } = await imageSize(await thumb.body());
      expect(height, `miniature ${photo.id} (${width}×${height})`).toBeGreaterThan(width);
    }
  });
});
