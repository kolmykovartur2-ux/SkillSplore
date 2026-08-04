import { test, expect } from '@playwright/test';

/**
 * Controls that only fail when something actually clicks them.
 *
 * The demo login shortcuts are here because I reported them broken from a
 * browser session whose synthetic clicks were never reaching the page. The
 * buttons were fine. A real click, asserted properly, is the only way to tell
 * those two situations apart.
 */

test('a demo login shortcut signs you in and lands on the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: 'Student' }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
});

test('every demo role shortcut works, not just the first', async ({ page }) => {
  for (const role of ['Administrator', 'Approved tutor', 'Pending tutor']) {
    await page.goto('/login');
    await page.getByRole('button', { name: role, exact: true }).click();
    await expect(page, `${role} shortcut should sign in`).toHaveURL(/\/dashboard/);

    await page.getByRole('button', { name: 'Account menu' }).click();
    await page.getByRole('button', { name: 'Log out' }).click();
    await expect(page.getByRole('link', { name: 'Log in' }).first()).toBeVisible();
  }
});

test('wrong credentials are rejected with a message and no session', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel('Email').fill('student@demo.skillsplore.local');
  await page.getByLabel('Password').fill('definitely-not-the-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();

  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test.describe('mobile navigation', () => {
  test.skip(({ isMobile }) => !isMobile, 'the nav only collapses below 860px');

  // The same destinations appear in the footer, so every assertion here is
  // scoped to the header nav rather than the whole page.
  const navLink = (page: import('@playwright/test').Page, name: string) =>
    page.locator('#primary-navigation').getByRole('link', { name });

  test('collapses behind a toggle, and keeps sign-in out of the menu', async ({ page }) => {
    await page.goto('/');

    // Hidden until asked for, so the bar does not wrap into several lines.
    await expect(navLink(page, 'Browse skills')).toBeHidden();
    // Signing in must never be the thing behind the menu.
    await expect(page.locator('.nav-account').getByRole('link', { name: 'Sign up' })).toBeVisible();

    await page.getByRole('button', { name: 'Open menu' }).click();

    await expect(navLink(page, 'Browse skills')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();

    await page.getByRole('button', { name: 'Close menu' }).click();
    await expect(navLink(page, 'Browse skills')).toBeHidden();
  });

  test('choosing a destination closes the menu behind you', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    await navLink(page, 'Browse skills').click();

    await expect(page).toHaveURL(/\/search/);
    // Collapsed again, rather than left open over the page you asked for.
    await expect(navLink(page, 'Browse skills')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();
  });
});

test('the page never scrolls sideways', async ({ page }) => {
  for (const path of ['/', '/search', '/login', '/about', '/safety']) {
    await page.goto(path);
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflows, `${path} should not overflow horizontally`).toBe(false);
  }
});
