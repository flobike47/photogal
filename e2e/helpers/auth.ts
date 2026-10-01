import { createHmac } from 'crypto';
import { resolve } from 'path';

// Session admin partagée par les specs admin (créée par auth.setup.ts)
export const ADMIN_STATE = resolve(__dirname, '../.auth/admin.json');

// Valeurs par défaut identiques à apps/api/src/config.ts en dev
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@localhost';
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'dev-changeme';
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-production';

export const SESSION_COOKIE = 'pg_session';
export const ALLOWED_VISITOR = 'client@example.com';
export const OTHER_VISITOR = 'inconnu@example.com';

const b64url = (data: string | Buffer) => Buffer.from(data).toString('base64url');

// Session visiteur Google (role: user) : le vrai login Google n'est pas automatisable,
// on signe le même JWT que POST /api/auth/google renverrait.
export function signVisitorToken(email: string, ttlSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ email, role: 'user', iat: now, exp: now + ttlSeconds }));
  const signature = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}
