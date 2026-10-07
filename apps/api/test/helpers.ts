import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { buildApp } from '../src/app.js';
import { db } from '../src/db.js';

export { db };

export async function createTestApp() {
  const app = await buildApp();
  await app.ready();
  return app;
}

export function resetDb(): void {
  db.exec('DELETE FROM photos; DELETE FROM album_access; DELETE FROM albums; DELETE FROM admin_users;');
}

export async function createAdmin(email = 'admin@test.local', password = 'test-password') {
  const id = nanoid();
  db.prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    email,
    await bcrypt.hash(password, 4),
    new Date().toISOString(),
  );
  return { id, email, password };
}

export async function createAlbum(fields: { name?: string; is_public?: number; password?: string } = {}) {
  const id = nanoid();
  const share_token = nanoid(12);
  const now = new Date().toISOString();
  const password_hash = fields.password ? await bcrypt.hash(fields.password, 4) : null;
  db.prepare(
    `INSERT INTO albums (id, name, share_token, is_public, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, fields.name ?? 'Album', share_token, fields.is_public ?? 1, password_hash, now, now);
  return { id, share_token };
}
