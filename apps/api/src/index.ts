import { config } from './config.js';
import { db } from './db.js';
import { ensureBucket } from './storage.js';
import { buildApp } from './app.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

const app = await buildApp({
  transport: config.nodeEnv === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
});

// Ensure MinIO bucket exists
await ensureBucket();

const adminExists = db.prepare('SELECT id FROM admin_users WHERE email = ?').get(config.adminEmail);
if (!adminExists) {
  const hash = await bcrypt.hash(config.adminPassword, 10);
  db.prepare('INSERT INTO admin_users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
    nanoid(),
    config.adminEmail,
    hash,
    new Date().toISOString(),
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
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

await app.listen({ port: config.port, host: config.host });
app.log.info(`🟢 API running on http://${config.host}:${config.port}`);
