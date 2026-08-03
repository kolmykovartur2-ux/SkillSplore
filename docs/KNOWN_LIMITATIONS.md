# Known limitations

Single canonical list of what SkillSplore (the marketplace — `apps/api` + `apps/web`) does **not**
do yet, stated plainly. Consolidates and cross-references `docs/SECURITY.md`'s outstanding list
and `docs/CURRENT_STATE.md`'s known-limitations section rather than duplicating them narratively.
For the marketing agent's own limitations, see `docs/marketing-agent/KNOWN_LIMITATIONS.md` — a
separate document for a separate, optional service.

## Not done — blocking or near-blocking for a real pilot

- **Test coverage is thin.** One API test file (21 tests), zero frontend tests, zero E2E tests.
  See `docs/TECHNICAL_DEBT.md`. Being expanded under Phase 3 of the launch-readiness sprint.
- **No CI test gate.** The only GitHub Actions workflow deploys to AWS ECS on push to master with
  placeholder credentials (currently inert) and does not run tests first.
- **No independent security review or penetration test.**
- **No final legal review.** Terms/privacy content is placeholder text pending professional review
  — do not represent it as legally sufficient.
- **No privacy impact assessment.**
- **No production monitoring, alerting, or centralized log aggregation.**
- **No production email-domain verification** (SPF/DKIM/DMARC) — needs a real SMTP provider and
  domain setup before launch.
- **No formal incident-response process** (a template now exists at `docs/INCIDENT_RESPONSE.md`
  once Phase 4 lands — verify it's been written before relying on this line).

## Not done — real but lower urgency for a small controlled pilot

- No malware scanning of uploaded documents (type/size validation only).
- No load testing; rate limiting and sessions are single-node (in-memory / one Postgres instance).
- No multi-factor authentication for administrators.
- Password hashing is bcrypt, not Argon2id (not insecure, just not the newest recommendation).
- Real-time messaging is polling-based, not WebSocket-based (deliberate, functional either way).
- No CSRF-token scheme beyond `SameSite=Lax` + CORS origin restriction.
- No structured first-party analytics event tracking yet (Phase 16 addresses this).
- No dedicated founder-facing operational metrics dashboard yet (Phase 21 addresses this).

## Explicitly out of scope by product design, not oversight

- No payment processing — arrangements happen off-platform, stated explicitly in the product
  positioning and in the UI (engagements are recorded, not paid, on-platform).
- No guaranteed outcomes, responses, qualifications, or user safety — SkillSplore is positioned as
  a moderated noticeboard, not an employer or guarantor of any interaction that happens off it.
- No employment relationship with any provider.

## How this list should be used

Treat every unchecked item here as a **blocking-or-not decision the founder needs to make**
before a real pilot, not as an implicit "fine to skip." `docs/PILOT_LAUNCH_CHECKLIST.md` (Phase
20) turns this list into an explicit blocking/non-blocking classification with owners.
