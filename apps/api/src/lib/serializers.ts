import type { User } from '@prisma/client';

export function avatarUrl(user: { id: number; avatarKey: string | null }): string | null {
  return user.avatarKey ? `/api/files/avatar/${user.id}` : null;
}

// Minimal public identity. Never exposes email, password hash, status, etc.
export function publicUser(user: { id: number; displayName: string; avatarKey: string | null }) {
  return { id: user.id, displayName: user.displayName, avatarUrl: avatarUrl(user) };
}

// The signed-in user's own account view.
export function selfUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    bio: user.bio,
    roles: user.roles,
    status: user.status,
    avatarUrl: avatarUrl(user),
    emailVerified: !!user.emailVerifiedAt,
    termsAccepted: !!user.termsAcceptedAt,
    createdAt: user.createdAt,
  };
}

export function money(cents: number | null | undefined, currency = 'NZD'): {
  cents: number;
  currency: string;
  display: string;
} | null {
  if (cents === null || cents === undefined) return null;
  return {
    cents,
    currency,
    display: new Intl.NumberFormat('en-NZ', { style: 'currency', currency }).format(cents / 100),
  };
}
