import { test, expect } from '../fixtures';
import { reseed } from '../helpers/reseed';

// V16 Contact
test.describe('V16 — Page contact', () => {
  test.afterAll(reseed); // un message a été ajouté

  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
  });

  test('affiche le titre, la description, l\'email et le fond configurés', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Parlons de votre projet');
    await expect(page.getByRole('link', { name: 'contact@photogal.test' }).first()).toHaveAttribute('href', 'mailto:contact@photogal.test');
    const panel = page.locator('h1').locator('xpath=ancestor::div[2]');
    await expect(panel).toHaveCSS('background-image', /\/api\/config\/asset\/contact/);
  });

  test('un formulaire vide affiche les erreurs de validation sans envoyer', async ({ page }) => {
    let posted = false;
    page.on('request', (r) => { if (r.url().endsWith('/api/contact') && r.method() === 'POST') posted = true; });
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText('Requis')).toHaveCount(2);
    await expect(page.getByText('Email invalide')).toBeVisible();
    expect(posted).toBe(false);
  });

  test('un email invalide est signalé', async ({ page }) => {
    await page.getByPlaceholder('Votre nom').fill('Jean');
    await page.getByPlaceholder('votre@email.com').fill('pas-un-email');
    await page.getByPlaceholder('Décrivez votre projet...').fill('Bonjour');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();
    await expect(page.getByText('Email invalide')).toBeVisible();
  });

  test('un message valide est confirmé et arrive dans l\'admin', async ({ page, adminApi }) => {
    const unique = `E2E ${Date.now()}`;
    await page.getByPlaceholder('Votre nom').fill(unique);
    await page.getByPlaceholder('votre@email.com').fill('e2e@example.com');
    await page.getByPlaceholder('Décrivez votre projet...').fill('Message de test\nsur deux lignes');
    await page.getByRole('button', { name: 'Envoyer le message' }).click();

    await expect(page.getByRole('heading', { name: 'Message envoyé' })).toBeVisible();
    await page.getByRole('button', { name: 'Envoyer un autre message' }).click();
    await expect(page.getByPlaceholder('Votre nom')).toHaveValue('');

    const { messages } = await (await adminApi.get('/api/contact')).json() as { messages: { name: string; read: number }[] };
    expect(messages.find((m) => m.name === unique)).toMatchObject({ read: 0 });
  });

  test('l\'API refuse un email invalide (400)', async ({ request }) => {
    const res = await request.post('/api/contact', { data: { name: 'x', email: 'invalide', message: 'x' } });
    expect(res.status()).toBe(400);
  });
});
