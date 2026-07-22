# Security

This document describes the security measures implemented in the MVP and the reviews that remain
before accepting real users. **Learnfolk is not yet security-certified, legally approved, or
production-certified.** Do not describe it as such until the outstanding reviews below have occurred.

## Implemented

- **Passwords** hashed with bcrypt (cost factor 12). A minimum-strength policy is enforced.
- **Sessions** are server-side, stored in PostgreSQL, with an HTTP-only cookie. The session id is
  regenerated on login to prevent fixation. In production the cookie is `Secure` and `SameSite=Lax`,
  and `trust proxy` is enabled for correct behaviour behind a TLS-terminating reverse proxy.
- **Central authorisation:** a single middleware layer (`requireAuth`, `requireRole`,
  `requireVerified`) enforces access; there are no ad-hoc per-page permission rules. Ownership checks
  live in the domain services.
- **Email tokens** (verification, reset) are random, stored only as SHA-256 hashes, single-use and
  expiring. Password reset and login do not reveal whether an account exists.
- **Input validation** with zod on every write endpoint; request bodies are parsed and typed.
- **Upload validation:** MIME-type allow-lists and size limits for avatars and documents.
- **Private documents:** qualification files are never publicly served; access requires the owning
  tutor or an administrator, and admin access is written to the audit log.
- **Rate limiting** on the API, stricter on auth endpoints.
- **Audit logging:** an append-only trail records security- and moderation-sensitive actions.
- **HTTP hardening** via Helmet (security headers); CORS restricted to the configured web origin.
- **Environment validation:** production refuses to start with demo login enabled, a weak/default
  session secret, or missing storage credentials. Safety is derived from `APP_ENV`, never the
  hostname. Demo seed/reset/export commands refuse to run when `APP_ENV=production`.
- **Account deletion** anonymises personal data while preserving referential integrity.

## Outstanding before real users

- [ ] Independent penetration testing.
- [ ] Final legal review of terms, privacy policy and data-processing basis (current policy text is
      a placeholder).
- [ ] Privacy impact assessment (PII: names, emails, messages, uploaded documents).
- [ ] Production monitoring, alerting and centralised logging.
- [ ] Production email-domain verification (SPF/DKIM/DMARC) with a real SMTP provider.
- [ ] Formal incident-response and breach-notification process.
- [ ] Load testing; move rate limiting and (optionally) sessions to a shared store when scaling
      beyond a single node.
- [ ] Malware scanning of uploaded documents.
- [ ] Consider upgrading password hashing to Argon2id and adding breach-list checks.
- [ ] Multi-factor authentication for administrators.

## Reporting

For a production deployment, publish a security contact and follow the incident-response process
once established. Until then, report issues privately to the platform owner.
