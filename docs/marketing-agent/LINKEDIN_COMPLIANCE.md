# LinkedIn compliance

## What this codebase does

- Publishes company-page posts through LinkedIn's official Posts API, only after human approval.
- Reads aggregate post analytics through LinkedIn's official Community Management API, when
  `r_organization_social` is granted.
- Authenticates via LinkedIn's official OAuth 2.0 + PKCE flow. The founder signs in directly on
  LinkedIn's own domain and consents there; this service never sees or stores a LinkedIn
  password.

## What this codebase will never do (enforced by what's simply not implemented)

- No web scraping of LinkedIn pages.
- No Selenium, Playwright, or any browser-automation tool operating a logged-in LinkedIn session.
- No stored LinkedIn passwords, copied browser cookies, or reverse-engineered session tokens.
- No automated connection requests, direct messages, comments, likes, or follows.
- No engagement pods or artificial-impression generation.
- No competitor-profile scraping.

There is no code path in this repository that could do any of the above — the only outbound
LinkedIn calls are in `src/lib/linkedin/oauth.ts` and `src/lib/linkedin/realClient.ts`, both
using LinkedIn's documented REST endpoints with proper headers (`LinkedIn-Version`,
`X-Restli-Protocol-Version: 2.0.0`, `Authorization: Bearer <token>`).

## Data handling

- LinkedIn OAuth tokens: encrypted at rest (`TOKEN_ROTATION.md`), decrypted only in-memory
  per-request, never logged, never sent to an AI provider.
- Post content: generated from `MarketingFact` data and founder-provided briefs — see
  `MARKETING_FACTS.md`. No LinkedIn member data (beyond the organization's own aggregate
  analytics) is ever read, stored, or processed.
- Analytics: aggregate, organization-level performance figures only (impressions, reactions,
  comments, shares, clicks). No individual LinkedIn member data is retrieved or stored.
- Consent: publishing anything identifying a specific customer or provider (name, photo,
  screenshot with personal data, testimonial) requires a recorded `ContentConsent` — see the
  Consents page and the original spec's §14.

## Disconnecting / revoking access

Two independent mechanisms, either sufficient on its own:

1. This service's own **Disconnect** button (`POST /api/linkedin/disconnect`) — wipes locally
   stored tokens immediately.
2. LinkedIn's own Page admin settings — remove the developer app's access directly on LinkedIn,
   which invalidates the tokens LinkedIn-side regardless of what this service does.

Historical `PublishedPost` records are never deleted by either action — only the live connection
is severed.

## Rate limits

LinkedIn's API rate limits are respected via the retry/backoff logic in
`modules/schedule/publish.service.ts` and `worker.service.ts` — a 429 response is classified as
`rate_limited` (transient), triggering bounded exponential backoff (1 / 5 / 30 minutes, up to 3
attempts) rather than hammering the API.
