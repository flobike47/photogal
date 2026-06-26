import type { FastifyPluginAsync } from 'fastify';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { db, getSiteConfig } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_CONFIG_KEYS = new Set([
  'site_name', 'site_description', 'primary_color', 'contact_email',
  'hero_title', 'hero_subtitle', 'footer_text', 'logo_url', 'hero_image_url',
  'about_title', 'about_text', 'about_image_url', 'social_instagram',
  'social_facebook', 'social_pinterest', 'social_website', 'heading_font', 'site_theme',
]);

export const siteConfigRoutes: FastifyPluginAsync = async (app) => {
  // Public: get all site config
  app.get('/', async () => getSiteConfig());

  // Admin: update site config (allowlisted keys only)
  app.put<{ Body: Record<string, string> }>('/', { preHandler: [authenticate] }, async (request) => {
    const upsert = db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)');
    const upsertMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        if (ALLOWED_CONFIG_KEYS.has(key)) upsert.run(key, value);
      }
    });
    upsertMany(Object.entries(request.body));
    return getSiteConfig();
  });

  // Admin: upload an image asset (logo | hero | about)
  app.post<{ Params: { type: string } }>('/image/:type', { preHandler: [authenticate] }, async (request, reply) => {
    const { type } = request.params;
    const allowed = ['logo', 'hero', 'about'];
    if (!allowed.includes(type)) return reply.status(400).send({ error: 'Type invalide' });

    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'Aucun fichier fourni' });

    if (!ALLOWED_IMAGE_TYPES.has(part.mimetype)) {
      await part.toBuffer(); // drain stream to avoid memory leak
      return reply.status(400).send({ error: 'Format non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF.' });
    }

    const ext = MIME_EXT[part.mimetype];
    const filename = `${type}${ext}`;
    const dest = join(config.uploadsDir, 'logos', filename);

    await pipeline(part.file, createWriteStream(dest));

    const url = `/uploads/logos/${filename}`;
    const key = type === 'logo' ? 'logo_url' : type === 'hero' ? 'hero_image_url' : 'about_image_url';
    db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)').run(key, url);

    return { url, key };
  });
};
