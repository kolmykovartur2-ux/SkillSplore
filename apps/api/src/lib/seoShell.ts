/**
 * Server-rendered HTML for crawlers.
 *
 * The client is a Vite SPA, so the built index.html body is just
 * `<div id="root"></div>`. Anything that does not execute JavaScript -- most
 * AI crawlers, and Google unreliably -- sees an empty page. For a marketplace
 * that depends on being found, that is a real problem, and it was never
 * recorded as a tradeoff when the stack was chosen (see TECHNICAL_DEBT.md).
 *
 * Rather than adding a prerender build step or a headless browser, this hooks
 * the place the API already serves index.html and injects:
 *
 *   - a route-specific <title> and meta description
 *   - canonical and Open Graph tags
 *   - JSON-LD describing the organisation
 *   - real readable content inside #root
 *
 * The content inside #root matters: React's createRoot replaces the
 * container's children on mount, so a person with JavaScript never sees it,
 * and a crawler without JavaScript gets the whole thing. No duplicate-content
 * problem, no separate rendering path to keep in sync with the app.
 *
 * This deliberately does NOT try to render the React tree server-side. That
 * would mean a second rendering path that drifts from the client. What it
 * renders is a plain, honest summary of the page -- which is what a crawler
 * actually wants.
 */
import type { PrismaClient } from '@prisma/client';
import { LEGAL_DOCUMENTS } from '../content/legal/index.js';
import { env } from '../config/env.js';

function esc(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Canonical public origin. Falls back to WEB_ORIGIN in non-production. */
function siteOrigin(): string {
  return env.PUBLIC_SITE_URL || env.WEB_ORIGIN;
}

export interface ShellContent {
  title: string;
  description: string;
  /** HTML placed inside #root. Already escaped by the builder. */
  body: string;
}

const SITE_NAME = 'SkillSplore';
const DEFAULT_DESCRIPTION =
  'A moderated noticeboard for finding someone who can teach you a subject or skill. '
  + 'Learn online or in person, or post what you want to learn.';

/**
 * Strips the markdown a policy body is written in down to readable text.
 *
 * Crude on purpose -- a crawler wants the words, not the formatting, and a
 * real markdown renderer here would be a dependency for no benefit.
 */
function policyToText(markdown: string, maxChars = 12000): string {
  const text = markdown
    .replace(/^#{1,6}\s+/gm, '')       // headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/`([^`]+)`/g, '$1')       // code
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/^\s*[->|]\s?/gm, '')     // quotes, bullets, table pipes
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

function paragraphs(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('\n');
}

/** Routes that are public and worth describing. */
const STATIC_ROUTES: Record<string, { title: string; description: string; body: string }> = {
  '/about': {
    title: `About ${SITE_NAME}`,
    description: `What ${SITE_NAME} is, how it works, and what it deliberately does not do.`,
    body: `<h1>About ${SITE_NAME}</h1>
<p>${SITE_NAME} is a moderated noticeboard that helps people find someone who may be able to teach them a subject or skill.</p>
<p>We provide the platform: profiles, search, learning requests, responses, messaging, reporting, reviews and moderation. We do not employ the people listed, do not guarantee anyone's qualifications or safety, and are not a party to the arrangement two users make. Lessons and payment are arranged directly between them.</p>`,
  },
  '/contact': {
    title: `Contact ${SITE_NAME}`,
    description: `How to contact ${SITE_NAME} about support, privacy, security or a dispute.`,
    body: `<h1>Contact ${SITE_NAME}</h1>
<p>SkillSplore Limited, a New Zealand registered company, company number 9449842.</p>
<p>Support, privacy, security and disputes: admin@skillsplore.org</p>`,
  },
  '/search': {
    title: `Find someone to learn from | ${SITE_NAME}`,
    description: 'Search people who teach academic subjects, music, languages, trades, creative skills and more.',
    body: `<h1>Find someone to learn from</h1>
<p>Search by subject, category, location and format. Every profile is reviewed before it is published.</p>`,
  },
  '/requests/new': {
    title: `Post what you want to learn | ${SITE_NAME}`,
    description: 'Describe what you want to learn and let people who teach it come to you.',
    body: `<h1>Post what you want to learn</h1>
<p>Describe what you want to learn, in your own words. You can post anything, even if it is not in our catalogue.</p>`,
  },
};

async function homeContent(prisma: PrismaClient): Promise<ShellContent> {
  const categories = await prisma.category.findMany({
    where: { isFeatured: true, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { name: true, slug: true, _count: { select: { subjects: true } } },
  });

  const list = categories
    .map((c) => `<li><a href="/search">${esc(c.name)}</a> — ${c._count.subjects} subjects</li>`)
    .join('\n');

  return {
    title: `${SITE_NAME} | Find Someone to Learn From`,
    description: DEFAULT_DESCRIPTION,
    body: `<h1>Find someone to learn from</h1>
<p>${esc(DEFAULT_DESCRIPTION)}</p>
<h2>Popular categories</h2>
<ul>${list}</ul>
<p><a href="/categories">See every category</a> · <a href="/requests/new">Post what you want to learn</a></p>`,
  };
}

async function categoriesContent(prisma: PrismaClient): Promise<ShellContent> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
    select: {
      name: true,
      subjects: { where: { isActive: true }, orderBy: { name: 'asc' }, select: { name: true } },
    },
  });

  const totalSubjects = categories.reduce((n, c) => n + c.subjects.length, 0);
  const sections = categories
    .map((c) => `<h2>${esc(c.name)}</h2>\n<p>${c.subjects.map((s) => esc(s.name)).join(', ')}</p>`)
    .join('\n');

  return {
    title: `Everything you can learn | ${SITE_NAME}`,
    description: `Browse ${categories.length} categories and ${totalSubjects} subjects you can learn on ${SITE_NAME}.`,
    body: `<h1>Everything you can learn here</h1>
<p>${categories.length} categories, ${totalSubjects} subjects.</p>
${sections}`,
  };
}

function policyContent(path: string): ShellContent | null {
  const doc = LEGAL_DOCUMENTS.find((d) => d.path === path);
  if (!doc) return null;
  const text = policyToText(doc.body);
  return {
    title: `${doc.title} | ${SITE_NAME}`,
    description: `${doc.title} for ${SITE_NAME}.`,
    body: `${paragraphs(text)}`,
  };
}

async function contentFor(prisma: PrismaClient, path: string): Promise<ShellContent | null> {
  if (path === '/') return homeContent(prisma);
  if (path === '/categories') return categoriesContent(prisma);

  const staticRoute = STATIC_ROUTES[path];
  if (staticRoute) return staticRoute;

  return policyContent(path);
}

function organisationJsonLd(): string {
  const origin = siteOrigin();
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: 'SkillSplore Limited',
    url: origin,
    email: 'admin@skillsplore.org',
    description: DEFAULT_DESCRIPTION,
    areaServed: ['NZ', 'AU'],
  });
}

/**
 * Rewrites the built index.html for one request.
 *
 * Returns the original html untouched when the route is not one we describe,
 * so anything app-shaped (dashboard, messages, admin) is unaffected.
 */
export async function renderShell(
  prisma: PrismaClient,
  path: string,
  html: string,
): Promise<string> {
  let content: ShellContent | null = null;
  try {
    content = await contentFor(prisma, path);
  } catch {
    // A crawler getting the plain SPA shell is a far better outcome than a
    // 500, so a database hiccup here must never break page delivery.
    return html;
  }
  if (!content) return html;

  const origin = siteOrigin();
  const canonical = `${origin.replace(/\/$/, '')}${path}`;

  const head = `
    <title>${esc(content.title)}</title>
    <meta name="description" content="${esc(content.description)}" />
    <link rel="canonical" href="${esc(canonical)}" />
    <meta property="og:title" content="${esc(content.title)}" />
    <meta property="og:description" content="${esc(content.description)}" />
    <meta property="og:url" content="${esc(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta name="twitter:card" content="summary" />
    <script type="application/ld+json">${organisationJsonLd()}</script>
  `.trim();

  // Replace the static title/description/canonical/OG that index.html ships
  // with, so a crawler does not see two of each.
  let out = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '');

  out = out.replace('</head>', `${head}\n  </head>`);

  // React's createRoot clears the container on mount, so this is invisible to
  // anyone running JavaScript and is the whole page to anyone who is not.
  out = out.replace(
    '<div id="root"></div>',
    `<div id="root">${content.body}</div>`,
  );

  return out;
}
