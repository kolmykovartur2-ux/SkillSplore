/**
 * Sitemap generated from the database.
 *
 * Replaces the hand-written apps/web/public/sitemap.xml, which could only
 * list fixed routes. That file listed 14 URLs and could never include a tutor
 * profile or a subject landing page -- which are exactly the pages worth
 * finding, and the ones that change.
 *
 * Only lists URLs that genuinely resolve: approved profiles, active
 * categories and subjects, and the policy pages. A sitemap containing dead
 * URLs is worse than a smaller accurate one, because it teaches crawlers to
 * trust it less.
 */
import type { PrismaClient } from '@prisma/client';
import { LEGAL_DOCUMENTS } from '../content/legal/index.js';
import { env } from '../config/env.js';

interface Entry {
  loc: string;
  changefreq?: string;
  priority?: string;
  lastmod?: Date | null;
}

function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function origin(): string {
  return (env.PUBLIC_SITE_URL || env.WEB_ORIGIN).replace(/\/$/, '');
}

export async function buildSitemap(prisma: PrismaClient): Promise<string> {
  const base = origin();
  const entries: Entry[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/search', changefreq: 'daily', priority: '0.9' },
    { loc: '/categories', changefreq: 'weekly', priority: '0.9' },
    { loc: '/about', changefreq: 'monthly', priority: '0.6' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/requests/new', changefreq: 'monthly', priority: '0.6' },
  ];

  // Policy pages, from the same registry the routes come from -- so removing
  // a policy removes it from the sitemap automatically rather than leaving a
  // dead URL behind.
  for (const doc of LEGAL_DOCUMENTS) {
    entries.push({ loc: doc.path, changefreq: 'monthly', priority: '0.3' });
  }

  const [categories, subjects, profiles] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.subject.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
    }),
    // Only APPROVED. A draft, paused or suspended profile is not a public
    // page, and listing one would both 404 and publish something its owner
    // has not published.
    prisma.tutorProfile.findMany({
      where: { status: 'APPROVED' },
      select: { id: true, updatedAt: true },
    }),
  ]);

  // Single-facet filters are the long-tail landing pages -- "someone to teach
  // me NCEA calculus" is what a person actually searches for. These match the
  // routes the crawler shell marks indexable; multi-facet URLs are noindex and
  // deliberately absent here.
  for (const c of categories) {
    entries.push({ loc: `/search?categoryId=${c.id}`, changefreq: 'weekly', priority: '0.7', lastmod: c.updatedAt });
  }
  for (const s of subjects) {
    entries.push({ loc: `/search?subjectId=${s.id}`, changefreq: 'weekly', priority: '0.6', lastmod: s.updatedAt });
  }
  for (const p of profiles) {
    entries.push({ loc: `/tutors/${p.id}`, changefreq: 'weekly', priority: '0.8', lastmod: p.updatedAt });
  }

  const urls = entries
    .map((e) => {
      const parts = [`    <loc>${xmlEscape(base + e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod.toISOString().slice(0, 10)}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
