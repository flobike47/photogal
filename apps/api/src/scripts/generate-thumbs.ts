import Database from 'better-sqlite3';
import { config } from '../config.js';
import { ensureBucket, downloadBuffer, exists } from '../storage.js';
import { generateAndUploadThumb, thumbKey } from '../images.js';
import type { Photo } from '../types.js';

// --force : régénère aussi les miniatures existantes (ex. après un changement de pipeline)
const force = process.argv.includes('--force');

const dbPath = process.env.DB_PATH ?? config.dbPath;
const db = new Database(dbPath);

await ensureBucket();

const photos = db.prepare('SELECT * FROM photos ORDER BY created_at ASC').all() as Photo[];
console.log(`Found ${photos.length} photos to process.`);

let generated = 0;
let skipped = 0;
let failed = 0;

for (const photo of photos) {
  const tKey = thumbKey(photo);

  if (!force && await exists(tKey)) {
    skipped++;
    continue;
  }

  const srcKey = `photos/${photo.album_id}/${photo.filename}`;

  try {
    const srcBuffer = await downloadBuffer(srcKey);
    await generateAndUploadThumb(srcBuffer, tKey, photo.mime_type);
    generated++;
    process.stdout.write(`\r  Generated: ${generated} | Skipped: ${skipped} | Failed: ${failed}`);
  } catch (err) {
    console.warn(`\n  [FAIL] ${photo.id} (${photo.filename}): ${(err as Error).message}`);
    failed++;
  }
}

console.log(`\n\nDone. Generated: ${generated} | Already existed: ${skipped} | Failed: ${failed}`);
db.close();
