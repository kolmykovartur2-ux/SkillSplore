import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from './helpers.js';
import { renderShell } from '../src/lib/seoShell.js';

// A minimal stand-in for the built index.html.
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>SkillSplore | Find Someone to Learn From</title>
    <meta name="description" content="original" />
    <meta property="og:title" content="original" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index.js"></script>
  </body>
</html>`;

function rootContent(html: string): string {
  const m = /<div id="root">([\s\S]*)<\/div>/.exec(html);
  return m ? m[1]! : '';
}

describe('crawler shell', () => {
  // Creates its own catalogue rather than relying on seed state, so the
  // assertions mean the same thing on any database.
  beforeAll(async () => {
    const existing = await prisma.category.findUnique({ where: { normalizedName: 'seo fixture' } });
    if (existing) return;
    await prisma.category.create({
      data: {
        name: 'SEO Fixture',
        normalizedName: 'seo fixture',
        slug: 'seo-fixture',
        isFeatured: true,
        subjects: {
          create: Array.from({ length: 30 }, (_, i) => ({
            name: `Fixture Subject ${i}`,
            normalizedName: `fixture subject ${i}`,
            slug: `fixture-subject-${i}`,
          })),
        },
      },
    });
  });

  it('injects readable content on the homepage', async () => {
    const html = await renderShell(prisma, '/', SHELL);
    const body = rootContent(html);
    expect(body).toContain('<h1>');
    // The featured fixture category must appear, proving live data reaches
    // the shell rather than only static copy.
    expect(body).toContain('SEO Fixture');
  });

  it('lists the catalogue on /categories', async () => {
    const html = await renderShell(prisma, '/categories', SHELL);
    const body = rootContent(html);
    expect(body).toContain('SEO Fixture');
    expect(body).toContain('Fixture Subject 0');
    expect(body).toContain('Fixture Subject 29');
  });

  it('renders policy text for a policy route', async () => {
    const html = await renderShell(prisma, '/privacy', SHELL);
    const body = rootContent(html);
    expect(body).toContain('Privacy Policy');
    // The no-sale statement is the sentence most worth being crawlable.
    expect(body).toContain('does not sell personal information');
  });

  it('leaves app routes completely untouched', async () => {
    // Dashboard, messages and admin are behind a login and must not be
    // described to a crawler at all.
    for (const route of ['/dashboard', '/messages', '/admin', '/account']) {
      const html = await renderShell(prisma, route, SHELL);
      expect(html, `${route} should be served unchanged`).toBe(SHELL);
    }
  });

  it('sets a route-specific title and canonical', async () => {
    const html = await renderShell(prisma, '/categories', SHELL);
    expect(html).toMatch(/<title>Everything you can learn/);
    expect(html).toMatch(/rel="canonical"/);
  });

  it('does not leave duplicate titles or descriptions', async () => {
    const html = await renderShell(prisma, '/', SHELL);
    expect(html.match(/<title>/g) ?? []).toHaveLength(1);
    expect(html.match(/name="description"/g) ?? []).toHaveLength(1);
    // The original og:title must be replaced, not appended to.
    expect(html.match(/property="og:title"/g) ?? []).toHaveLength(1);
  });

  it('escapes content rather than injecting raw HTML', async () => {
    const html = await renderShell(prisma, '/privacy', SHELL);
    const body = rootContent(html);
    // Policy text contains markdown and angle-bracket-ish characters; none of
    // it should become live markup beyond the paragraph tags we emit.
    const allowed = body.replace(/<\/?(p|h1|h2|ul|li|a|strong)\b[^>]*>/g, '');
    expect(allowed).not.toMatch(/<script/i);
    expect(allowed).not.toMatch(/<[a-z]+\s/i);
  });
});
