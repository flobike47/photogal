import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import type { Album, Photo } from '../types.js';

export const albumRoutes: FastifyPluginAsync = async (app) => {
  // Public: list public albums (for homepage)
  app.get('/public', async () => {
    const albums = db
      .prepare(
        `SELECT a.*, COUNT(p.id) as photo_count
         FROM albums a
         LEFT JOIN photos p ON p.album_id = a.id
         WHERE a.is_public = 1
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all() as Album[];
    return { albums };
  });

  // Public: get album by share token
  app.get<{ Params: { shareToken: string } }>('/share/:shareToken', async (request, reply) => {
    const album = db
      .prepare('SELECT * FROM albums WHERE share_token = ? AND is_public = 1')
      .get(request.params.shareToken) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const photos = db
      .prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at ASC')
      .all(album.id) as Photo[];
    return { album, photos };
  });

  // Admin: list all albums
  app.get('/', { preHandler: [authenticate] }, async () => {
    const albums = db
      .prepare(
        `SELECT a.*, COUNT(p.id) as photo_count
         FROM albums a
         LEFT JOIN photos p ON p.album_id = a.id
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all() as Album[];
    return { albums };
  });

  // Admin: get single album
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });
    return album;
  });

  // Admin: create album
  app.post<{ Body: { name: string; description?: string; is_public?: boolean } }>('/', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          is_public: { type: 'boolean' },
        },
      },
    },
  }, async (request) => {
    const { name, description = '', is_public = true } = request.body;
    const id = nanoid();
    const share_token = nanoid(12);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO albums (id, name, description, share_token, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, name, description, share_token, is_public ? 1 : 0, now, now);

    return db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album;
  });

  // Admin: update album
  app.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; is_public?: boolean; cover_photo_id?: string | null };
  }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const { name, description, is_public, cover_photo_id } = request.body;
    const now = new Date().toISOString();

    db.prepare(
      `UPDATE albums SET
        name           = COALESCE(?, name),
        description    = COALESCE(?, description),
        is_public      = COALESCE(?, is_public),
        cover_photo_id = ?,
        updated_at     = ?
       WHERE id = ?`,
    ).run(
      name ?? null,
      description ?? null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      cover_photo_id !== undefined ? cover_photo_id : album.cover_photo_id,
      now,
      request.params.id,
    );

    return db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album;
  });

  // Admin: delete album
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const photos = db.prepare('SELECT * FROM photos WHERE album_id = ?').all(request.params.id) as Photo[];
    db.prepare('DELETE FROM albums WHERE id = ?').run(request.params.id);

    for (const photo of photos) {
      try {
        await unlink(join(config.uploadsDir, 'photos', photo.album_id, photo.filename));
      } catch { /* file may already be gone */ }
    }

    return reply.status(204).send();
  });

  // Admin: regenerate share token
  app.post<{ Params: { id: string } }>('/:id/regenerate-token', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const share_token = nanoid(12);
    db.prepare('UPDATE albums SET share_token = ?, updated_at = ? WHERE id = ?').run(
      share_token, new Date().toISOString(), request.params.id,
    );
    return { share_token };
  });

  // Admin: photos of an album
  app.get<{ Params: { id: string } }>('/:id/photos', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const photos = db
      .prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at ASC')
      .all(request.params.id) as Photo[];
    return { photos };
  });
};
