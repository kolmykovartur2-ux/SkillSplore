# Incident response — LinkedIn

## LinkedIn access revoked or expired

**Symptom:** `LinkedInConnection` page shows `connected: false`, or publish attempts fail with
`token_expired`/`insufficient_permission`.

1. Check `docs/marketing-agent/LINKEDIN_TROUBLESHOOTING.md` for the specific error code.
2. If the refresh token also failed (`realClient.ts` marks the connection `EXPIRED`
   automatically), reconnect from the LinkedIn page — no data is lost; scheduled/approved drafts
   stay exactly as they were, they just won't publish until reconnected.
3. Anything that was mid-publish when access was lost is safely in `FAILED` status (never
   silently lost) — retry from the draft page once reconnected.

## Suspected credential compromise (client secret or a stored access token leaked)

1. **Revoke immediately** in the LinkedIn Developer Portal (regenerate the client secret) and/or
   in the LinkedIn Page's admin settings (remove the app's access).
2. Run the one-click disconnect (`POST /api/linkedin/disconnect`) — wipes stored tokens locally
   regardless of whether LinkedIn-side revocation has propagated yet.
3. Rotate `LINKEDIN_CLIENT_SECRET` in the deployment environment; if `TOKEN_ENCRYPTION_KEY` may
   also have been exposed, follow `TOKEN_ROTATION.md`.
4. Reconnect with the new credentials once confirmed clean.
5. Record the incident: what leaked, how, when it was revoked, what was rotated. Audit log
   entries (`linkedin.disconnect`, `linkedin.connect`) provide a timestamped trail.

## A post published that should not have

Because every publish requires the draft to have passed through `APPROVED` first, this scenario
means either (a) a founder approved something they shouldn't have, or (b) a bug bypassed the
approval gate.

1. Manually delete or edit the post on LinkedIn directly (this service has no "unpublish" API
   call — LinkedIn's own interface is the fastest path).
2. In the dashboard, do **not** delete the `PublishedPost` record — historical records should
   never be silently erased (§14/§27 spirit). Instead, use the draft's "Archive" action so it's
   clearly marked, and add context via a manual `AuditLog`-visible note if your process requires
   one.
3. If (b) — a bug bypassed approval — treat it as a P0 code review: the approval gate is meant to
   be unconditional (`CONTENT_APPROVAL.md`). File it, fix it, add a regression test.

## Rate limiting / API version retirement

- **Rate limited (429):** classified as `transient` in `realClient.ts` — the worker's bounded
  backoff (1 / 5 / 30 minutes) handles it automatically up to 3 attempts, then marks `FAILED` for
  manual retry.
- **API version retired:** LinkedIn periodically retires old `LinkedIn-Version` header values.
  Update `LINKEDIN_API_VERSION` in `.env` to a current value (LinkedIn publishes a deprecation
  schedule) and redeploy. No code change needed unless the request/response *shape* itself
  changed, in which case update `src/lib/linkedin/realClient.ts`.

## Who to contact

Until a dedicated security/ops contact is published, incidents are the founder's own
responsibility to triage using this document and `MARKETING_AGENT_SECURITY.md`.
