import { test as setup, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_STATE } from './helpers/auth';

// L'écran de login n'expose que Google : la session admin est ouverte via l'API
// (POST /api/auth/login), puis réutilisée par les specs admin.
setup('session admin', async ({ request }) => {
  const res = await request.post('/api/auth/login', { data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  expect(res.ok(), `login admin (${ADMIN_EMAIL}) : vérifie ADMIN_PASSWORD dans .env`).toBeTruthy();
  await request.storageState({ path: ADMIN_STATE });
});
