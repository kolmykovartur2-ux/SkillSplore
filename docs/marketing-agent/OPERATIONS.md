# Operations

## Day-to-day workflow

1. **Ideas** — generate (per pillar, via the configured provider) or add manually.
2. **Briefs** — generate from an idea, or write one by hand with the full brief structure
   (objective, audience, evidence source, claims requiring verification, etc.).
3. **Drafts** — generate up to 3 variants from a brief. Review warnings. Edit as needed (each
   edit is a new version). Approve.
4. **Schedule** — from the draft page or the Calendar. Cadence conflicts show as a warning with
   an override checkbox.
5. **Publish** — automatic at the scheduled time if `AUTO_PUBLISH_APPROVED_POSTS=true`, or
   "Publish now" any time after scheduling.
6. **Analytics** — synced on publish (best-effort) and re-syncable per post from the Analytics
   page's underlying `POST /api/analytics/published-posts/:id/sync`.

## Routine checks

- **Review queue** should be the first thing checked each session — it's everything awaiting a
  decision.
- **Failed** page — anything here needs either a manual retry (transient failure, worth
  retrying) or investigation (permanent failure — check `PublicationAttempt.safeErrorMessage`).
- **LinkedIn connection status** — confirm `connected: true` before relying on scheduled posts
  actually going out for real.

## The worker

`src/worker.ts` runs a 60-second tick loop. It only does anything if
`AUTO_PUBLISH_APPROVED_POSTS=true`; otherwise it idles (logged once at startup) and every publish
is a manual "Publish now" click. Restarting the worker container mid-tick is safe — the atomic
`updateMany` publish lock (see `ARCHITECTURE.md`) means a half-finished tick just leaves a draft
in `SCHEDULED`, picked up again on the next tick or via the worker's own restart.

## Alerting

Final publish failures (permanent errors, or transient errors that exhausted retries) log at
`error` level with `ALERT:` in the message (`modules/schedule/publish.service.ts`). There is no
email/Slack/SMS integration in this build — point your log aggregator's alerting at that pattern,
or check the Failed page manually. Wiring a real notification channel is a natural next step once
a specific tool (email, Slack webhook) is chosen.

## Scaling notes

Single-node by design (matches the marketplace's own MVP posture). Rate limiting is in-memory
(`express-rate-limit`'s default store) — fine for one founder using the dashboard, would need a
shared store (Redis) only if this ever grows to multiple concurrent administrators behind a
load balancer.
