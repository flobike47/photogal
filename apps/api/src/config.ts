import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load .env from monorepo root (two levels up from apps/api/)
dotenvConfig({ path: resolve(import.meta.dirname, '../../../.env') });

function requireEnv(name: string, devDefault: string): string {
  const val = process.env[name];
  if (val) return val;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[FATAL] Required env var "${name}" is not set. Refusing to start.`);
  }
  return devDefault;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-do-not-use-in-production'),
  uploadsDir: resolve(process.env.UPLOADS_DIR ?? './uploads'),
  adminEmail: requireEnv('ADMIN_EMAIL', 'admin@localhost'),
  adminPassword: requireEnv('ADMIN_PASSWORD', 'dev-changeme'),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
