import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createAlbum, createTestApp, resetDb } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(resetDb);

describe('albums publics', () => {
  it("n'expose jamais le hash du mot de passe", async () => {
    const album = await createAlbum({ password: 'secret' });
    const res = await app.inject({ method: 'GET', url: `/api/albums/share/${album.share_token}` });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('password_hash');
    expect(res.json().album.has_password).toBe(1);
  });

  it("ne donne pas le lien de partage d'un album privé dans le listing", async () => {
    const priv = await createAlbum({ is_public: 0 });
    const res = await app.inject({ method: 'GET', url: '/api/albums/listing' });
    const listed = res.json().albums.find((a: { id: string }) => a.id === priv.id);
    expect(listed.share_token).toBeNull();
    expect(res.body).not.toContain(priv.share_token);
  });
});

describe('déverrouillage par mot de passe', () => {
  const unlock = (id: string, password: string, ip = '10.0.0.1') =>
    app.inject({ method: 'POST', url: `/api/albums/${id}/unlock`, payload: { password }, remoteAddress: ip });

  it('renvoie le share_token avec le bon mot de passe, espaces ignorés', async () => {
    const album = await createAlbum({ is_public: 0, password: 'secret' });
    const res = await unlock(album.id, '  secret ');
    expect(res.statusCode).toBe(200);
    expect(res.json().share_token).toBe(album.share_token);
  });

  it('bloque après 10 échecs, même avec le bon mot de passe, par IP', async () => {
    const album = await createAlbum({ is_public: 0, password: 'secret' });
    for (let i = 0; i < 10; i++) expect((await unlock(album.id, 'faux')).statusCode).toBe(401);
    expect((await unlock(album.id, 'secret')).statusCode).toBe(429);
    expect((await unlock(album.id, 'secret', '10.0.0.2')).statusCode).toBe(200);
  });
});
