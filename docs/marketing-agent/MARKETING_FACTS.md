# Marketing facts

## Purpose

A structured source-of-truth layer so content generation never guesses. Any number, claim, or
statement about SkillSplore that could be wrong if the product changes (user counts, pricing,
launch scope, stage) must come from an approved `MarketingFact` row — never from the AI
provider's imagination.

## Schema (`prisma/schema.prisma`)

`MarketingFact`: `factKey` (unique), `value`, `source`, `approvedBy`, `approvalDate`,
`validFrom`, `expiresAt` (nullable), `isPublic`, `containsPersonalInfo`.

`MarketingFactSource`: optional supporting references/links per fact.

## What content generation may read

`src/lib/facts.ts`'s `getActiveApprovedFacts()` — the *only* place facts reach a
`ContentGenerationProvider` — returns facts where `isPublic = true` and
`validFrom <= now < (expiresAt ?? ∞)`. Non-public or expired facts are invisible to generation,
even if they still exist in the database (retiring a fact via the dashboard's "Retire" action
sets `expiresAt = now`; it does not delete the row, preserving the historical record of what
SkillSplore was once allowed to claim).

## What must never become a fact without real evidence

Guessed user/provider/customer/match counts · guessed revenue or conversion rates · guessed
launch dates · testimonials, quotes, or customer stories · claimed partnerships · claimed legal
approval or verification that hasn't occurred.

## Seeded facts (`prisma/seed.ts`)

- `launch.focus` — derived from `MARKETPLACE_LAUNCH_*` env vars.
- `pricing.provider_rates` — "Providers set their own rates on SkillSplore."
- `pricing.student_cost` — "Students use SkillSplore free of charge."
- `stage.current` — derived from `MARKETPLACE_LAUNCH_STAGE`.

Add real facts (genuine provider/request/match counts, once they exist) via the dashboard's
Facts page — each one requires a `source` and is recorded as approved by the founder account
that created it.
