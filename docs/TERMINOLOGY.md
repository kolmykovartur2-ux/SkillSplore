# Terminology

_Last updated: 2026-08-03_

Word choices for public-facing copy. See [`PRODUCT_POSITIONING.md`](PRODUCT_POSITIONING.md) for the
underlying positioning these choices support.

## The core rule

Use context-appropriate language, not a mechanical find/replace. A page about NCEA calculus can
naturally say "tutor" and "student" — that's still the most honest, familiar word for that context.
A generic page describing the whole platform (homepage, nav, footer, dashboard, search) should use
broader terms, because "tutor" undersells a saxophone teacher or a personal trainer and "student"
undersells an adult learning a new instrument for fun.

## Word choices

| Avoid in generic/platform-wide copy | Prefer | Still fine in academic-specific contexts |
| --- | --- | --- |
| Marketplace | Noticeboard, platform | (never — "marketplace" stays internal-only) |
| Tutor (as the only word for any provider) | Teacher / coach / specialist / skilled person / someone who can teach you / provider | "Tutor" for an academic subject page |
| Student (as the only word for any learner) | Learner | "Student" for an academic subject page |
| Lesson | Session, learning | "Lesson" where it reads naturally |
| Tutoring request | Learning request, request | "Tutoring request" in an academic-only context |
| Find tutors | Browse skills, find someone, browse people | — |
| Become a tutor | Create a teaching profile | — |
| Subjects | Subjects or skills | "Subjects" alone in academic-only contexts |

## Examples applied

- "Find verified tutors across 90+ subjects" → "Find people who can teach the subject or skill
  you're looking for" (also removes the unverified count claim)
- "Browse tutors" → "Browse people" / "Browse skills" / "Find someone to learn from"
- "Post a tutoring request" → "Post what you want to learn"
- "A marketplace connecting students with independent tutors" → "A moderated noticeboard that helps
  learners and people with useful knowledge or skills find each other"

## What stays unchanged (deliberately, out of scope)

This was a **copy-only** repositioning (confirmed with the founder before starting). The following
were left exactly as they were, and should stay that way unless a future task explicitly re-scopes
to a deeper technical rename:

- Routes: `/tutor/onboarding`, `/tutors/:id`, `/tutor/feed`
- Component filenames: `TutorCard.tsx`, `TutorProfile.tsx`, `Onboarding.tsx` (in `pages/tutor/`)
- Prisma models: `TutorProfile`, `TutorSubject`, `TutorProfileStatus`
- API paths: `/api/tutors/*`, `/api/requests/feed`

## Central copy that must not be duplicated by hand

Payment/pricing-related sentences ("SkillSplore does not process payments", rates language) live in
[`apps/web/src/lib/pricingCopy.ts`](../apps/web/src/lib/pricingCopy.ts). Import from there rather
than retyping the sentence — this is what lets pricing policy change in one place instead of five.
