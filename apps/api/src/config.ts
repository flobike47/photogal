import 'dotenv/config';
import { resolve } from 'path';

export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  uploadsDir: resolve(process.env.UPLOADS_DIR ?? './uploads'),
  adminEmail: process.env.ADMIN_EMAIL ?? 'admin@photogal.com',
  adminPassword: process.env.ADMIN_PASSWORD ?? 'changeme123',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
