# Known limitations

Stated plainly, not buried.

## Real LinkedIn integration is implemented but unverified

`src/lib/linkedin/oauth.ts` and `src/lib/linkedin/realClient.ts` implement LinkedIn's OAuth 2.0 +
PKCE flow and the Posts API / Community Management API per their publicly documented shapes —
but they were written in a build environment with **no outbound network access**, so they have
**never been exercised against the live LinkedIn API**. Specifically unverified:

- The exact request/response shape of `POST /rest/posts` (author URN format, `content.article`
  field names for link posts, which response header actually carries the created post ID —
  `x-restli-id` is checked first, `x-linkedin-id` as a fallback, but this hasn't been confirmed
  against a real response).
- The `organizationAcls` query parameters and response shape used to verify admin access.
- The `organizationalEntityShareStatistics` analytics endpoint's exact field names.
- Token refresh behavior and expiry handling.

**Before relying on this for real publishing**, connect a real LinkedIn Developer app (see
`LINKEDIN_SETUP.md`) and test with a low-stakes draft first. Report exactly what breaks (status
code, response body with any token redacted) so it can be fixed against real data.

## Calendar has no drag-and-drop rescheduling

`web/src/pages/Calendar.tsx` is a read-only month grid. Rescheduling is done via the draft page's
"Unschedule" then "Schedule" actions. A full drag-and-drop calendar was scoped in the original
plan but deprioritized in favor of correctness elsewhere in this pass — hand-rolling accessible
drag-and-drop well takes real, separate effort and no library was already in this monorepo to
lean on.

## No administrator alert channel

Final publish failures log at `error` level with an `ALERT:` prefix
(`modules/schedule/publish.service.ts`) but there's no email/Slack/SMS integration. Point a log
aggregator's alerting at that log line, or check the Failed page manually, until a specific
notification channel is chosen and wired up.

## Provider fallback is coarse

`withProviderFallback()` (`src/lib/contentGenerationProvider.ts`) falls back to `template` mode
on *any* error from the configured network provider (bad key, network failure, malformed
response, rate limit). It doesn't distinguish "transient, worth retrying the same provider" from
"permanently misconfigured" — every failure just falls back to the deterministic template for
that one request, logged as a warning. This is a deliberate simplicity trade-off, not an
oversight, but a more nuanced retry/backoff for AI-provider calls (separate from the LinkedIn
publish retry logic, which *is* nuanced) is a reasonable future improvement.

## Comment inbox / reply approval not built

§26 of the original product spec allows (optionally) retrieving comments and drafting
human-approved replies. Not built in this pass — `linkedinConnection.routes.ts` has no comment
endpoints. Would require `r_organization_social` read scope and a new module.

## Single founder account model

`AdminUser` supports multiple rows, but there's no invite/role-management UI — adding a second
administrator today means inserting a row directly (e.g. via `prisma studio` or a script). Fine
for a single-founder tool; would need real UI before handing access to a team.

## No independent security review

See the outstanding list in `MARKETING_AGENT_SECURITY.md`. This codebase has not been
penetration-tested.
