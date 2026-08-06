# Teaching levels

## The problem this fixes

The catalogue shipped one list of teaching levels:

> Primary · Intermediate · NCEA Level 1 · NCEA Level 2 · NCEA Level 3 ·
> Undergraduate · Postgraduate · Adult / Hobby

and picking at least one was **mandatory** to submit a tutor profile
(`assertSubmittable`). That list describes the New Zealand school system, which
fits 4 of the 37 categories.

So a tutor offering SEO, welding, tattooing or dog training had two options:
claim an NCEA level they do not teach, or file their professional practice
under "Adult / Hobby". Neither is true, and the second is actively insulting to
someone selling a professional service. It also poisons the search filter,
because a learner filtering by level gets results that never meant anything.

This was reported from a real signup attempt as an SEO specialist.

## The model

Two vocabularies, called **tracks**:

| Track | Levels |
|---|---|
| `ACADEMIC` | Primary, Intermediate, NCEA Level 1–3, Undergraduate, Postgraduate |
| `PROFESSIONAL` | Complete beginner, Some experience, Advanced, Professional / career, Adult / Hobby |

`Category.levelTracks` records which apply. Of the 37 categories:

- **4 academic only** — Mathematics, Sciences, English & Humanities, Exam & Test Prep
- **10 both** — Languages, Computer Science & IT, Music, Arts & Design,
  Engineering & CAD, Business & Economics, Writing & Content, Sports & Fitness,
  Performing Arts & Dance, Learning Accessibility & Support
- **23 professional only** — everything else

"Both" is not a hedge. Piano is genuinely taught for NCEA music *and* as an
adult hobby; a category forced to choose would mis-describe half its tutors.

## Why levels stay on the profile, not the subject

Levels are a many-to-many on `TutorProfile`, not on each subject a tutor
teaches. A tutor who teaches NCEA calculus *and* SEO is therefore shown the
**union** of both ladders (`applicableLevelTracks`), and picks from whichever
apply.

Moving levels onto each subject would describe that tutor more precisely, but
it multiplies the onboarding form by the number of subjects they teach — which
is the friction this change set out to remove. Not worth it unless a real need
appears.

## Naming

The professional ladder deliberately avoids reusing "Intermediate".
`TeachingLevel.name` is globally unique, so a second one would fail the sync —
but the better reason is that in New Zealand "Intermediate" already means
intermediate school (Years 7–8). "Some experience" also describes a learner
better than "Intermediate" does for a skill with no syllabus behind it.

"Adult / Hobby" predates the split and is kept rather than renamed or removed,
because tutors have already selected it. It sits in the professional track. It
is an audience rather than a level, so it is a reasonable candidate for
retirement later — but only with a migration that moves existing selections
somewhere sensible.

## Deliberate non-decisions

**Mismatched levels are not rejected.** A profile can hold an academic level
for a professional subject. Every tutor who signed up before this split had
only the academic list to choose from, so enforcing a match would make their
existing profile unsubmittable the next time they edited it — punishing them
for a limitation that was ours. The onboarding screen surfaces them under
"Previously selected" so they can be cleared, and does not clear them
automatically.

**A level is still required to submit.** The friction complaint was about the
wrong *vocabulary*, not about being asked. With the right ladder it is one
click, and keeping it required is what keeps the search filter worth having.
The wording adapts: professional-only profiles are asked for "at least one
experience level", not "at least one teaching level".

**Track assignment is not re-applied on boot.** `syncTaxonomy` sets
`levelTracks` only when it creates a category, exactly like `isFeatured`. An
admin who decides their Music category is professional-only keeps that decision
through the next deploy.

## Adding a category

`POST /admin/categories` accepts `levelTracks`, and the admin taxonomy screen
offers the three choices. It defaults to `['PROFESSIONAL']`, including for
categories created through the user suggestion pipeline — a category someone
submits at runtime is far more often a practical skill than a school subject,
and defaulting the other way recreates the original bug for every new category.

## Where this is enforced

| Concern | Location |
|---|---|
| Track vocabulary | `prisma/syncTaxonomy.ts` — `TEACHING_LEVELS` |
| Category assignment | `prisma/taxonomy.data.ts` — `levelTracks` per category |
| Union rule | `src/modules/tutors/tutors.service.ts` — `applicableLevelTracks` |
| Submission requirement | same file — `assertSubmittable` |
| Tutor onboarding UI | `apps/web/src/pages/tutor/Onboarding.tsx` |
| Learner request form | `apps/web/src/pages/requests/CreateRequest.tsx` |
| Tests | `apps/api/tests/levelTracks.test.ts` |
