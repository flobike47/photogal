import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { config } from './config.js';

mkdirSync(config.uploadsDir, { recursive: true });
mkdirSync(join(config.uploadsDir, 'photos'), { recursive: true });
mkdirSync(join(config.uploadsDir, 'logos'), { recursive: true });

export const db = new Database(join(config.uploadsDir, 'photogal.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS site_config (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS albums (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    description    TEXT DEFAULT '',
    cover_photo_id TEXT,
    share_token    TEXT UNIQUE NOT NULL,
    is_public      INTEGER DEFAULT 1,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS photos (
    id            TEXT PRIMARY KEY,
    album_id      TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    filename      TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type     TEXT NOT NULL,
    size          INTEGER NOT NULL,
    share_token   TEXT UNIQUE NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL,
    message    TEXT NOT NULL,
    read       INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );
`);

const defaultConfig: Record<string, string> = {
  site_name: 'PhotoGal',
  site_description: 'Partagez vos plus belles photos',
  primary_color: '#1677ff',
  contact_email: 'contact@photogal.com',
  hero_title: 'Bienvenue sur PhotoGal',
  hero_subtitle: 'Découvrez nos galeries photos et téléchargez vos favoris',
  footer_text: '© 2024 PhotoGal. Tous droits réservés.',
  logo_url: '',
};

const insertConfig = db.prepare('INSERT OR IGNORE INTO site_config (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultConfig)) {
  insertConfig.run(key, value);
}

export function getSiteConfig(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM site_config').all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
