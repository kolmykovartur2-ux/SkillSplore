# Threat model

Practical, product-shaped threat model for a small controlled pilot — not a formal STRIDE
exercise, but organized around what could actually go wrong for real early users.

## Assets worth protecting

1. **Account credentials** — passwords (bcrypt-hashed), sessions (server-side, PostgreSQL).
2. **Private messages** between learners and providers.
3. **Private qualification documents** uploaded by providers.
4. **Personal data**: names, emails, locations, uploaded avatars/documents.
5. **Platform integrity**: reviews, request/response history, moderation/report records — the
   trust signals the whole product depends on.
6. **Founder/administrator access** — the ability to approve profiles, moderate content, view
   private data.

## Actors

- **Anonymous visitor** — can browse public search/profiles, cannot see private data.
- **Registered learner/provider** — can act on their own data and anything explicitly shared with
  them (conversations they're part of, responses to their own requests).
- **Malicious registered user** — same access as above, but intentionally probing for IDOR,
  spamming, harassment, fake reviews, or abuse of the reporting/blocking system itself.
- **Administrator** — elevated access; a compromised admin account is the single highest-impact
  account-takeover scenario on this platform.
- **External attacker with no account** — credential stuffing, scraping, DoS attempts.

## Key threats and current mitigation

| Threat | Mitigation | Residual risk |
| --- | --- | --- |
| Credential stuffing / brute force | Per-IP rate limiting + per-account lockout (`LOGIN_LOCKOUT_THRESHOLD`) | In-memory rate limiter resets on restart; no CAPTCHA |
| Session hijacking | HttpOnly + Secure (prod) + SameSite=Lax cookies, session regenerated on login | No session-binding to IP/user-agent (would add friction for legitimate mobile users, deliberately not done) |
| IDOR on private data (messages, documents, profiles) | Per-route/service ownership checks (spot-checked in `docs/SECURITY_REVIEW.md`, not exhaustively verified across all 15 modules yet) | Unverified modules could still have a gap — see SECURITY_REVIEW's "not yet checked" list |
| Admin account compromise | Central `requireRole('ADMIN')` gate, audit log of sensitive actions | No MFA for admins yet |
| Fake/manipulated reviews | `Review.engagementId` unique constraint + requires a completed engagement | Engagement completion itself is self-reported by the two parties, not independently verified — inherent to an off-platform-arrangement product design, not a bug |
| Spam account creation | Rate limiting on registration, email verification | No CAPTCHA; no email domain reputation checks |
| Malicious file upload | MIME-type allowlist + size limit | No malware scanning; no content-type-vs-actual-bytes verification |
| Data leaked via logs | `pino`'s redact list strips cookies/auth headers/password fields | Not verified against every custom log call for accidental PII inclusion (spot-check only) |
| Fictional data reaching production | `APP_ENV`-gated demo tooling, refuses in production | See Phase 6 (`docs/ENVIRONMENTS.md`) for the dedicated hardening pass and tests |
| Harassment via messaging | Block + report, blocked users can't message (enforced in `conversations.service.ts`) | No automated content filtering; relies on reports being investigated by a human admin |

## Out of scope for this threat model

- Physical security of any server (assumed handled by wherever the founder deploys).
- Supply-chain attacks against npm dependencies themselves (mitigated only by `npm audit` and
  normal update hygiene — no SBOM or lockfile-pinning policy beyond `package-lock.json`).
- Attacks against LinkedIn or any third-party platform the optional marketing agent integrates
  with — see `docs/marketing-agent/LINKEDIN_COMPLIANCE.md` for that surface specifically.

## Highest-priority residual risk for a pilot

**Unverified per-route ownership checks across most modules.** The pattern (check ownership
inline in the route/service, not centrally) is correct where checked, but hasn't been verified
everywhere. This is the single most valuable next security task — see
`docs/SECURITY_REVIEW.md`'s "not yet checked" list.
