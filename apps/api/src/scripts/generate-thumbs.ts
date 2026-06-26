import Database from 'better-sqlite3';
import sharp from 'sharp';
import { config } from '../config.js';
import { ensureBucket, upload, downloadBuffer, exists } from '../storage.js';

const dbPath = process.env.DB_PATH ?? config.dbPath;
const db = new Database(dbPath);

interface Photo {
  id: string;
  album_id: string;
  filename: string;
  mime_type: string;
}

await ensureBucket();

const photos = db.prepare('SELECT id, album_id, filename, mime_type FROM photos ORDER BY created_at ASC').all() as Photo[];
console.log(`Found ${photos.length} photos to process.`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const photo of photos) {
  const tKey = `photos/${photo.album_id}/thumbs/${photo.id}.jpg`;

  if (await exists(tKey)) {
    skipped++;
    continue;
  }

  const srcKey = `photos/${photo.album_id}/${photo.filename}`;

  try {
    const srcBuffer = await downloadBuffer(srcKey);
    const thumbBuffer = await sharp(srcBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    await upload(tKey, thumbBuffer, 'image/jpeg');
    generated++;
    process.stdout.write(`\r  Generated: ${generated} | Skipped: ${skipped} | Failed: ${failed}`);
  } catch (err) {
    console.warn(`\n  [FAIL] ${photo.id} (${photo.filename}): ${(err as Error).message}`);
    failed++;
  }
}

console.log(`\n\nDone. Generated: ${generated} | Already existed: ${skipped} | Failed: ${failed}`);
db.close();
