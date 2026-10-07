import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Base SQLite en mémoire et secrets de test : jamais la DB ni le bucket de dev.
    // L'env est posé avant le chargement de config.ts, et dotenv n'écrase pas une variable déjà définie.
    env: {
      NODE_ENV: 'test',
      DB_PATH: ':memory:',
      JWT_SECRET: 'test-secret',
      ADMIN_EMAIL: 'admin@test.local',
      ADMIN_PASSWORD: 'test-password',
      S3_ENDPOINT: 'http://127.0.0.1:1',
      S3_BUCKET: 'photogal-test',
    },
  },
});
