import crypto from 'node:crypto';

// Generates a URL-safe secret to email to a user, plus the SHA-256 hash we
// store. Only the hash is persisted, so a database leak does not expose live
// verification/reset links.
export function generateToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
