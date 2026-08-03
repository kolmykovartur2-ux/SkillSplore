# LinkedIn troubleshooting

## "not_configured" (501) when clicking Connect LinkedIn

`LINKEDIN_PUBLISHING_ENABLED` is false, or `LINKEDIN_CLIENT_ID`/`LINKEDIN_CLIENT_SECRET`/
`LINKEDIN_REDIRECT_URI` aren't all set. Check the deployed service's own `.env` — see
`LINKEDIN_SETUP.md` step 10.

## "OAuth state mismatch" on the callback

The session cookie wasn't preserved between `/oauth/start` and `/oauth/callback` — usually
because `DASHBOARD_ORIGIN`/cookie settings don't match the actual URL you're using, or you
opened the authorize link in a different browser/session than you started it in. Retry from the
dashboard's Connect button (don't bookmark or manually reuse an old authorize URL — state and
the PKCE verifier are single-use, stored server-side per session).

## "LinkedIn denied the connection"

You (or LinkedIn) declined the consent screen, or the app isn't yet approved for the requested
scopes. Check the developer app's Products section for `w_organization_social` /
`r_organization_social` / `r_organization_admin` approval status.

## Publish fails with `token_expired`

The access token expired and either there was no refresh token, or the refresh attempt itself
failed (`src/lib/linkedin/realClient.ts`'s `getFreshAccessToken`). Reconnect from the LinkedIn
page. If this happens repeatedly and quickly after reconnecting, it may indicate the granted
scopes don't actually include what's needed, or LinkedIn's real token lifetime/refresh behavior
differs from what this code assumes — see `KNOWN_LIMITATIONS.md` and report the exact error.

## Publish fails with `insufficient_permission` (403)

The connected LinkedIn member isn't (or is no longer) an admin on the SkillSplore Page with the
right role, or the requested scope wasn't actually granted. Re-check Page admin roles and the
app's approved permissions in the LinkedIn Developer Portal.

## Publish fails with `rejected` (other 4xx)

LinkedIn rejected the post content or request shape itself. Since this integration is untested
against the live API (`KNOWN_LIMITATIONS.md`), this is the most likely place a real mismatch with
LinkedIn's current request schema would surface. Check `PublicationAttempt.safeErrorMessage` and
the server logs (never logs the token itself) for the actual status code, and compare against
LinkedIn's current Posts API documentation — the request body is built in
`src/lib/linkedin/realClient.ts`'s `publishPost()`.

## Rate limited (429)

Handled automatically — bounded backoff, up to 3 attempts, then `FAILED` for manual retry. If
this happens often, you may be scheduling posts too close together across other integrations
using the same LinkedIn app's quota, not just from this service.

## Analytics show zeros or fail to sync

Either `r_organization_social` wasn't granted (analytics require it —
`LinkedinOrganization.analyticsAllowed` reflects this), or the post is too recent for LinkedIn to
have aggregated statistics yet. Retry the sync later from the draft's published-post view.

## "API version retired" / unexpected 4xx after previously working

LinkedIn periodically retires old `LinkedIn-Version` header values on a published deprecation
schedule. Update `LINKEDIN_API_VERSION` in `.env` to a current value and redeploy.

## Still stuck

File the exact status code and `safeErrorMessage` (never the raw token) as an issue against this
service, referencing `src/lib/linkedin/realClient.ts` — since this integration hasn't been
live-verified by its original authors, real-world failures here are expected to need small fixes
against LinkedIn's actual current behavior.
