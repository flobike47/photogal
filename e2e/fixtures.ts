import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { ADMIN_STATE, SESSION_COOKIE, signVisitorToken } from './helpers/auth';

interface Fixtures {
  /** Connecte la page comme visiteur Google (cookie + état front en sessionStorage) */
  loginAsVisitor: (email: string) => Promise<void>;
  /** Client API authentifié admin, indépendant de la page */
  adminApi: APIRequestContext;
  /** Lit le presse-papiers de la page */
  readClipboard: () => Promise<string>;
}

export const test = base.extend<Fixtures>({
  context: async ({ context, baseURL }, use) => {
    // Le script Google Sign-In n'est pas testable : on le bloque pour éviter réseau et lenteurs
    await context.route(/accounts\.google\.com/, (route) => route.abort());
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL });
    await use(context);
  },

  loginAsVisitor: async ({ context, baseURL }, use) => {
    await use(async (email: string) => {
      await context.addCookies([{ name: SESSION_COOKIE, value: signVisitorToken(email), url: baseURL! }]);
      await context.addInitScript((e) => {
        sessionStorage.setItem(
          'photogal-auth',
          JSON.stringify({
            state: { email: e, isAuthenticated: true, isAdmin: false },
            version: 0,
          }),
        );
      }, email);
    });
  },

  adminApi: async ({ playwright, baseURL }, use) => {
    const api = await playwright.request.newContext({ baseURL, storageState: ADMIN_STATE });
    await use(api);
    await api.dispose();
  },

  readClipboard: async ({ page }, use) => {
    await use(() => page.evaluate(() => navigator.clipboard.readText()));
  },
});

export { expect };
export const adminState = { storageState: ADMIN_STATE };
