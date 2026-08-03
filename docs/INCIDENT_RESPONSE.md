# Incident response

Practical runbook for the SkillSplore marketplace. Not a formal, legally-reviewed incident
response plan (that's still an outstanding item in `docs/KNOWN_LIMITATIONS.md`) — this is what the
founder should actually do today, with the tools that actually exist in this codebase.

## Suspected account compromise (a user's account)

1. As admin, suspend the account: `admin.routes.ts`'s suspend action (Admin dashboard → Users →
   Suspend). This sets `User.status = 'SUSPENDED'` — `requireAuth` middleware rejects further
   requests from that session immediately (`middleware/auth.ts` checks `status === 'SUSPENDED'`
   on every request, not just at login).
2. Force a password reset: direct the user to the password-reset flow, or an admin can note the
   account for required reset (no forced-reset-on-next-login flag exists yet — documented gap).
3. Check `AuditLog` for what the account did while compromised (Admin → Audit log).
4. Restore access once the user confirms control and has a new password.

## Suspected administrator account compromise

**Highest severity — do this immediately:**
1. Rotate `SESSION_SECRET` in the deployment environment and restart the app — this invalidates
   *every* active session, including the compromised admin's, forcing everyone to log in again.
2. Change the admin account's password directly in the database if you cannot trust the UI flow
   (`UPDATE "User" SET "passwordHash" = ... WHERE email = ...` with a freshly bcrypt-hashed value,
   or via `npx prisma studio` if that's more comfortable).
3. Review `AuditLog` for every action taken by that admin account since the suspected compromise
   window.
4. Rotate any other secrets the admin could plausibly have accessed (SMTP credentials, S3/storage
   credentials) if there's reason to believe they were exposed, not just the session.

## Suspected data breach (unauthorized access to the database or backups)

1. Rotate `DATABASE_URL` credentials at the PostgreSQL server level.
2. Rotate `SESSION_SECRET` (invalidates all sessions as above).
3. Rotate `S3_ACCESS_KEY`/`S3_SECRET_KEY` if `STORAGE_DRIVER=s3`.
4. Assess what was actually exposed: user emails/names (in `User`), private messages
   (`Message`), qualification documents (private object-storage keys, not public URLs — but if
   the storage bucket/credentials themselves were breached, treat documents as exposed too).
5. This is also the trigger point for the "professional legal review" item in
   `docs/KNOWN_LIMITATIONS.md` — a real breach very likely creates a notification obligation;
   get legal advice before deciding not to notify affected users.

## Site down / database unreachable

1. Check `GET /api/health` — `200 {"status":"ok"}` healthy, `503` means the database is
   unreachable from the app's perspective.
2. Check the database server itself is up and accepting connections.
3. Check the app process's own logs for the specific connection error (`index.ts` fails fast with
   a clear log line — "Cannot reach the database" — if it can't connect at boot).
4. If using Docker Compose, `docker compose ps` to see which container is unhealthy, then
   `docker compose logs <service>`.

## Email sending broken (SMTP failure)

`lib/mailer.ts` swallows send failures by design — a broken SMTP config never breaks a user's
request, but it also means failures are **silent** unless you're watching logs. Check application
logs for mailer error lines. There is no automated alert on persistent mail failure — a real gap;
until one exists, periodically spot-check that verification/reset emails are actually arriving
(e.g. register a test account after any SMTP configuration change).

## Malicious content published (reviews, requests, messages, profile content)

1. Admin → Reports (if reported) or directly locate the content via Admin dashboard.
2. Use the existing hide/remove moderation actions (`admin.moderation.ts`) — content is hidden
   (`hiddenAt` set), not hard-deleted, preserving the record for any later dispute or legal need.
3. Suspend the originating account if the content indicates a bad-faith actor rather than a
   one-off mistake.
4. Record admin notes on the relevant report/account explaining the decision (`AdminNote`).

## Who to contact

Until a dedicated security contact is published (see `docs/SECURITY.md`), all of the above is the
founder's own responsibility to triage using this runbook. This document itself should be reviewed
and formalized (ideally with legal input on breach-notification obligations) before a wider
public launch — see `docs/KNOWN_LIMITATIONS.md`.
