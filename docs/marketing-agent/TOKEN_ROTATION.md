# Token rotation

## Two different secrets, two different purposes

- `SESSION_SECRET` — signs the founder's session cookie. One-way; rotating it just invalidates
  all current sessions (everyone has to log in again).
- `TOKEN_ENCRYPTION_KEY` — encrypts LinkedIn OAuth tokens at rest (AES-256-GCM,
  `src/lib/crypto.ts`). Reversible by design, because the app needs the plaintext token to call
  LinkedIn's API. Rotating this key **without a migration step invalidates every stored LinkedIn
  connection** — `decrypt()` will fail against ciphertext produced with the old key.

## Rotating `SESSION_SECRET`

1. Generate a new value: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
2. Update `TOKEN_ENCRYPTION_KEY`... no — update `SESSION_SECRET` in the deployment's environment.
3. Restart the service. All existing sessions become invalid; the founder logs in again.

## Rotating `TOKEN_ENCRYPTION_KEY`

This build has **no versioned-key / re-encryption scheme** — rotating the key is a breaking
change for any stored LinkedIn connection. Two options:

**Option A — force reconnection (simplest, recommended):**
1. Generate a new `TOKEN_ENCRYPTION_KEY`.
2. Before restarting with the new key, disconnect LinkedIn from the dashboard (or manually clear
   `LinkedinConnection.encryptedAccessToken`/`encryptedRefreshToken` in the database).
3. Restart with the new key. Reconnect LinkedIn from the dashboard.

**Option B — re-encrypt in place (if avoiding a reconnect matters):**
1. Write a one-off script that, using the *old* key, decrypts every `LinkedinConnection` row's
   `encryptedAccessToken`/`encryptedRefreshToken`, then re-encrypts with the *new* key and writes
   it back — before the running service switches to the new key.
2. This is not implemented in this codebase; treat it as a documented gap, not a built feature.

## When to rotate

- Immediately if a `TOKEN_ENCRYPTION_KEY` or `SESSION_SECRET` value is ever exposed (committed to
  git, pasted into a chat, logged, or shared insecurely).
- As routine hygiene on a schedule of your choosing (e.g. annually) — not required by this
  codebase, but good practice.
- On founder account handover — rotate both secrets and generate a fresh `ADMIN_BOOTSTRAP_*`
  account, then remove the old one.

## What is never stored anywhere in plaintext

LinkedIn access/refresh tokens (only `crypto.encrypt()`'d ciphertext in `LinkedinConnection`),
the founder's password (only bcrypt hash in `AdminUser.passwordHash`), and neither secret is ever
written to `AuditLog`, application logs, or sent to a `ContentGenerationProvider`.
