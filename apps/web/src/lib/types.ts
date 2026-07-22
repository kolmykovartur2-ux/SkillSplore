export type Role = 'STUDENT' | 'TUTOR' | 'ADMIN';

export interface SelfUser {
  id: number;
  email: string;
  displayName: string;
  bio: string | null;
  roles: Role[];
  status: 'ACTIVE' | 'SUSPENDED';
  avatarUrl: string | null;
  emailVerified: boolean;
  termsAccepted: boolean;
  createdAt: string;
}

export interface Money {
  cents: number;
  currency: string;
  display: string;
}

export interface PublicUser {
  id: number;
  displayName: string;
  avatarUrl: string | null;
}

export interface AppConfig {
  appEnv: 'development' | 'demo' | 'production';
  showDemoBanner: boolean;
  demoLoginEnabled: boolean;
  demoBannerText: string;
}

export interface SearchResult {
  id: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  headline: string | null;
  country: string | null;
  city: string | null;
  deliveryMode: string;
  hourlyRate: Money | null;
  averageRating: number;
  ratingCount: number;
  subjects: string[];
  verified: boolean;
}

export interface PageMeta { total: number; page: number; pageSize: number; totalPages: number; }
