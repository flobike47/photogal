import { test, expect } from '../fixtures';

// V3 Navigation desktop · V4 Navigation mobile
test.describe('V3 — Navigation desktop', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop uniquement');

  test('les liens du header mènent aux bonnes pages, sans lien Admin pour un anonyme', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('header nav');
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    await nav.getByRole('button', { name: 'Galerie' }).click();
    await expect(page.locator('#albums')).toBeInViewport();

    await nav.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL('/contact');

    await nav.getByRole('button', { name: 'Accueil' }).click();
    await expect(page).toHaveURL('/');
  });

  test('« Galerie » depuis une autre page revient à l\'accueil sur la section Albums', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('header nav').getByRole('button', { name: 'Galerie' }).click();
    await expect(page).toHaveURL('/#albums');
    await expect(page.locator('#albums')).toBeInViewport();
  });

  test('le logo ramène à l\'accueil', async ({ page }) => {
    await page.goto('/contact');
    await page.locator('header').getByRole('link').first().click();
    await expect(page).toHaveURL('/');
  });
});

test.describe('V4 — Navigation mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile uniquement');

  test('le burger ouvre le menu, et un lien navigue puis referme le menu', async ({ page }) => {
    await page.goto('/');
    // Premier lien « Contact » du DOM = celui du menu overlay (les liens masqués sortent de l'arbre ARIA)
    const overlayContact = page.locator('a[href="/contact"]').filter({ hasText: /^Contact$/ }).first();
    await expect(overlayContact).toBeHidden();

    await page.getByRole('button', { name: 'Menu' }).click();
    await expect(overlayContact).toBeVisible();
    await overlayContact.click();

    await expect(page).toHaveURL('/contact');
    await expect(overlayContact).toBeHidden();
  });

  test('« Galerie » dans le menu fait défiler jusqu\'aux albums', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Galerie' }).click();
    await expect(page.locator('#albums')).toBeInViewport();
  });
});
