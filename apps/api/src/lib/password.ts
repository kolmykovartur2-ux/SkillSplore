import bcrypt from 'bcryptjs';
import { badRequest } from './errors.js';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Minimum viable password policy for the MVP. Documented; can be strengthened
// (breach-list checks, zxcvbn) before accepting real users.
export function assertPasswordStrength(password: string): void {
  if (password.length < 10) throw badRequest('Password must be at least 10 characters.');
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw badRequest('Password must contain letters and numbers.');
  }
}
