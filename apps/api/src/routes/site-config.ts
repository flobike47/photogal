import type { FastifyPluginAsync } from 'fastify';
import { db, getSiteConfig } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload, download, getContentType } from '../storage.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const ALLOWED_CONFIG_KEYS = new Set([
  'site_name', 'site_description', 'primary_color', 'contact_email',
  'hero_title', 'hero_subtitle', 'footer_text', 'logo_url', 'hero_image_url',
  'about_title', 'about_text', 'about_image_url', 'social_instagram',
  'social_facebook', 'social_pinterest', 'social_website', 'heading_font', 'site_theme',
  'cta_button_text', 'portfolio_title', 'portfolio_cta_text',
  'contact_page_title', 'contact_bg_color', 'contact_bg_url',
]);

export const siteConfigRoutes: FastifyPluginAsync = async (app) => {
  // Public: get all site config
  app.get('/', async () => getSiteConfig());

  // Admin: storage usage stats
  app.get('/storage', { preHandler: [authenticate] }, async () => {
    const { total } = db.prepare('SELECT COALESCE(SUM(size), 0) as total FROM photos').get() as { total: number };
    return { used_bytes: total, limit_gb: config.storageLimitGb };
  });

  // Public: serve a logo/hero/about image from S3
  app.get<{ Params: { type: string } }>('/asset/:type', async (request, reply) => {
    const { type } = request.params;
    if (!['logo', 'hero', 'about', 'contact'].includes(type)) return reply.status(400).send({ error: 'Type invalide' });

    const key = `logos/${type}`;
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
    if (!['logo', 'hero', 'about', 'contact'].includes(type)) return reply.status(400).send({ error: 'Type invalide' });

    const part = await request.file();
    if (!part) return reply.status(400).send({ error: 'Aucun fichier fourni' });

    if (!ALLOWED_IMAGE_TYPES.has(part.mimetype)) {
      await part.toBuffer();
      return reply.status(400).send({ error: 'Format non autorisé. Formats acceptés : JPEG, PNG, WebP, GIF.' });
    }

    const buffer = await part.toBuffer();
    await upload(`logos/${type}`, buffer, part.mimetype);

    const url = `/api/config/asset/${type}`;
    const configKey = type === 'logo' ? 'logo_url' : type === 'hero' ? 'hero_image_url' : type === 'about' ? 'about_image_url' : 'contact_bg_url';
    db.prepare('INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)').run(configKey, url);

    return { url, key: configKey };
  });
};
