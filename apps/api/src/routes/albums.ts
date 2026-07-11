import type { FastifyPluginAsync } from 'fastify';
import { nanoid } from 'nanoid';
import { extname, basename } from 'path';
import { ZipArchive } from 'archiver';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
import { authenticateUser } from '../middleware/authenticateUser.js';
import { download, remove, upload, getContentType } from '../storage.js';
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

export const albumRoutes: FastifyPluginAsync = async (app) => {
  // Public: list public albums (for homepage)
  app.get('/public', async () => {
    const albums = db
      .prepare(
        `SELECT a.*, COUNT(p.id) as photo_count
         FROM albums a
         LEFT JOIN photos p ON p.album_id = a.id
         WHERE a.is_public = 1 AND a.is_portfolio = 1
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all() as Album[];
    return { albums };
  });

  // Public: all non-portfolio albums (public ones fully listed, private ones shown with lock)
  app.get('/listing', async () => {
    const rows = db
      .prepare(
        `SELECT a.id, a.name, a.description, a.cover_photo_id, a.cover_url, a.is_public, a.is_portfolio, a.is_downloadable, a.created_at,
                CASE WHEN a.is_public = 1 THEN a.share_token ELSE NULL END as share_token,
                CASE WHEN a.password_hash IS NOT NULL THEN 1 ELSE 0 END as has_password,
                COUNT(p.id) as photo_count
         FROM albums a
         LEFT JOIN photos p ON p.album_id = a.id
         WHERE a.is_portfolio = 0
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
      )
      .all() as (Album & { has_password: number })[];
    return { albums: rows };
  });

  // Public: serve album cover image
  app.get<{ Params: { id: string } }>('/:id/cover', async (request, reply) => {
    const album = db.prepare('SELECT cover_url FROM albums WHERE id = ?').get(request.params.id) as { cover_url: string | null } | undefined;
    if (!album?.cover_url) return reply.status(404).send({ error: 'Pas de couverture' });

    const key = `covers/${request.params.id}`;
    try {
      const [stream, contentType] = await Promise.all([download(key), getContentType(key)]);
      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=3600')
        .send(stream);
    } catch {
      return reply.status(404).send({ error: 'Image introuvable' });
    }
  });

  // Admin: upload album cover (independent image, not necessarily a photo in the album)
  app.post<{ Params: { id: string } }>('/:id/cover', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'Aucun fichier fourni' });

    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!ALLOWED.has(part.mimetype)) {
      await part.toBuffer();
      return reply.status(400).send({ error: 'Format non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF.' });
    }

    const buffer = await part.toBuffer();
    await upload(`covers/${request.params.id}`, buffer, part.mimetype);

    const cover_url = `/api/albums/${request.params.id}/cover`;
    db.prepare('UPDATE albums SET cover_url = ?, updated_at = ? WHERE id = ?').run(
      cover_url, new Date().toISOString(), request.params.id,
    );

    return { cover_url };
  });

  // Public: unlock a private album with password → returns share_token
  app.post<{ Params: { id: string }; Body: { password: string } }>(
    '/:id/unlock',
    async (request, reply) => {
      const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
      if (!album) return reply.status(404).send({ error: 'Album introuvable' });
      if (!album.password_hash) return reply.status(400).send({ error: 'Cet album n\'a pas de mot de passe' });
      const ok = await bcrypt.compare(request.body.password.trim(), album.password_hash);
      if (!ok) return reply.status(401).send({ error: 'Mot de passe incorrect' });
      return { share_token: album.share_token };
    },
  );

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
    if (!album.is_downloadable) return reply.status(403).send({ error: 'Téléchargement désactivé pour cet album' });

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
      try {
        const stream = await download(`photos/${photo.album_id}/${photo.filename}`);
        archive.append(stream, { name: uniqueName(seen, basename(photo.original_name)) });
      } catch { /* skip missing */ }
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
  app.post<{ Body: { name: string; description?: string; is_public?: boolean; is_downloadable?: boolean; is_portfolio?: boolean; password?: string; allowed_emails?: string[] } }>('/', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          is_public: { type: 'boolean' },
          is_downloadable: { type: 'boolean' },
          is_portfolio: { type: 'boolean' },
          password: { type: 'string' },
          allowed_emails: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request) => {
    const { name, description = '', is_public = true, is_downloadable = true, is_portfolio = false, password, allowed_emails = [] } = request.body;
    const id = nanoid();
    const share_token = nanoid(12);
    const now = new Date().toISOString();
    const password_hash = password?.trim() ? await bcrypt.hash(password.trim(), 10) : null;

    db.prepare(
      `INSERT INTO albums (id, name, description, share_token, is_public, is_downloadable, is_portfolio, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, name, description, share_token, is_public ? 1 : 0, is_downloadable ? 1 : 0, is_portfolio ? 1 : 0, password_hash, now, now);

    setAlbumEmails(id, allowed_emails);

    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as Album;
    return { ...album, allowed_emails: getAlbumEmails(id) };
  });

  // Admin: update album
  app.put<{
    Params: { id: string };
    Body: { name?: string; description?: string; is_public?: boolean; is_downloadable?: boolean; is_portfolio?: boolean; password?: string | null; cover_photo_id?: string | null; allowed_emails?: string[] };
  }>('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const album = db.prepare('SELECT * FROM albums WHERE id = ?').get(request.params.id) as Album | undefined;
    if (!album) return reply.status(404).send({ error: 'Album introuvable' });

    const { name, description, is_public, is_downloadable, is_portfolio, password, cover_photo_id, allowed_emails } = request.body;
    const now = new Date().toISOString();

    // password='' or null removes the password; password=string sets a new one; undefined leaves unchanged
    let newPasswordHash: string | null | undefined = undefined;
    if (password === null || (typeof password === 'string' && password.trim() === '')) newPasswordHash = null;
    else if (password) newPasswordHash = await bcrypt.hash(password.trim(), 10);

    db.prepare(
      `UPDATE albums SET
        name            = COALESCE(?, name),
        description     = COALESCE(?, description),
        is_public       = COALESCE(?, is_public),
        is_downloadable = COALESCE(?, is_downloadable),
        is_portfolio    = COALESCE(?, is_portfolio),
        password_hash   = CASE WHEN ? = 1 THEN ? ELSE password_hash END,
        cover_photo_id  = ?,
        updated_at      = ?
       WHERE id = ?`,
    ).run(
      name ?? null,
      description ?? null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      is_downloadable !== undefined ? (is_downloadable ? 1 : 0) : null,
      is_portfolio !== undefined ? (is_portfolio ? 1 : 0) : null,
      newPasswordHash !== undefined ? 1 : 0,
      newPasswordHash !== undefined ? newPasswordHash : null,
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
      await remove(`photos/${photo.album_id}/${photo.filename}`);
      await remove(`photos/${photo.album_id}/thumbs/${photo.id}.jpg`);
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
