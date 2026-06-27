import './types.js';
import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { config } from './config.js';
import { db } from './db.js';
import { ensureBucket } from './storage.js';
import { authRoutes } from './routes/auth.js';
import { albumRoutes } from './routes/albums.js';
import { photoRoutes } from './routes/photos.js';
import { siteConfigRoutes } from './routes/site-config.js';
import { contactRoutes } from './routes/contact.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const app = Fastify({
  logger: {
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
});

await app.register(fastifyHelmet, {
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,  // autorise l'iframe du bouton Google
  crossOriginOpenerPolicy: false,    // autorise la popup Google à communiquer avec la page
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
await app.register(fastifyCors, { origin: config.corsOrigin, credentials: true });
await app.register(fastifyCookie);
await app.register(fastifyJwt, {
  secret: config.jwtSecret,
  cookie: { cookieName: 'pg_session', signed: false },
});
await app.register(fastifyMultipart, { limits: { fileSize: 100 * 1024 * 1024 } });

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(albumRoutes, { prefix: '/api/albums' });
await app.register(photoRoutes, { prefix: '/api/photos' });
await app.register(siteConfigRoutes, { prefix: '/api/config' });
await app.register(contactRoutes, { prefix: '/api/contact' });

app.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve React SPA in production (web dist is bundled into the API image)
const webDist = resolve('./apps/web/dist');
if (existsSync(webDist)) {
  await app.register(fastifyStatic, { root: webDist, wildcard: false });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    return reply.sendFile('index.html', webDist);
  });
}

// Ensure MinIO bucket exists
await ensureBucket();

const adminExists = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(config.adminEmail);
if (!adminExists) {
  const hash = await bcrypt.hash(config.adminPassword, 10);
  db.prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    nanoid(), config.adminEmail, hash, new Date().toISOString(),
  );
  app.log.info(`Admin user created: ${config.adminEmail}`);
}

const shutdown = async (signal: string) => {
  app.log.info(`Received ${signal}, shutting down...`);
  try {
    await app.close();
    db.close();
  } catch (e) {
    app.log.error({ err: e }, 'error during shutdown');
  }
  process.exit(0);
};
process.on('SIGINT', () => { void shutdown('SIGINT'); });
process.on('SIGTERM', () => { void shutdown('SIGTERM'); });

await app.listen({ port: config.port, host: config.host });
app.log.info(`🟢 API running on http://${config.host}:${config.port}`);
