import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Même .env que l'API : identifiants admin, JWT_SECRET (pour signer les sessions visiteur)
const envFile = resolve(__dirname, '../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  // DB et bucket partagés : exécution séquentielle pour des résultats déterministes
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  globalSetup: './global-setup.ts',
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    cwd: resolve(__dirname, '..'),
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      dependencies: ['setup'],
    },
    {
      // Rendu mobile (menu burger, galerie) uniquement
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /public\/(navigation|gallery)\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
});
