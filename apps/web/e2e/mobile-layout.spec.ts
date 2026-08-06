/**
 * Guards against horizontal overflow on narrow screens.
 *
 * This exists because of a real bug that shipped: `.footer-groups` is a flex
 * item, and flex items default to `min-width: auto`, so it refused to shrink
 * below its three 150px grid tracks. The footer forced the document to 534px
 * inside a 375px viewport, which makes a phone scale the ENTIRE page down to
 * fit -- every page, not just the footer.
 *
 * It was invisible in desktop development and invisible in the existing e2e
 * suite, because everything still rendered and every selector still matched.
 * Nothing was broken enough to fail an assertion; it just looked wrong.
 *
 * Checking `scrollWidth <= clientWidth` catches the whole class of mistake --
 * a hard-coded width, a long unbroken string, an oversized image -- regardless
 * of which element causes it. On failure it names the offending elements,
 * because "the page is 159px too wide" is not on its own actionable.
 */
import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/', name: 'home' },
  { path: '/search', name: 'search' },
  { path: '/categories', name: 'categories' },
  { path: '/requests/new', name: 'post a request' },
  { path: '/login', name: 'login' },
  { path: '/privacy', name: 'privacy policy' },
];

test.describe('mobile layout', () => {
  // Only meaningful at a phone width; on desktop there is nothing to overflow.
  test.skip(({ isMobile }) => !isMobile, 'narrow-viewport check');

  for (const route of ROUTES) {
    test(`${route.name} does not scroll horizontally`, async ({ page }) => {
      await page.goto(route.path);
      // The footer is the usual culprit and sits below the fold, so the check
      // has to wait for the real layout rather than the first paint.
      await page.waitForLoadState('networkidle');

      const result = await page.evaluate(() => {
        const de = document.documentElement;
        const offenders = Array.from(document.querySelectorAll<HTMLElement>('*'))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            // Ignore zero-size and intentionally off-screen elements (closed
            // drawers, visually-hidden labels) -- they do not create a
            // scrollbar and flagging them would make this test noise.
            if (r.width === 0 || r.height === 0) return false;
            return r.right > de.clientWidth + 1;
          })
          .slice(0, 5)
          .map((el) => {
            const cls = typeof el.className === 'string' ? el.className : '';
            return `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).join('.')}` : ''}`
              + ` (right: ${Math.round(el.getBoundingClientRect().right)}px)`;
          });
        return { scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, offenders };
      });

      expect(
        result.scrollWidth,
        `${route.path} overflows by ${result.scrollWidth - result.clientWidth}px `
        + `(viewport ${result.clientWidth}px). Widest elements:\n  `
        + (result.offenders.join('\n  ') || '(none identified)'),
      ).toBeLessThanOrEqual(result.clientWidth);
    });
  }
});
