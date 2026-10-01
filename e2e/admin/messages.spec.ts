import { test, expect, adminState } from '../fixtures';
import type { Page } from '@playwright/test';
import { reseed } from '../helpers/reseed';

test.use(adminState);
test.afterAll(reseed);

const rows = (page: Page) => page.locator('.ant-table-tbody tr');
const drawer = (page: Page) => page.locator('.ant-drawer-content');
const menuBadge = (page: Page) => page.locator('.ant-menu .ant-badge-count');

// A18 Messages
test.describe('A18 — Messages de contact', () => {
  test('liste les messages, du plus récent au plus ancien, avec leur statut', async ({ page }) => {
    await page.goto('/admin/messages');
    await expect(rows(page)).toHaveCount(5);
    await expect(page.locator('.ant-card-head').getByText('3 non lu(s)')).toBeVisible();
    await expect(rows(page).first()).toContainText('Claire Dubois');
    await expect(rows(page).filter({ hasText: 'Sophie Bernard' })).toContainText('Lu');
    await expect(page.locator('.ant-table-tbody').getByText('Non lu', { exact: true })).toHaveCount(3);
  });

  test('lire un message l\'ouvre dans le tiroir et le marque comme lu', async ({ page }) => {
    await page.goto('/admin/messages');
    await expect(menuBadge(page)).toHaveText('3');
    await rows(page).filter({ hasText: 'Entreprise ACME' }).getByRole('button', { name: 'Lire' }).click();

    await expect(drawer(page)).toContainText('Message de Entreprise ACME');
    await expect(drawer(page)).toContainText('rh@acme.example.com');
    await expect(drawer(page)).toContainText('Pouvez-vous nous rappeler ?'); // message multi-ligne complet
    await expect(drawer(page).getByRole('link', { name: 'Répondre par email' }))
      .toHaveAttribute('href', 'mailto:rh@acme.example.com?subject=Re: Votre message');

    await expect(page.locator('.ant-card-head').getByText('2 non lu(s)')).toBeVisible();
    await expect(menuBadge(page)).toHaveText('2');
    await page.locator('.ant-drawer-close').click();
    await expect(rows(page).filter({ hasText: 'Entreprise ACME' })).toContainText('Lu');
  });

  test('cliquer sur une ligne ouvre aussi le message', async ({ page }) => {
    await page.goto('/admin/messages');
    await rows(page).filter({ hasText: 'Lucas Petit' }).getByText('lucas@example.com').click();
    await expect(drawer(page)).toContainText('Message de Lucas Petit');
  });

  test('supprimer depuis le tiroir', async ({ page }) => {
    await page.goto('/admin/messages');
    await rows(page).filter({ hasText: 'Marc Lefèvre' }).getByRole('button', { name: 'Lire' }).click();
    await drawer(page).getByRole('button', { name: 'Supprimer' }).click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Message supprimé')).toBeVisible();
    await expect(drawer(page)).toBeHidden();
    await expect(rows(page).filter({ hasText: 'Marc Lefèvre' })).toHaveCount(0);
  });

  test('supprimer depuis la table', async ({ page }) => {
    await page.goto('/admin/messages');
    await expect(rows(page).filter({ hasText: 'Sophie Bernard' })).toBeVisible();
    const count = await rows(page).count();
    await rows(page).filter({ hasText: 'Sophie Bernard' }).locator('button:has(.anticon-delete)').click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Message supprimé')).toBeVisible();
    await expect(rows(page)).toHaveCount(count - 1);
  });
});
