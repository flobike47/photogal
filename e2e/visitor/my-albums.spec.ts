import { test, expect } from '../fixtures';
import { ALLOWED_VISITOR, OTHER_VISITOR, SESSION_COOKIE, signVisitorToken } from '../helpers/auth';

const myAlbums = (page: import('@playwright/test').Page) =>
  page.locator('section').filter({ has: page.getByRole('heading', { name: 'Mes albums' }) });

// U1 Mes albums · U2 Copier le lien · U3 Déconnexion · U4 Pas d'admin
test.describe('U1 — Mes albums', () => {
  test('un email autorisé voit l\'album partagé avec lui et peut l\'ouvrir', async ({ page, loginAsVisitor }) => {
    await loginAsVisitor(ALLOWED_VISITOR);
    await page.goto('/');
    const section = myAlbums(page);
    await expect(section.getByText('Partagés avec moi')).toBeVisible();
    const card = section.locator('.pg-album-card');
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('Famille Martin (accès email)');
    await expect(card).toContainText('6 photos');
    await card.click();
    await expect(page).toHaveURL('/share/demo-prive-emails');
    await expect(page.locator('.pg-photo-card')).toHaveCount(6);
  });

  test('un autre email ne voit pas la section', async ({ page, loginAsVisitor }) => {
    await loginAsVisitor(OTHER_VISITOR);
    await page.goto('/');
    await expect(page.locator('#albums')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mes albums' })).toHaveCount(0);
  });
});

test.describe('U2 — Copier le lien d\'un album partagé', () => {
  test('le bouton est proposé à un email autorisé et copie l\'URL', async ({ page, loginAsVisitor, readClipboard }) => {
    await loginAsVisitor(ALLOWED_VISITOR);
    await page.goto('/share/demo-prive-emails');
    await page.getByRole('button', { name: 'Copier le lien' }).click();
    await expect(page.getByText('Lien copié !')).toBeVisible();
    expect(await readClipboard()).toBe(`${new URL(page.url()).origin}/share/demo-prive-emails`);
  });

  test('le bouton n\'est pas proposé aux autres', async ({ page, loginAsVisitor }) => {
    await loginAsVisitor(OTHER_VISITOR);
    await page.goto('/share/demo-prive-emails');
    await expect(page.locator('.pg-photo-card')).toHaveCount(6);
    await expect(page.getByRole('button', { name: 'Copier le lien' })).toHaveCount(0);
  });
});

test.describe('U3 — Déconnexion visiteur', () => {
  test('« × » déconnecte : la section disparaît et la session est révoquée côté navigateur', async ({ page, loginAsVisitor }) => {
    await loginAsVisitor(ALLOWED_VISITOR);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Mes albums' })).toBeVisible();

    await page.locator('header nav').getByRole('button', { name: '×' }).click();
    await expect(page.getByRole('heading', { name: 'Mes albums' })).toHaveCount(0);
    expect((await page.request.get('/api/albums/my')).status()).toBe(401);
  });

  test('une session visiteur expirée reste sur le site public', async ({ page, context, baseURL }) => {
    test.fail(true, 'Bug connu : l\'intercepteur 401 redirige tout le monde vers /admin/login');
    await context.addCookies([{ name: SESSION_COOKIE, value: signVisitorToken(ALLOWED_VISITOR, -60), url: baseURL! }]);
    await context.addInitScript(() => {
      sessionStorage.setItem('photogal-auth', JSON.stringify({
        state: { email: 'client@example.com', isAuthenticated: true, isAdmin: false }, version: 0,
      }));
    });
    await page.goto('/');
    await expect(page.locator('#albums')).toBeVisible();
    await expect(page).toHaveURL('/');
  });
});

test.describe('U4 — Un visiteur n\'accède pas à l\'admin', () => {
  test('pas de lien Admin, /admin renvoie au login, et l\'API refuse (403)', async ({ page, loginAsVisitor }) => {
    await loginAsVisitor(ALLOWED_VISITOR);
    await page.goto('/');
    await expect(page.locator('header nav').getByRole('link', { name: 'Admin' })).toHaveCount(0);

    await page.goto('/admin');
    await expect(page).toHaveURL('/admin/login');

    expect((await page.request.get('/api/albums')).status()).toBe(403);
  });
});
