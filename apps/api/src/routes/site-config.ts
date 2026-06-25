import type { FastifyPluginAsync } from 'fastify';
import { createWriteStream } from 'fs';
import { join, extname } from 'path';
import { pipeline } from 'stream/promises';
import { db, getSiteConfig } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';

export const siteConfigRoutes: FastifyPluginAsync = async (app) => {
  // Public: get all site config
  app.get('/', async () => getSiteConfig());

  // Admin: update site config keys
  app.put<{ Body: Record<string, string> }>('/', { preHandler: [authenticate] }, async (request) => {
    const upsert = db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)');
    const upsertMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) upsert.run(key, value);
    });
    upsertMany(Object.entries(request.body));
    return getSiteConfig();
  });

  // Admin: upload logo
  app.post('/logo', { preHandler: [authenticate] }, async (request, reply) => {
    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'Aucun fichier fourni' });

    const ext = extname(part.filename) || '.png';
    const filename = `logo${ext}`;
    const dest = join(config.uploadsDir, 'logos', filename);

    await pipeline(part.file, createWriteStream(dest));

    const logo_url = `/uploads/logos/${filename}`;
    db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)').run('logo_url', logo_url);

    return { logo_url };
  });
};
