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

---

# Retention schedule (added 2026-08-04)

**Every period below is UNAPPROVED.** None was derived from a statute, because
inventing a statutory retention period is worse than admitting the decision is
outstanding. Each row needs a founder decision and, where a legal basis is
claimed, confirmation from a lawyer.

The `RetentionRule` table mirrors this. `retainDays` is **nullable and null by
default**, and any future deletion job must refuse to act on a rule with no
`approvedBy` — an unapproved rule must never silently start deleting data.

| Category | Proposed period | Basis | Approved |
|---|---|---|---|
| Active account | While the account is open | Necessary to provide the service | ☐ |
| Closed account (anonymised) | Indefinite (current behaviour) | Preserves others' review/message history | ☐ |
| Tutor profile | With the account | | ☐ |
| Learning requests | With the account | | ☐ |
| Responses | With the account | | ☐ |
| Private messages | **Undecided** | Both participants have an interest; deleting one side's copy is not straightforward | ☐ |
| Reviews | Indefinite | Public record others rely on | ☐ |
| Reports and moderation records | **Undecided** — likely longer than the account | Safety evidence and repeat-offender detection | ☐ |
| Verification documents | **Undecided** — should be short | Sensitive; no reason to keep evidence after the check | ☐ |
| Billing records | **Undecided** | Tax/accounting law — **needs a lawyer**, do not guess | ☐ |
| Security and audit logs | **Undecided** | Incident investigation | ☐ |
| Legal acceptances | Indefinite | Evidence of what was agreed; the point is that it outlives disputes | ☐ |
| Consent records and withdrawals | Indefinite | Same — evidence that permission existed and when it ended | ☐ |
| Privacy requests | **Undecided** | Demonstrating we handled requests properly | ☐ |
| Moderator access logs | **Undecided** | Accountability for message access | ☐ |
| Backups | Per provider policy — **to confirm with Render** | | ☐ |

## Deletion is not instantaneous

Stated in the Privacy Policy (s14) and repeated here because it is the part
users most often misunderstand. A deletion request may not immediately remove:

- records we are legally required to keep;
- records kept to prevent fraud;
- evidence relevant to a live dispute;
- copies in ordinary backup cycles, until those cycles expire;
- content already lawfully supplied to another user (a message they received);
- properly de-identified information.

## Still missing

- No scheduled deletion or de-identification job exists. Retention is currently
  "keep everything", which is the honest description of the status quo.
- `npm run export` dumps everything rather than one user's data. A per-user
  export is needed to fulfil an access request cleanly.

Both are tracked as gaps rather than described as solved.
