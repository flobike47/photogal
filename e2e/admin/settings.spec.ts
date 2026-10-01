import { test, expect, adminState } from '../fixtures';
import type { Page, APIRequestContext } from '@playwright/test';
import { reseed } from '../helpers/reseed';
import { fixture, imageSize } from '../helpers/files';

test.use(adminState);
test.afterAll(reseed);

const pane = (page: Page) => page.locator('.ant-tabs-tabpane-active');
const editor = (page: Page, index: number) => pane(page).locator('.ProseMirror').nth(index);
const getConfig = async (api: APIRequestContext) => (await api.get('/api/config')).json() as Promise<Record<string, string>>;

async function openTab(page: Page, name: string) {
  await page.goto('/admin/settings');
  await page.getByRole('tab', { name }).click();
}

async function replaceRichText(page: Page, index: number, text: string) {
  await editor(page, index).click();
  await page.keyboard.press('ControlOrMeta+a');
  if (text) await page.keyboard.type(text);
  else await page.keyboard.press('Backspace');
}

async function save(page: Page, buttonName: string) {
  const done = page.waitForResponse((r) => r.url().endsWith('/api/config') && r.request().method() === 'PUT');
  // Le nom accessible inclut l'icône (« save Sauvegarder ») : on ancre sur la fin du libellé
  const label = new RegExp(`${buttonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  await pane(page).getByRole('button', { name: label }).click();
  const res = await done;
  expect(res.ok()).toBeTruthy();
  await expect(page.getByText('Sauvegardé').last()).toBeVisible();
}

async function pickColor(page: Page, hex: string) {
  await pane(page).locator('.ant-color-picker-trigger').first().click();
  const input = page.locator('.ant-color-picker-input input').last();
  await input.fill(hex);
  await input.press('Enter');
  await page.keyboard.press('Escape');
}

// A19 → A25
test.describe('A19 — Identité', () => {
  test('le nom du site, l\'email de contact et le footer sont repris partout', async ({ page, browser }) => {
    await openTab(page, 'Identité');
    await pane(page).getByLabel('Nom du site').fill('Studio E2E');
    await pane(page).getByLabel('Email de contact').fill('hello@studio-e2e.test');
    await replaceRichText(page, 1, '© Studio E2E');
    await save(page, 'Sauvegarder');
    await expect(page.locator('.ant-layout-sider')).toContainText('Studio E2E');

    await page.goto('/');
    await expect(page.locator('header')).toContainText('Studio E2E');
    await expect(page.locator('footer').getByRole('link', { name: 'hello@studio-e2e.test' })).toHaveAttribute('href', 'mailto:hello@studio-e2e.test');
    await expect(page.locator('footer')).toContainText('© Studio E2E');

    const anonymous = await browser.newPage();
    await anonymous.goto('/admin/login');
    await expect(anonymous.getByText('Studio E2E')).toBeVisible();
    await anonymous.close();
  });

  test('A24 — le logo uploadé s\'affiche dans les headers public et admin', async ({ page, request }) => {
    await openTab(page, 'Identité');
    await pane(page).locator('input[type=file]').setInputFiles(fixture('couverture.png'));
    await expect(page.getByText('Logo mise à jour')).toBeVisible();
    await expect(page.locator('.ant-layout-sider').getByRole('img', { name: 'logo' })).toBeVisible();

    const asset = await request.get('/api/config/asset/logo');
    expect(await imageSize(await asset.body())).toMatchObject({ format: 'png', width: 600, height: 800 });
    await page.goto('/');
    await expect(page.locator('header').getByRole('img', { name: 'logo' })).toHaveAttribute('src', '/api/config/asset/logo');
  });
});

test.describe('A20 — Apparence', () => {
  test('le thème clair s\'applique aux sections de l\'accueil', async ({ page }) => {
    await openTab(page, 'Apparence');
    await pane(page).getByText('Clair').click();
    await save(page, 'Sauvegarder l\'apparence');
    await page.goto('/');
    await expect(page.locator('#galleries')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  });

  test('la couleur principale et la police des titres sont enregistrées et appliquées', async ({ page, adminApi }) => {
    await openTab(page, 'Apparence');
    await pickColor(page, '10b981');
    await pane(page).getByRole('radio', { name: /Playfair Display/ }).check();
    await save(page, 'Sauvegarder l\'apparence');
    expect(await getConfig(adminApi)).toMatchObject({ primary_color: '#10b981', heading_font: 'playfair' });

    // La couleur principale colore la case de sélection des galeries
    await page.goto('/share/demo-mariage');
    const box = page.locator('.pg-photo-card').first().locator('> div:not(.ant-image)');
    await box.click();
    await expect(box).toHaveCSS('background-color', 'rgb(16, 185, 129)');
  });

  test('l\'image du hero est remplacée par l\'upload', async ({ page, request }) => {
    await openTab(page, 'Apparence');
    await pane(page).locator('input[type=file]').setInputFiles(fixture('paysage.jpg'));
    await expect(page.getByText('Photo de fond du hero (page d\'accueil) mise à jour')).toBeVisible();
    await expect.poll(async () => (await imageSize(await (await request.get('/api/config/asset/hero')).body())).width).toBe(1200);
  });
});

test.describe('A21 — Contenu', () => {
  test('le titre du hero et le titre de la page contact sont modifiables', async ({ page }) => {
    await openTab(page, 'Contenu');
    await replaceRichText(page, 0, 'Titre E2E');
    await replaceRichText(page, 7, 'Écrivez-nous');
    await save(page, 'Sauvegarder');

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Titre E2E');
    await page.goto('/contact');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Écrivez-nous');
  });

  test('vider la biographie masque la section À propos', async ({ page }) => {
    await openTab(page, 'Contenu');
    await replaceRichText(page, 6, '');
    await save(page, 'Sauvegarder');
    await page.goto('/');
    await expect(page.locator('#galleries')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Me contacter' })).toHaveCount(0);
  });
});

test.describe('A22 — Réseaux sociaux', () => {
  test('un lien sans https:// est complété dans le footer', async ({ page }) => {
    await openTab(page, 'Contact & Réseaux');
    await pane(page).getByLabel('Facebook').fill('facebook.com/studio-e2e');
    await save(page, 'Sauvegarder');
    await page.goto('/');
    await expect(page.locator('footer').getByRole('link', { name: 'Facebook' })).toHaveAttribute('href', 'https://facebook.com/studio-e2e');
  });
});

test.describe('A23 — Fond de la page contact', () => {
  test('la couleur et la photo de fond s\'appliquent au panneau de la page contact', async ({ page, adminApi }) => {
    await openTab(page, 'Contact & Réseaux');
    await pickColor(page, '312e81');
    await save(page, 'Sauvegarder le fond Contact');
    expect((await getConfig(adminApi)).contact_bg_color).toBe('#312e81');

    await pane(page).locator('input[type=file]').setInputFiles(fixture('paysage.jpg'));
    await expect(page.getByText('Photo de fond (remplace la couleur) mise à jour')).toBeVisible();

    await page.goto('/contact');
    const panel = page.locator('h1').locator('xpath=ancestor::div[2]');
    await expect(panel).toHaveCSS('background-color', 'rgb(49, 46, 129)');
    await expect(panel).toHaveCSS('background-image', /\/api\/config\/asset\/contact/);
  });
});

test.describe('A25 — Stockage', () => {
  test('affiche l\'espace utilisé et la limite configurée', async ({ page }) => {
    await openTab(page, 'Stockage');
    await expect(pane(page).getByText('Espace utilisé')).toBeVisible();
    await expect(pane(page).getByText('Mo', { exact: true })).toBeVisible();
    await expect(pane(page).locator('.ant-statistic').filter({ hasText: 'Limite' })).toContainText('10Go');
    await expect(pane(page).getByText('Limite fixée à 10 Go via variable d\'environnement STORAGE_LIMIT_GB.')).toBeVisible();
  });
});
