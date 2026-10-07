import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import sharp from 'sharp';
import { reseed } from './helpers/reseed';
import { FIXTURES_DIR } from './helpers/files';

async function generateJpeg(width: number, height: number, label: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#2b6cb0"/>
    <text x="50%" y="50%" text-anchor="middle" font-size="${Math.min(width, height) / 6}" fill="#fff">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

export default async function globalSetup() {
  try {
    const res = await fetch('http://localhost:9000/minio/health/live');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    throw new Error(`MinIO injoignable (${(err as Error).message}). Lance d'abord : npm run dev:infra`);
  }

  reseed();

  // Fichiers d'upload générés à la volée (pas de binaire versionné, sauf le HEIC)
  mkdirSync(FIXTURES_DIR, { recursive: true });
  writeFileSync(resolve(FIXTURES_DIR, 'paysage.jpg'), await generateJpeg(1200, 800, 'E2E'));
  // Pixels « couchés » + EXIF 6 : doit s'afficher en portrait
  writeFileSync(
    resolve(FIXTURES_DIR, 'iphone-exif6.jpg'),
    await sharp(await generateJpeg(800, 1200, '↑'))
      .rotate(270)
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer(),
  );
  writeFileSync(
    resolve(FIXTURES_DIR, 'couverture.png'),
    await sharp(await generateJpeg(600, 800, 'Cover'))
      .png()
      .toBuffer(),
  );
  writeFileSync(resolve(FIXTURES_DIR, 'notes.txt'), "ceci n'est pas une image");
}
