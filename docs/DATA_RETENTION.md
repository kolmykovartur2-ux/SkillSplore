# Data retention

## What happens to data today

| Action | What actually happens | Where |
| --- | --- | --- |
| User deletes their account | Anonymized in place (email/name scrambled, `deletedAt` set); reviews, messages, engagements, reports **preserved** under the anonymized identity | `users.routes.ts` |
| Admin hides content (review, message, request) | `hiddenAt` set; row preserved, hidden from normal display | `admin.moderation.ts` |
| Admin suspends a user | `suspendedAt`/`status` set; account preserved, login blocked | `admin.routes.ts` |
| Demo reset (`npm run demo:reset`) | Full delete of all rows in dependency order, then reseed — **development/demo only**, refuses in production | `prisma/reset.ts`, guarded by `env.ts` |
| Report resolved/dismissed | `status` updated; report record preserved | `admin.moderation.ts` |

**Nothing in the normal application flow performs a hard delete of a `User` row or of the history
attached to one** — see `docs/DATA_MODEL.md`'s finding about `onDelete: Cascade` for why this
matters and what the latent risk is if that ever changes.

## Retention periods

**Not currently defined.** No automatic data-expiry job exists (no cron/scheduled task that purges
old messages, old reports, old anonymized accounts, etc.). Everything is retained indefinitely
by default. This is a genuine gap for:
- Data-minimization best practice generally.
- Any future legal requirement (e.g. "delete inactive account data after N years").

**Recommendation**: this is a business/legal decision, not a technical one — the founder should
decide retention periods (with legal input, per `docs/KNOWN_LIMITATIONS.md`) before publishing a
privacy policy that makes any retention claim. Once decided, the actual purge job is
straightforward to add (a scheduled script following the existing `prisma/reset.ts`-style
pattern, scoped to age rather than everything).

## Backups and retention

See `docs/BACKUP_AND_RESTORE.md` for how backups are taken; that document's retention section
covers how long *backups* are kept, which is a separate question from how long *live* data is
kept.

## Data subject requests (access, correction, deletion, export)

- **Export**: `npm run export` produces a portable JSON dump of all data
  (`apps/api/prisma/export.ts`) — usable as a starting point for fulfilling an individual access
  request, though it currently exports everything, not a single user's data in isolation. A
  per-user export filter doesn't exist yet.
- **Deletion**: the existing "delete account" self-service flow (anonymize) is the closest thing
  to a right-to-erasure mechanism today. Whether anonymization satisfies a specific legal
  erasure obligation is a legal question, not a technical one — flagged for professional review,
  not decided here.
- **Correction**: users can edit their own profile directly; no separate "request a correction"
  workflow exists (not needed while self-service editing covers the same ground).

See `docs/USER_DATA_REQUESTS.md` (Phase 12) for the fuller process documentation once written.
