import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { createWriteStream, statSync } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import type { Photo } from '../types.js';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
]);

export const photoRoutes: FastifyPluginAsync = async (app) => {
  // Public: download a photo by its share token
  app.get<{ Params: { shareToken: string } }>('/download/:shareToken', async (request, reply) => {
    const photo = db
      .prepare('SELECT * FROM photos WHERE share_token = ?')
      .get(request.params.shareToken) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    return reply
      .header('Content-Type', photo.mime_type)
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(photo.original_name)}"`)
      .sendFile(`photos/${photo.album_id}/${photo.filename}`);
  });

  // Admin: upload one or more photos to an album
  app.post<{ Params: { albumId: string } }>('/upload/:albumId', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT id FROM albums WHERE id = ?').get(request.params.albumId);
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const albumDir = join(config.uploadsDir, 'photos', request.params.albumId);
    await mkdir(albumDir, { recursive: true });

    const uploaded: Photo[] = [];
    const parts = request.files();

    for await (const part of parts) {
      if (!ALLOWED_MIME_TYPES.has(part.mimetype)) {
        // consume the stream to avoid memory leak
        await part.toBuffer();
        continue;
      }

      const ext = extname(part.filename) || '.jpg';
      const id = nanoid();
      const filename = `${id}${ext}`;
      const filePath = join(albumDir, filename);

      await pipeline(part.file, createWriteStream(filePath));

      const { size } = statSync(filePath);
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO photos (id, album_id, filename, original_name, mime_type, size, share_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, request.params.albumId, filename, part.filename, part.mimetype, size, nanoid(12), now);

      uploaded.push(db.prepare('SELECT * FROM photos WHERE id = ?').get(id) as Photo);
    }

    return reply.status(201).send({ photos: uploaded });
  });

  // Admin: delete a photo
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(request.params.id) as Photo | undefined;
    if (!photo) return reply.status(404).send({ error: 'Photo introuvable' });

    db.prepare('DELETE FROM photos WHERE id = ?').run(request.params.id);

    try {
      await unlink(join(config.uploadsDir, 'photos', photo.album_id, photo.filename));
    } catch { /* file may already be gone */ }

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
