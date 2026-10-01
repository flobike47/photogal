import { extname } from 'path';
import sharp from 'sharp';
import decodeHeic from 'heic-decode';
import { upload } from './storage.js';
import type { Photo } from './types.js';

// Le sharp précompilé ne décode pas le HEVC (brevets) : les HEIC d'iPhone passent
// par libheif en WASM (heic-decode), qui applique déjà la rotation propre au HEIC.
export function isHeic(mimeType: string, filename = ''): boolean {
  return ['image/heic', 'image/heif'].includes(mimeType)
    || ['.heic', '.heif'].includes(extname(filename).toLowerCase());
}

export async function heicToJpeg(buffer: Buffer, quality = 92): Promise<Buffer> {
  const { width, height, data } = await decodeHeic({ buffer });
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), { raw: { width, height, channels: 4 } })
    .jpeg({ quality })
    .toBuffer();
}

export function thumbKey(photo: Photo): string {
  return `photos/${photo.album_id}/thumbs/${photo.id}.jpg`;
}

export async function generateAndUploadThumb(srcBuffer: Buffer, tKey: string, mimeType = ''): Promise<void> {
  const input = isHeic(mimeType) ? await heicToJpeg(srcBuffer) : srcBuffer;
  const thumbBuffer = await sharp(input)
    .rotate() // applique l'orientation EXIF (photos de téléphone), perdue sinon avec les métadonnées
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  await upload(tKey, thumbBuffer, 'image/jpeg');
}
