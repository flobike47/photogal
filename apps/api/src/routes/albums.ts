import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { unlink } from 'fs/promises';
import { join, extname, basename } from 'path';
import { existsSync } from 'fs';
import { ZipArchive } from 'archiver';
import { db } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { authenticateUser } from '../middleware/authenticateUser.js';
import type { Album, Photo } from '../types.js';

function getAlbumEmails(albumId: string): string[] {
  return (db.prepare('SELECT email FROM album_access WHERE album_id = ?').all(albumId) as { email: string }[])
    .map((r) => r.email);
}

function setAlbumEmails(albumId: string, emails: string[]) {
  db.prepare('DELETE FROM album_access WHERE album_id = ?').run(albumId);
  const insert = db.prepare('INSERT OR IGNORE INTO album_access (album_id, email) VALUES (?, ?)');
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (normalized) insert.run(albumId, normalized);
  }
}

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

  // Authenticated user: albums they have access to
  app.get('/my', { preHandler: [authenticateUser] }, async (request) => {
    const email = request.user.email.trim().toLowerCase();
    const albums = db
      .prepare(
        `SELECT a.*, COUNT(p.id) as photo_count
         FROM albums a
         JOIN album_access aa ON aa.album_id = a.id
         LEFT JOIN photos p ON p.album_id = a.id
         WHERE lower(aa.email) = ?
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all(email) as Album[];
    return { albums };
  });

  // Public: get album by share token
  app.get<{ Params: { shareToken: string } }>('/share/:shareToken', async (request, reply) => {
    const album = db
      .prepare('SELECT * FROM albums WHERE share_token = ?')
      .get(request.params.shareToken) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const photos = db
      .prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at ASC')
      .all(album.id) as Photo[];
    return { album: { ...album, allowed_emails: getAlbumEmails(album.id) }, photos };
  });

  // Public: download all photos in album as zip
  app.get<{ Params: { shareToken: string } }>('/share/:shareToken/download', async (request, reply) => {
    const album = db
      .prepare('SELECT * FROM albums WHERE share_token = ?')
      .get(request.params.shareToken) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const photos = db
      .prepare('SELECT * FROM photos WHERE album_id = ? ORDER BY created_at ASC')
      .all(album.id) as Photo[];

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(album.name)}.zip"`,
    });

    const archive = new ZipArchive({ zlib: { level: 1 } });
    archive.pipe(reply.raw);

    const seen = new Set<string>();
    for (const photo of photos) {
      const filePath = join(config.uploadsDir, 'photos', photo.album_id, photo.filename);
      if (existsSync(filePath)) {
        let name = basename(photo.original_name);
        if (seen.has(name)) {
          const ext = extname(name);
          const base = name.slice(0, -ext.length || undefined);
          let i = 2;
          while (seen.has(`${base}_${i}${ext}`)) i++;
          name = `${base}_${i}${ext}`;
        }
        seen.add(name);
        archive.file(filePath, { name });
      }
    }

    await archive.finalize();
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

  // Admin: get single album (includes allowed_emails)
  app.get<{ Params: { id: string } }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });
    return { ...album, allowed_emails: getAlbumEmails(album.id) };
  });

  // Admin: create album
  app.post<{ Body: { name: string; description?: string; is_public?: boolean; allowed_emails?: string[] } }>('/', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          is_public: { type: 'boolean' },
          allowed_emails: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request) => {
    const { name, description = '', is_public = true, allowed_emails = [] } = request.body;
    const id = nanoid();
    const share_token = nanoid(12);
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO albums (id, name, description, share_token, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, name, description, share_token, is_public ? 1 : 0, now, now);

    setAlbumEmails(id, allowed_emails);

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album;
    return { ...album, allowed_emails: getAlbumEmails(id) };
  });

  // Admin: update album
  app.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; is_public?: boolean; cover_photo_id?: string | null; allowed_emails?: string[] };
  }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const { name, description, is_public, cover_photo_id, allowed_emails } = request.body;
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

    if (allowed_emails !== undefined) {
      setAlbumEmails(request.params.id, allowed_emails);
    }

    const updated = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album;
    return { ...updated, allowed_emails: getAlbumEmails(request.params.id) };
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
