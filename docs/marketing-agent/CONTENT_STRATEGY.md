# Content strategy

## Pillars (seeded in `prisma/seed.ts`, editable via the dashboard's Pillars page)

| Pillar | Target share | What it covers |
| --- | --- | --- |
| Building SkillSplore | 25% | Founder journey, honest progress updates, product decisions, mistakes |
| Problems in finding specialised help | 10% | Why word-of-mouth/directories fall short |
| Advice for customers | 20% | Writing a useful request, comparing providers, using SkillSplore well |
| Advice for providers | 20% | Profile guidance, pricing, what approval does/doesn't mean |
| Product demonstrations | 15% | Real walkthroughs of search, requests, profiles, messaging |
| Founding-community recruitment | 10% | Calling founding tutors and early students |

Percentages are a planning target, not a hard limit — the calendar shows actual distribution so
drift is visible, but nothing blocks posting off-ratio.

## Cadence (`src/lib/cadence.ts`)

Conservative default: at most 1 post/day, at least 18 hours apart, ~3/week (suggested
Monday/Wednesday/Friday). Scheduling a post that breaks these rules shows a warning with an
explicit override — it never silently blocks the founder.

Once real analytics exist, the system may *suggest* a cadence change, but changing the actual
constants in `src/lib/cadence.ts` (or, in a future version, a database-backed setting) is always
a manual, human decision — see §10 of the original product spec.

## Content types (§8 of the original product spec)

Founder journey · Marketplace education · Provider recruitment · Customer acquisition · Product
demonstrations · Credibility and trust · Research and discussion · Launch announcements.

These map onto the six pillars above (not 1:1 — several content types can live under one
pillar), selected per-brief rather than as a separate database dimension, to keep the schema
simple. `ContentBrief.objective` and `.mainIdea` capture the actual intent per post.

## Campaigns (seeded, editable via the dashboard)

- **Why SkillSplore** — explain the problem and product model.
- **Founding tutors** — recruit 20–50 credible early tutors.
- **Early students** — obtain the first ten genuine tutoring requests.
- **Building openly** — build trust by documenting progress honestly.

## What content generation is never allowed to do

- Invent user/provider/customer counts, revenue, conversion rates, launch dates.
- Invent testimonials, quotes, customer stories, or partnerships.
- Claim legal approval or verification that hasn't occurred.
- Advertise a category, location, or stage beyond `MARKETPLACE_LAUNCH_*` configuration.

These are enforced two ways: `src/lib/facts.ts` only ever returns `MarketingFact` rows that are
`isPublic` and currently valid, and `src/lib/contentValidation.ts` flags (not blocks) numeric
claims that aren't backed by a fact reference, banned language, banned CTAs, and excess
hashtags for human review before approval.
