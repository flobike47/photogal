import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createAdmin, createTestApp, db, resetDb } from './helpers.js';

let app: FastifyInstance;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(() => app.close());
beforeEach(resetDb);

async function login(email: string, password: string) {
  return app.inject({ method: 'POST', url: '/api/auth/login', payload: { email, password } });
}

describe('auth admin', () => {
  it('pose un cookie HttpOnly avec les bons identifiants (email insensible à la casse)', async () => {
    await createAdmin();
    const res = await login('  ADMIN@test.local ', 'test-password');
    expect(res.statusCode).toBe(200);
    expect(res.headers['set-cookie']).toMatch(/pg_session=.+HttpOnly/i);
  });

  it('refuse un mauvais mot de passe', async () => {
    await createAdmin();
    expect((await login('admin@test.local', 'nope')).statusCode).toBe(401);
  });

  it('protège les routes admin', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/albums' })).statusCode).toBe(401);
  });

  it('invalide les sessions quand session_version change', async () => {
    const admin = await createAdmin();
    const res = await login(admin.email, admin.password);
    const cookie = res.cookies.find((c) => c.name === 'pg_session')!;
    const me = () => app.inject({ method: 'GET', url: '/api/auth/me', cookies: { pg_session: cookie.value } });

    expect((await me()).statusCode).toBe(200);
    db.prepare('UPDATE admin_users SET session_version = session_version + 1 WHERE id = ?').run(admin.id);
    expect((await me()).statusCode).toBe(401);
  });
});
