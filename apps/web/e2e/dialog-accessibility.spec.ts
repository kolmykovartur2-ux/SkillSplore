import { test, expect } from '@playwright/test';

/**
 * Keyboard behaviour of the shared Modal, driven by real key events.
 *
 * These properties were previously checked by calling into the page from a
 * console, which cannot prove that a browser's own Tab handling is contained.
 * Only a real Tab press can.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Student' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});

async function openFirstProfileReportDialog(page: import('@playwright/test').Page) {
  await page.goto('/search');
  await page.locator('a[href^="/tutors/"]').first().click();
  await expect(page).toHaveURL(/\/tutors\/\d+/);

  const opener = page.getByRole('button', { name: 'Report profile' });
  await opener.focus();
  await opener.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  return opener;
}

test('Tab stays inside an open dialog instead of reaching the page behind it', async ({ page }) => {
  await openFirstProfileReportDialog(page);
  const dialog = page.getByRole('dialog');

  // Well past the number of controls in the dialog: without a trap this walks
  // out into the profile page underneath.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
    expect(inside, `focus escaped the dialog after ${i + 1} Tab presses`).toBe(true);
  }

  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Shift+Tab');
    const inside = await dialog.evaluate((d) => d.contains(document.activeElement));
    expect(inside, `focus escaped the dialog after ${i + 1} Shift+Tab presses`).toBe(true);
  }
});

test('Escape closes a dialog and hands focus back to whatever opened it', async ({ page }) => {
  const opener = await openFirstProfileReportDialog(page);

  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(opener).toBeFocused();
});

test('the page behind a dialog cannot scroll', async ({ page }) => {
  await openFirstProfileReportDialog(page);
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  // Restored rather than left locked, which would freeze the page afterwards.
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});

test('a report can be submitted for a review, not only a profile', async ({ page }) => {
  // Walk profiles until one has a review, rather than skipping whenever the
  // first result happens not to. A test that always skips proves nothing.
  await page.goto('/search');
  // Results load asynchronously; collecting hrefs before they render finds none.
  await expect(page.locator('a[href^="/tutors/"]').first()).toBeVisible();
  const hrefs = await page.locator('a[href^="/tutors/"]').evaluateAll((els) =>
    Array.from(new Set(els.map((e) => (e as HTMLAnchorElement).getAttribute('href')!))),
  );
  expect(hrefs.length, 'search returned no profiles to inspect').toBeGreaterThan(0);

  let reviewReport = null as import('@playwright/test').Locator | null;
  const seen: string[] = [];
  for (const href of hrefs) {
    await page.goto(href);
    // ReportButton renders nothing until the session has resolved, so checking
    // immediately after navigation finds no button even where a review exists.
    await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
    const heading = await page.getByRole('heading', { name: /^Reviews \(/ }).innerText();
    const candidate = page.getByRole('button', { name: 'Report review' }).first();
    const count = await candidate.count();
    seen.push(`${href} ${heading} buttons=${count}`);
    if (count > 0) { reviewReport = candidate; break; }
  }
  expect(reviewReport, `no profile offered a review to report. Saw:\n${seen.join('\n')}`).not.toBeNull();

  await reviewReport!.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Reason').selectOption('Spam or advertising');
  await dialog.getByRole('button', { name: 'Submit report' }).click();

  await expect(dialog).toBeHidden();
});
