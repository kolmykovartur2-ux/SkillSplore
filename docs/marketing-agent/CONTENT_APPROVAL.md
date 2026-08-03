# Content approval

## The rule

**Generate → review → edit → approve → schedule → publish.** Nothing skips a step, and nothing
in this codebase can make it skip a step — the constraint is enforced server-side, not just
hidden in the UI:

- `POST /schedule/drafts/:id/schedule` (`modules/schedule/schedule.routes.ts`) returns `409` for
  any draft whose `status` isn't `APPROVED`.
- The scheduler worker (`modules/schedule/worker.service.ts`) only ever selects drafts whose
  `status` is `SCHEDULED` — which is only reachable by having been `APPROVED` first.
- `AUTO_PUBLISH_APPROVED_POSTS` (default `false`) only controls whether the worker fires
  automatically *once a draft is already scheduled*. It cannot make unapproved content publish,
  and manual "publish now" is always available regardless of this flag.

## Status lifecycle

```
idea → researching → draft → awaiting_review ⇄ changes_requested → approved → scheduled
  → publishing → published | failed
any pre-publish status → cancelled
published | cancelled | failed → archived
```

## Reapproval

Editing the body of an `APPROVED` or `SCHEDULED` draft always:

1. Creates a new `ContentVersion` row (nothing is overwritten).
2. Reverts `status` to `CHANGES_REQUESTED`.
3. Clears `approvedBy`/`approvedAt`.
4. Deletes any existing `ContentSchedule` row, if the draft was scheduled.

This is unconditional — there is no "minor edit" exception. See
`modules/drafts/drafts.routes.ts`'s `PATCH /:id` handler.

## What a founder sees before approving

- The full draft text and title, with LinkedIn character count.
- Non-blocking warnings from `GET /drafts/:id/evaluate`: exaggerated language, banned CTAs,
  hashtag count, length, unsupported numeric claims, personal-info heuristics, near-duplicate
  detection against recent approved/scheduled/published drafts.
- Full version history (who/what changed, AI vs. human).
- Prior approval/changes-requested history with notes.

Warnings are advisory. The founder can approve a draft with warnings still showing — the system
never silently rewrites their wording to "fix" a warning.

## Audit trail

Every approval, change-request, schedule, unschedule, publish, publish failure, and disconnect
writes a row to `AuditLog` via `src/lib/audit.ts`, visible on the dashboard's Audit log page.
