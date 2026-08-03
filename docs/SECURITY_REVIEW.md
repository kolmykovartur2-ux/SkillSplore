# Security review

_Practical audit pass, 2026-08-03. This is a **first pass** — targeted checks against the specific
risk categories below, not an exhaustive line-by-line review or a substitute for independent
penetration testing (still listed as outstanding in `docs/SECURITY.md`). Findings are graded
Severity (Critical/High/Medium/Low/Informational) and marked **Blocking** or **Non-blocking** for
a small controlled pilot._

## Findings

### 1. No CI test gate before deploy — Medium, Non-blocking (but fix before enabling the workflow)
`.github/workflows/aws.yml` deploys to AWS ECS on every push to `master`, with **no test or
typecheck step** in the pipeline. It currently uses placeholder AWS credentials/region values
(`MY_AWS_REGION` etc.) so it cannot actually run today — but if real secrets are ever added
without also adding a test step first, every push would deploy untested code straight to
production.
- **Reproduction**: read `.github/workflows/aws.yml` — the `deploy` job has no `npm test`/
  `npm run typecheck` step before the Docker build/push.
- **Recommended fix**: add a `test` job (checkout → `npm install` → `npm run typecheck` →
  `npm test`) that the `deploy` job depends on (`needs: test`), before this workflow is ever
  activated with real credentials.
- **Blocks pilot launch?** No — the workflow is inert today. Blocks *enabling real deploys*
  safely.

### 2. `multer@1.4.5-lts.x` has known CVEs — Medium, Non-blocking for a small pilot
Both `apps/api` and `apps/marketing-agent` pin `multer` 1.x for file uploads. The 1.x line has
published CVEs patched in 2.x (npm itself warns on install: "Multer 1.x is impacted by a number
of vulnerabilities, which have been patched in 2.x").
- **Reproduction**: `npm install` output at the repo root and in `apps/marketing-agent` both print
  the deprecation/vulnerability warning; `npm audit` reports moderate/high/critical findings.
- **Recommended fix**: run `npm audit` at both locations, review each finding's actual exploit
  path (file-upload size/type handling is already validated at the application layer — MIME
  allowlist + size limit — which mitigates some but not all multer-level issues), and plan a
  multer 2.x upgrade (breaking change — needs its own testing pass, not a drive-by bump).
- **Blocks pilot launch?** No for a small, invite-only pilot with a MIME/size allowlist already in
  place at the application layer; **yes** before any wider public launch that accepts uploads from
  untrusted users at scale.

### 3. No CSRF-token scheme — Low, Non-blocking (already documented, re-confirmed)
Relies on `SameSite=Lax` cookies + CORS restricted to `WEB_ORIGIN` with `credentials: true`. This
is a reasonable baseline for a same-site SPA but is not a full CSRF defense (e.g. it doesn't
protect against some subdomain-based or `SameSite=None`-adjacent attack classes). Already stated
as a known gap in `docs/SECURITY.md`; re-verified true in this pass, not newly discovered.
- **Blocks pilot launch?** No for a small controlled pilot on a single trusted origin.

## Checked and confirmed safe (worth recording so it isn't re-litigated)

- **Private qualification documents** (`apps/api/src/modules/files/files.routes.ts:51-79`):
  correctly requires owner-or-admin, audit-logs admin access, translates a missing backing file
  into 404 rather than a 500 that could leak infrastructure detail.
- **Messaging IDOR**: `POST /api/conversations/:id/messages` doesn't check participant membership
  inline, but delegates to `conversations.service.ts`'s `postMessage()`, which does
  (`conversations.service.ts:48-53` — throws `forbidden()` if the sender isn't a participant).
  Verified this is enforced, not skipped.
- **Admin routes are blanket-gated**: `admin.routes.ts:21` — `adminRouter.use(requireRole('ADMIN'))`
  applies to the entire router before any individual route, not per-route (harder to
  accidentally leave one admin route ungated).
- **No raw SQL injection surface**: the only `$executeRawUnsafe` call in the codebase
  (`apps/api/prisma/_demo.ts:90`) is a fully static string (no interpolated input) that truncates
  the session table during a demo reset — and demo reset itself refuses to run outside
  development/demo per `env.ts`.
- **No `dangerouslySetInnerHTML`** anywhere in `apps/web/src` — no obvious stored/reflected XSS
  vector via raw HTML injection.
- **No `res.redirect()` calls in `apps/api`** — no open-redirect surface in the marketplace API.
  (`apps/marketing-agent`'s OAuth callback does redirect, but only to `DASHBOARD_ORIGIN`, a
  server-side config value, never a user-supplied URL.)
- **No secrets committed to git**: `git ls-files` shows no `.env`, `.pem`, `.key`, or `id_rsa`
  files tracked.
- **Password reset / login** avoid account-enumeration (`docs/SECURITY.md`, re-confirmed by
  reading `auth.routes.ts` in the earlier architecture pass): identical generic error message
  regardless of whether the account exists, is locked, or the password was wrong.

## Not yet checked in this pass (scope for a follow-up security session)

- Full per-route ownership-check audit across all 15 modules (only files/conversations/admin were
  spot-checked here — `requests`, `responses`, `reviews`, `reports`, `tutors`, `users`,
  `engagements` still need the same treatment).
- Dependency static-analysis beyond `npm audit`'s own report (no separate SAST tool run).
- Rate-limit bypass testing (e.g. via header spoofing) — not attempted.
- Session-fixation live testing (code inspection only — `req.session.regenerate()` on login is
  present, per `docs/SECURITY.md`, not independently re-verified live in this pass).
- File-upload content-type spoofing (declared MIME type vs. actual file bytes) — not tested.

## Standing outstanding items (unchanged from `docs/SECURITY.md`)

Independent penetration test, legal review, privacy impact assessment, production monitoring/
alerting, email-domain verification, malware scanning, MFA for admins — see
`docs/KNOWN_LIMITATIONS.md` for the consolidated list with blocking classification.
