# Subprocessor register

**Status: draft. Reflects the repository as of 2026-08-04.**

A subprocessor is a third party that processes personal information on
SkillSplore's behalf. This register is the source of truth; the public
`/subprocessors` page is a summary of it.

**Rule: nothing is listed here speculatively.** If a provider has not been
selected, the row says so. A register naming a provider we do not use is a
misrepresentation, and one omitting a provider we do use is a compliance
failure.

## In use

| Provider | Service | Data categories | Country | Contract | Security review | Retention |
|---|---|---|---|---|---|---|
| Render | Application hosting + managed PostgreSQL | All application data | **To confirm** against the deployed region | Standard terms accepted at signup — **not separately reviewed** | Not done | Data deleted on service teardown; backup retention per Render's policy — **to confirm** |

That is the complete list. One provider.

## Not yet configured

| Provider | Service | Status |
|---|---|---|
| *(none selected)* | Transactional email — verification, password reset, notifications | `SMTP_HOST` defaults to `localhost:1025` (a local mail-capture tool used in development). **No production email provider has been chosen.** Until one is, verification emails will not be delivered in production. |
| *(none selected)* | Object storage for uploads | `STORAGE_DRIVER=local` writes to the container filesystem. On Render's free tier this is **not persistent** — uploads are lost on redeploy. See `KNOWN_LIMITATIONS.md`. S3-compatible storage is supported in code but not configured. |

Both need resolving before launch, and both add a subprocessor row when chosen.

## Explicitly not used

Confirmed by inspection of the repository on 2026-08-04:

- **No third-party analytics.** No Google Analytics, Plausible, PostHog,
  Segment, Mixpanel or similar. `grep` for tracking snippets across
  `apps/web/src` and `apps/web/index.html` returns nothing.
- **No advertising or ad-tech vendor.**
- **No data broker or enrichment provider.**
- **No payment processor** — SkillSplore does not process payments.
- **No identity or background-check provider.**
- **No AI/ML provider receiving user content.**
- **No error-tracking SaaS** (no Sentry or equivalent).

If any of these changes, this register and the Cookie Notice must be updated
**before** the integration ships, not after.

## Overseas transfer position

See `OVERSEAS_DATA_TRANSFERS.md`.

## Maintaining this register

The `Subprocessor` table mirrors this document. Fields: name, service, country,
purpose, data categories, contract status, security review date, retention
terms, active flag.

Review triggers:
- adding or removing any third-party integration;
- a provider changing its subprocessors or data location;
- annually, whichever comes first.
