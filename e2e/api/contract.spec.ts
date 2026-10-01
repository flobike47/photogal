import { test, expect } from '../fixtures';
import { reseed } from '../helpers/reseed';
import { ALLOWED_VISITOR, SESSION_COOKIE, signVisitorToken } from '../helpers/auth';
import { fixture } from '../helpers/files';
import { readFileSync } from 'fs';

test.afterAll(reseed);

// Corps valides : la validation de schéma passe avant l'authentification (sinon 400 au lieu de 401)
const ADMIN_ROUTES: [method: 'get' | 'post' | 'put' | 'delete', path: string, data?: object][] = [
  ['get', '/api/albums'],
  ['get', '/api/albums/album-mariage'],
  ['post', '/api/albums', { name: 'x' }],
  ['put', '/api/albums/album-mariage', { name: 'x' }],
  ['delete', '/api/albums/album-mariage'],
  ['post', '/api/albums/album-mariage/regenerate-token'],
  ['get', '/api/albums/album-mariage/photos'],
  ['post', '/api/albums/album-mariage/cover'],
  ['get', '/api/photos'],
  ['put', '/api/photos/reorder', { albumId: 'album-mariage', photoIds: [] }],
  ['post', '/api/photos/upload/album-mariage'],
  ['delete', '/api/photos/inexistante'],
  ['get', '/api/contact'],
  ['get', '/api/contact/unread-count'],
  ['put', '/api/contact/inexistant/read'],
  ['delete', '/api/contact/inexistant'],
  ['get', '/api/config/storage'],
  ['put', '/api/config', { site_name: 'pirate' }],
  ['post', '/api/config/image/logo'],
  ['put', '/api/auth/password', { currentPassword: 'x', newPassword: 'xxxxxxxx' }],
];

// S1 → S5
test.describe('S1 — Routes admin sans session', () => {
  for (const [method, path, data] of ADMIN_ROUTES) {
    test(`${method.toUpperCase()} ${path} → 401`, async ({ request }) => {
      expect((await request[method](path, { data })).status()).toBe(401);
    });
  }
});

test.describe('S2 — Routes admin avec une session visiteur', () => {
  for (const [method, path, data] of ADMIN_ROUTES) {
    test(`${method.toUpperCase()} ${path} → 403`, async ({ request }) => {
      const res = await request[method](path, { data, headers: { cookie: `${SESSION_COOKIE}=${signVisitorToken(ALLOWED_VISITOR)}` } });
      expect(res.status()).toBe(403);
    });
  }

  test('une session visiteur au JWT falsifié est rejetée (401)', async ({ request }) => {
    const forged = signVisitorToken(ALLOWED_VISITOR).replace(/\.[^.]+$/, '.signature-invalide');
    const res = await request.get('/api/albums/my', { headers: { cookie: `${SESSION_COOKIE}=${forged}` } });
    expect(res.status()).toBe(401);
  });
});

test.describe('S3 — Configuration', () => {
  test('PUT /api/config ignore les clés hors liste autorisée', async ({ adminApi }) => {
    const res = await adminApi.put('/api/config', { data: { site_name: 'Config E2E', cle_inconnue: 'x' } });
    const config = await res.json();
    expect(config.site_name).toBe('Config E2E');
    expect(config).not.toHaveProperty('cle_inconnue');
  });

  test('un type d\'asset inconnu est refusé (400)', async ({ request }) => {
    expect((await request.get('/api/config/asset/inconnu')).status()).toBe(400);
  });
});

test.describe('S4 — Santé et SPA', () => {
  test('/api/health répond ok', async ({ request }) => {
    expect(await (await request.get('/api/health')).json()).toMatchObject({ status: 'ok' });
  });

  test('un lien profond du front renvoie l\'application', async ({ request }) => {
    const res = await request.get('/admin/albums');
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
  });

  test('une route API inconnue répond 404', async ({ request }) => {
    expect((await request.get('/api/inexistant')).status()).toBe(404);
  });
});

test.describe('S5 — Cycle de vie des ressources', () => {
  test('une photo supprimée n\'est plus servie (original, miniature, téléchargement)', async ({ adminApi, request }) => {
    const upload = await adminApi.post('/api/photos/upload/album-vide', {
      multipart: { file: { name: 'paysage.jpg', mimeType: 'image/jpeg', buffer: readFileSync(fixture('paysage.jpg')) } },
    });
    const [photo] = (await upload.json()).photos as { id: string; share_token: string }[];
    expect((await request.get(`/api/photos/${photo.id}/original`)).status()).toBe(200);

    expect((await adminApi.delete(`/api/photos/${photo.id}`)).status()).toBe(204);
    expect((await request.get(`/api/photos/${photo.id}/original`)).status()).toBe(404);
    expect((await request.get(`/api/photos/${photo.id}/thumb`)).status()).toBe(404);
    expect((await request.get(`/api/photos/download/${photo.share_token}`)).status()).toBe(404);
  });

  test('régénérer le token invalide l\'ancien lien', async ({ adminApi, request }) => {
    const { share_token } = await (await adminApi.post('/api/albums/album-vide/regenerate-token')).json();
    expect((await request.get('/api/albums/share/demo-vide')).status()).toBe(404);
    expect((await request.get(`/api/albums/share/${share_token}`)).status()).toBe(200);
  });

  test('le réordonnancement ignore les photos d\'un autre album', async ({ adminApi }) => {
    const other = (await (await adminApi.get('/api/albums/album-mariage/photos')).json()).photos[0];
    await adminApi.put('/api/photos/reorder', { data: { albumId: 'album-portfolio-portraits', photoIds: [other.id] } });
    const after = (await (await adminApi.get('/api/albums/album-mariage/photos')).json()).photos[0];
    expect(after).toMatchObject({ id: other.id, sort_order: other.sort_order });
  });
});

test.describe('Sécurité — bugs connus', () => {
  test('la galerie publique n\'expose ni le hash du mot de passe ni les emails autorisés', async ({ request }) => {
    test.fail(true, 'Bug connu : /share/:token renvoie SELECT * (password_hash) et allowed_emails');
    const { album } = await (await request.get('/api/albums/share/demo-prive-mdp')).json();
    expect(album).not.toHaveProperty('password_hash');
    const shared = (await (await request.get('/api/albums/share/demo-prive-emails')).json()).album;
    expect(shared).not.toHaveProperty('allowed_emails');
  });

  test('une photo d\'un album non téléchargeable ne peut pas être téléchargée', async ({ request }) => {
    test.fail(true, 'Bug connu : is_downloadable n\'est vérifié que sur le ZIP de l\'album');
    const { photos } = await (await request.get('/api/albums/share/demo-non-telechargeable')).json();
    const res = await request.get(`/api/photos/download/${photos[0].share_token}`);
    expect(res.status()).toBe(403);
  });

  test('le ZIP de sélection refuse les photos d\'un album non téléchargeable', async ({ request }) => {
    test.fail(true, 'Bug connu : /photos/download-zip ne vérifie pas is_downloadable');
    const { photos } = await (await request.get('/api/albums/share/demo-non-telechargeable')).json();
    const res = await request.post('/api/photos/download-zip', { data: { shareTokens: [photos[0].share_token] } });
    expect(res.status()).toBe(403);
  });
});
