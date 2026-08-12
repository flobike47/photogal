import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { extname, basename } from 'path';
import { ZipArchive } from 'archiver';
import sharp from 'sharp';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload, download, downloadBuffer, remove, exists } from '../storage.js';
import { config } from '../config.js';
import type { Photo } from '../types.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'image/gif', 'image/heic', 'image/heif',
  'image/avif', 'image/tiff',
]);

function uniqueName(seen: Set<string>, original: string): string {
  if (!seen.has(original)) { seen.add(original); return original; }
  const ext = extname(original);
  const base = original.slice(0, -ext.length || undefined);
  let i = 2;
  let candidate = `${base}_${i}${ext}`;
  while (seen.has(candidate)) { i++; candidate = `${base}_${i}${ext}`; }
  seen.add(candidate);
  return candidate;
}

function photoKey(photo: Photo): string {
  return `photos/${photo.album_id}/${photo.filename}`;
}

function thumbKey(photo: Photo): string {
  return `photos/${photo.album_id}/thumbs/${photo.id}.jpg`;
}

async function generateAndUploadThumb(srcBuffer: Buffer, tKey: string): Promise<void> {
  const thumbBuffer = await sharp(srcBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  await upload(tKey, thumbBuffer, 'image/jpeg');
}

export const photoRoutes: FastifyPluginAsync = async (app) => {
  // Public: thumbnail (generates on-demand for legacy photos)
  app.get<{ Params: { id: string } }>('/:id/thumb', async (request, reply) => {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(request.params.id) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    const tKey = thumbKey(photo);

    if (!await exists(tKey)) {
      const pKey = photoKey(photo);
      if (!await exists(pKey)) return reply.status(404).send({ error: 'Fichier introuvable' });
      try {
        const srcBuffer = await downloadBuffer(pKey);
        await generateAndUploadThumb(srcBuffer, tKey);
      } catch {
        const stream = await download(pKey);
        return reply
          .header('Content-Type', photo.mime_type)
          .header('Cache-Control', 'public, max-age=3600')
          .send(stream);
      }
    }

    const stream = await download(tKey);
    reply.raw.on('close', () => stream.destroy());
    return reply
      .header('Content-Type', 'image/jpeg')
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(stream);
  });

  // Public: full-resolution photo
  app.get<{ Params: { id: string } }>('/:id/original', async (request, reply) => {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(request.params.id) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    const stream = await download(photoKey(photo));
    reply.raw.on('close', () => stream.destroy());
    return reply
      .header('Content-Type', photo.mime_type)
      .header('Cache-Control', 'public, max-age=3600')
      .send(stream);
  });

  // Public: download a photo by its share token
  app.get<{ Params: { shareToken: string } }>('/download/:shareToken', async (request, reply) => {
    const photo = db
      .prepare('SELECT * FROM photos WHERE share_token = ?')
      .get(request.params.shareToken) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    const stream = await download(photoKey(photo));
    reply.raw.on('close', () => stream.destroy());
    return reply
      .header('Content-Type', photo.mime_type)
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(photo.original_name)}"`)
      .send(stream);
  });

  // Public: download selected photos as zip
  app.post<{ Body: { shareTokens: string[] } }>('/download-zip', async (request, reply) => {
    const { shareTokens } = request.body;
    if (!Array.isArray(shareTokens) || shareTokens.length === 0) {
      return reply.status(400).send({ error: 'Aucune photo sélectionnée' });
    }
    if (shareTokens.length > 500) {
      return reply.status(400).send({ error: 'Trop de photos' });
    }

    const placeholders = shareTokens.map(() => '?').join(',');
    const photos = db
      .prepare(`SELECT * FROM photos WHERE share_token IN (${placeholders})`)
      .all(...shareTokens) as Photo[];
    if (photos.length === 0) return reply.status(404).send({ error: 'Photos introuvables' });

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="selection.zip"',
    });

    const archive = new ZipArchive({ zlib: { level: 1 } });
    archive.pipe(reply.raw);

    const seen = new Set<string>();
    for (const photo of photos) {
      try {
        const stream = await download(photoKey(photo));
        archive.append(stream, { name: uniqueName(seen, basename(photo.original_name)) });
      } catch { /* skip missing */ }
    }

    await archive.finalize();
  });

  // Admin: upload one or more photos to an album
  app.post<{ Params: { albumId: string } }>('/upload/:albumId', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(request.params.albumId);
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const uploaded: Photo[] = [];
    const parts = request.files();

    for await (const part of parts) {
      if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
        await part.toBuffer();
        continue;
      }

      const ext = extname(part.filename) || '.jpg';
      const id = nanoid();
      const filename = `${id}${ext}`;
      const now = new Date().toISOString();

      const buffer = await part.toBuffer();

      // Check storage limit
      if (config.storageLimitGb) {
        const { total } = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM photos').get() as { total: number };
        if (total + buffer.length > config.storageLimitGb * 1024 * 1024 * 1024) {
          return reply.status(413).send({ error: `Limite de stockage atteinte (${config.storageLimitGb} Go). Supprimez des photos pour libérer de l'espace.` });
        }
      }

      await upload(`photos/${request.params.albumId}/${filename}`, buffer, part.mimetype);

      db.prepare(
        `INSERT INTO photos (id, album_id, filename, original_name, mime_type, size, share_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, request.params.albumId, filename, part.filename, part.mimetype, buffer.length, nanoid(12), now);

      const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id) as Photo;
      uploaded.push(photo);

      generateAndUploadThumb(buffer, thumbKey(photo)).catch(() => {});
    }

    return reply.status(201).send({ photos: uploaded });
  });

  // Admin: delete a photo
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(request.params.id) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    db.prepare('DELETE FROM photos WHERE id = ?').run(request.params.id);
    await remove(photoKey(photo));
    await remove(thumbKey(photo));

    return reply.status(204).send();
  });

  // Admin: list all photos (with optional album filter)
  app.get<{ Querystring: { albumId?: string } }>('/', { preHandler: [authenticate] }, async (request) => {
    const { albumId } = request.query;
    const photos = albumId
      ? (db.prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at ASC').all(albumId) as Photo[])
      : (db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all() as Photo[]);
    return { photos };
  });
};
