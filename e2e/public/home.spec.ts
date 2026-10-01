import { test, expect } from '../fixtures';

// V1 Accueil · V2 Footer · V14 Couverture personnalisée
test.describe('V1 — Accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('le hero affiche le titre et le sous-titre configurés, et le CTA mène aux galeries', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Environnement de test');
    await expect(page.getByText('Données générées par npm run seed')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Découvrir les galeries' })).toHaveAttribute('href', '#galleries');
  });

  test('la section À propos affiche image, titre, texte et lien Contact', async ({ page }) => {
    await expect(page.getByRole('img', { name: 'portrait', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'À propos' })).toBeVisible();
    await expect(page.getByText('Photographe fictif.')).toBeVisible();
    await page.getByRole('link', { name: 'Me contacter' }).click();
    await expect(page).toHaveURL('/contact');
  });

  test('le portfolio liste uniquement les albums publics marqués portfolio', async ({ page }) => {
    const portfolio = page.locator('#galleries .pg-album-card');
    await expect(portfolio).toHaveCount(2);
    await expect(portfolio.filter({ hasText: 'Portraits' })).toContainText('8 photos');
    await expect(portfolio.filter({ hasText: 'Paysages' })).toContainText('8 photos');
    await expect(portfolio.filter({ hasText: 'Portraits' })).toHaveAttribute('href', '/share/demo-portraits');
    // Couverture = miniature de la première photo
    await expect(portfolio.first().locator('img')).toHaveJSProperty('complete', true);
    expect(await portfolio.first().locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test('la section Albums distingue albums publics, protégés par mot de passe et sur invitation', async ({ page }) => {
    const albums = page.locator('#albums .pg-album-card');
    await expect(albums).toHaveCount(7);

    const mariage = albums.filter({ hasText: 'Mariage Julie & Thomas' });
    await expect(mariage).toContainText('40 photos');
    await expect(mariage).toHaveAttribute('href', '/share/demo-mariage');

    const protege = albums.filter({ hasText: 'Séance privée' });
    await expect(protege).toContainText('Protégé par mot de passe');
    await expect(protege).toContainText('Entrer le mot de passe');

    const invitation = albums.filter({ hasText: 'Famille Martin' });
    await expect(invitation).toContainText('Accès sur invitation');
    await expect(invitation).not.toHaveAttribute('href', /.*/);
    await invitation.click();
    await expect(page).toHaveURL('/');

    // Les albums portfolio ne sont pas dupliqués dans la section Albums
    await expect(albums.filter({ hasText: 'Portraits' })).toHaveCount(0);
  });

  test('V14 — la carte d\'un album à couverture personnalisée utilise cette image', async ({ page }) => {
    const card = page.locator('#albums .pg-album-card').filter({ hasText: 'Événement' });
    await expect(card.locator('img')).toHaveAttribute('src', '/api/albums/album-couverture/cover');
  });

  test('le CTA du bas mène à la page contact', async ({ page }) => {
    await page.getByRole('link', { name: 'Nous contacter' }).click();
    await expect(page).toHaveURL('/contact');
  });
});

test.describe('V2 — Footer', () => {
  test('affiche identité, navigation, réseaux renseignés, email et mentions', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toContainText('PhotoGal Dev');
    await expect(footer).toContainText('Partagez vos plus belles photos');
    await expect(footer.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    await expect(footer.getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/contact');
    await expect(footer.getByRole('link', { name: 'Instagram' })).toHaveAttribute('href', 'https://instagram.com/photogal');
    await expect(footer.getByRole('link', { name: 'Site web' })).toHaveAttribute('href', 'https://example.com');
    await expect(footer.getByRole('link', { name: 'Facebook' })).toHaveCount(0);
    await expect(footer.getByRole('link', { name: 'contact@photogal.test' })).toHaveAttribute('href', 'mailto:contact@photogal.test');
    await expect(footer).toContainText('© 2024 PhotoGal');
  });
});
