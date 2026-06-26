import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import sharp from 'sharp';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../../../.env') });

const uploadsDir = resolve(process.env.UPLOADS_DIR ?? './uploads');
const dbPath = resolve(uploadsDir, 'photogal.db');

if (!existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

interface Photo {
  id: string;
  album_id: string;
  filename: string;
  mime_type: string;
}

const photos = db.prepare('SELECT id, album_id, filename, mime_type FROM photos ORDER BY created_at ASC').all() as Photo[];

console.log(`Found ${photos.length} photos to process.`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const photo of photos) {
  const thumbPath = resolve(uploadsDir, 'photos', photo.album_id, 'thumbs', `${photo.id}.jpg`);

  if (existsSync(thumbPath)) {
    skipped++;
    continue;
  }

  const srcPath = resolve(uploadsDir, 'photos', photo.album_id, photo.filename);
  if (!existsSync(srcPath)) {
    console.warn(`  [SKIP] Source file missing: ${srcPath}`);
    failed++;
    continue;
  }

  try {
    await mkdir(resolve(uploadsDir, 'photos', photo.album_id, 'thumbs'), { recursive: true });
    await sharp(srcPath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbPath);
    generated++;
    process.stdout.write(`\r  Generated: ${generated} | Skipped: ${skipped} | Failed: ${failed}`);
  } catch (err) {
    console.warn(`\n  [FAIL] ${photo.id} (${photo.filename}): ${(err as Error).message}`);
    failed++;
  }
}

console.log(`\n\nDone. Generated: ${generated} | Already existed: ${skipped} | Failed: ${failed}`);
db.close();
