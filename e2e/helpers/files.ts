import { resolve } from 'path';
import sharp from 'sharp';

export const FIXTURES_DIR = resolve(__dirname, '../.fixtures');
export const fixture = (name: string) => resolve(FIXTURES_DIR, name);
// HEIC versionné (on ne sait pas en générer) : exemple MIT de libheif, voir fixtures/SOURCE.md
export const HEIC_FIXTURE = resolve(__dirname, '../fixtures/sample.heic');

export async function imageSize(buffer: Buffer): Promise<{ width: number; height: number; format: string }> {
  const m = await sharp(buffer).metadata();
  return { width: m.width ?? 0, height: m.height ?? 0, format: m.format ?? '' };
}

// Noms des fichiers d'une archive ZIP, lus dans le répertoire central (sans dépendance)
export function zipEntries(zip: Buffer): string[] {
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Archive ZIP invalide (EOCD introuvable)');
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const nameLen = zip.readUInt16LE(offset + 28);
    const extraLen = zip.readUInt16LE(offset + 30);
    const commentLen = zip.readUInt16LE(offset + 32);
    names.push(zip.toString('utf8', offset + 46, offset + 46 + nameLen));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}
