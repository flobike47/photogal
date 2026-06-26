import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

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
  dbPath: process.env.DB_PATH ?? resolve('./data/photogal.db'),
  adminEmail: requireEnv('ADMIN_EMAIL', 'admin@localhost'),
  adminPassword: requireEnv('ADMIN_PASSWORD', 'dev-changeme'),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  s3Endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  s3AccessKey: process.env.S3_ACCESS_KEY ?? 'minioadmin',
  s3SecretKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  s3Bucket: process.env.S3_BUCKET ?? 'photogal',
  storageLimitGb: parseFloat(process.env.STORAGE_LIMIT_GB ?? '0') || null,
};
