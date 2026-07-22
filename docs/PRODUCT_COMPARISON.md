# Learnfolk vs. profi.ru — structural comparison and roadmap

profi.ru is the user's named reference for both visual design and product structure. This document
records what was actually observed on profi.ru (homepage + the `репетиторы`/tutoring vertical
landing page), what Learnfolk now matches, and what's still a deliberate gap with a prioritized
plan to close it. Written 2026-07-23 after a live review of profi.ru.

## What profi.ru actually does

**Homepage**
- One-line search bar over a hero, immediately followed by a row of trust stats
  ("21,048,295 clients already found their pro").
- A "practically done for you" promo strip (top-matched pros, rating ≥4.8, price known upfront).
- A **category grid**: ~10 top-level verticals (Tutors, Repair specialists, Beauty, Freelancers,
  Accountants & lawyers, Sports coaches, Performers, Home staff, Vets, Driving instructors, …),
  each tile showing a live specialist count and its top 5 subcategories plus "All N services →".
  The tutoring vertical alone lists **1,928 subjects**.
- A 3-step "how it works" explainer: choose where/when → describe the task → specialists write to
  you with a quote.
- A live review feed (reviewer name, specialist name+rating, one-line excerpt, city, timestamp).

**Category landing page** (e.g. `/repetitor/`)
- Its own hero + the same "describe once, they quote you" pitch.
- A **starting-price grid** per subcategory: "Music tutors — from ₽1000/hr", "Russian — from ₽700/hr",
  etc., each clickable.
- Aggregate trust stats specific to that vertical: total specialists, % positive reviews (98%),
  average rating (4.93), reviews in the last 12 months.
- A specialist list where each **card itself has a "Contact" button** — no need to open the full
  profile first — plus a "passport verified" badge, rating, review count.

**Visual system**
- Flat, borderless, generous rounded corners (12–24px), a single saturated crimson accent
  (`#FA2A48`) reserved for primary actions, near-black text (`#181818`) on white, soft
  lavender-grey fills (`#EFF1F8`) for secondary surfaces, system font stack, no drop shadows on
  buttons/tiles.

## Where Learnfolk now matches this (changed today)

| profi.ru pattern | Learnfolk implementation |
| --- | --- |
| Deep subject hierarchy (1,928 tutoring subjects) | [`apps/api/prisma/taxonomy.data.ts`](../apps/api/prisma/taxonomy.data.ts) — 12 categories, 97 subjects, seeded via `demo:seed`. Same shape (category → subjects), extensible by an admin at runtime via `/admin/categories` and `/admin/subjects`. Depth is intentionally smaller for an MVP — see Roadmap. |
| Homepage category grid with live counts | `Home.tsx` now renders a `cat-grid` of category tiles pulling from a new `GET /api/taxonomy/overview` endpoint — real `tutorCount`/`subjectCount` per category, top 5 subjects + "All N subjects →", exactly the profi.ru tile shape. |
| Flat, crimson, rounded-tile visual system | `apps/web/src/styles.css` rewritten: `--primary: #fa2a48`, `--surface-2: #eff1f8`, 18–24px radii, no button drop-shadows, system font stack — matches profi.ru's computed styles (verified against the live site). |
| "Describe once, they quote you" value prop | Added an explicit 4-tile value-prop row on the homepage (`.props`) restating this exact flow, which Learnfolk already implements end-to-end (student requests → tutor responses with hidden competing rates). |
| Grouped/searchable subject pickers | Request creation and tutor-onboarding subject pickers now group by category (`<optgroup>`) and the onboarding one adds a live text filter — necessary once the catalogue is 90+ subjects instead of 10. |

## Deliberate gaps — not yet built, prioritized

These are real structural differences, called out honestly rather than silently skipped.

1. **Category landing pages** (`/subjects/piano`, `/subjects/programming`, etc.) — profi.ru gives
   every subcategory its own SEO landing page with a starting price and a filtered specialist list.
   Learnfolk currently routes that traffic to `/search?subjectId=…` instead of a dedicated page.
   *Priority: medium.* Would need a new route + a "from $X/hr" aggregate query per subject.

2. **Contact-from-card** — profi.ru's specialist cards have their own "Contact" button; Learnfolk's
   `TutorCard` requires opening the full profile first. *Priority: low-medium* — easy to add (reuse
   the existing `/conversations/contact` endpoint from a modal triggered on the card), but opening
   the profile first is arguably better for an education product where credentials matter more than
   a quick repair job.

3. **Passport/ID verification** — profi.ru explicitly verifies government ID, not just claimed
   qualifications. Learnfolk's tutor verification is qualification-document-based only (see
   `Qualification.verifiedAt` in the schema). *Priority: deferred* — real identity verification
   needs a KYC provider or manual process design; flagged in `docs/SECURITY.md` as future work
   rather than added speculatively.

4. **Vertical-specific aggregate trust stats** ("98% positive review, 4.93 avg, 133,963 reviews in
   12 months") shown per category. Learnfolk shows trust indicators per *tutor* profile but not
   rolled up per category yet. *Priority: low* — needs volume to be meaningful; revisit once the
   marketplace has real review volume.

5. **Catalogue depth.** 97 subjects vs. profi.ru's ~1,928 in tutoring alone. Learnfolk's taxonomy is
   now genuinely hierarchical and extensible by admins (`docs/FEATURES.md` → Administration →
   Categories/Subjects/Levels), so reaching profi.ru's depth is a data-entry exercise, not an
   architecture change. *Priority: ongoing* — grow the catalogue as real tutors sign up rather than
   speculatively seeding thousands of unused rows.

## Why the structure (not just the colours) matters

The user's original note — "I feel like you need to compare this project against profi.ru so that
you know what needs to be built and how it needs to be structured" — is the right instinct: profi.ru
proves the request-first ("specialists write to you"), compare-and-choose, verified-after-the-fact
model at scale. Learnfolk's data model and API (`TutoringRequest` → `RequestResponse`, hidden
competing rates, review-requires-completed-engagement) already implement that same core loop; today's
change brings the *presentation layer* (catalogue depth, browse structure, visual system) in line
with it too, without touching the underlying architecture.
