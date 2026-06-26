import Database from 'better-sqlite3';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { ensureBucket, upload, exists } from '../storage.js';

const uploadsDir = join(import.meta.dirname, '../../uploads');
const dbPath = join(uploadsDir, 'photogal.db');

if (!existsSync(dbPath)) {
  console.error(`DB introuvable : ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

interface Photo {
  id: string;
  album_id: string;
  filename: string;
  mime_type: string;
}

await ensureBucket();

// Migrate photos
const photos = db.prepare('SELECT id, album_id, filename, mime_type FROM photos').all() as Photo[];
console.log(`Migration de ${photos.length} photos...`);

let uploaded = 0;
let skipped = 0;
let failed = 0;

for (const photo of photos) {
  const srcPath = join(uploadsDir, 'photos', photo.album_id, photo.filename);
  const key = `photos/${photo.album_id}/${photo.filename}`;
  const thumbSrcPath = join(uploadsDir, 'photos', photo.album_id, 'thumbs', `${photo.id}.jpg`);
  const thumbKey = `photos/${photo.album_id}/thumbs/${photo.id}.jpg`;

  // Upload original
  if (await exists(key)) {
    skipped++;
  } else if (existsSync(srcPath)) {
    try {
      const buffer = readFileSync(srcPath);
      await upload(key, buffer, photo.mime_type);
      uploaded++;
    } catch (err) {
      console.warn(`[FAIL] ${photo.filename}: ${(err as Error).message}`);
      failed++;
    }
  }

  // Upload thumb if exists
  if (existsSync(thumbSrcPath) && !await exists(thumbKey)) {
    try {
      const buffer = readFileSync(thumbSrcPath);
      await upload(thumbKey, buffer, 'image/jpeg');
    } catch { /* non-fatal */ }
  }

  process.stdout.write(`\r  Uploaded: ${uploaded} | Skipped: ${skipped} | Failed: ${failed}`);
}

// Migrate logos
const logosDir = join(uploadsDir, 'logos');
if (existsSync(logosDir)) {
  const logoFiles = readdirSync(logosDir);
  console.log(`\n\nMigration de ${logoFiles.length} logos...`);
  for (const file of logoFiles) {
    const srcPath = join(logosDir, file);
    const name = file.replace(/\.[^.]+$/, ''); // logo, hero, about
    const key = `logos/${name}`;
    try {
      const buffer = readFileSync(srcPath);
      const mime = file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
      await upload(key, buffer, mime);

      // Update DB to point to new URL
      const configKey = name === 'logo' ? 'logo_url' : name === 'hero' ? 'hero_image_url' : 'about_image_url';
      db.prepare('UPDATE site_config SET value = ? WHERE key = ?').run(`/api/config/asset/${name}`, configKey);
      console.log(`  Logo "${name}" migré.`);
    } catch (err) {
      console.warn(`  [FAIL] ${file}: ${(err as Error).message}`);
    }
  }
}

console.log(`\n\nMigration terminée. Photos: ${uploaded} uploadées, ${skipped} déjà présentes, ${failed} en erreur.`);
db.close();
