// Registry tying each legal document slug to its draft body.
//
// The bodies live in source rather than being edited in an admin UI on
// purpose: they are reviewed like code, they diff like code, and a change to
// a policy shows up in the same review process as a change to the code the
// policy describes. Publishing a version copies the body into the database,
// which is what freezes it for evidence purposes.

import type { LegalDocumentSlug } from '@prisma/client';
import { PRIVACY_POLICY } from './privacy.js';
import { TERMS_OF_USE } from './terms.js';
import {
  COMMUNITY_GUIDELINES,
  SAFETY_POLICY,
  ACADEMIC_INTEGRITY_POLICY,
  PROHIBITED_SERVICES_POLICY,
  COOKIE_NOTICE,
  SUBPROCESSOR_NOTICE,
} from './policies.js';

export interface LegalDocumentDef {
  slug: LegalDocumentSlug;
  title: string;
  /** Public route this document is served at. */
  path: string;
  body: string;
  /**
   * Whether a user has to actively accept this document to hold an account.
   * Only the Terms and the Privacy Policy do; the rest are published rules
   * that the Terms already incorporate by reference. Asking someone to tick
   * eight boxes at registration produces worse-quality consent, not better.
   */
  requiresAcceptance: boolean;
}

/** Version label applied to the initial drafts. */
export const INITIAL_VERSION = '2026-08-04-draft-1';

export const LEGAL_DOCUMENTS: LegalDocumentDef[] = [
  { slug: 'TERMS', title: 'Terms of Use', path: '/terms', body: TERMS_OF_USE, requiresAcceptance: true },
  { slug: 'PRIVACY', title: 'Privacy Policy', path: '/privacy', body: PRIVACY_POLICY, requiresAcceptance: true },
  { slug: 'COMMUNITY_GUIDELINES', title: 'Community Guidelines', path: '/community-guidelines', body: COMMUNITY_GUIDELINES, requiresAcceptance: false },
  { slug: 'SAFETY', title: 'Safety Policy', path: '/safety', body: SAFETY_POLICY, requiresAcceptance: false },
  { slug: 'ACADEMIC_INTEGRITY', title: 'Academic Integrity Policy', path: '/academic-integrity', body: ACADEMIC_INTEGRITY_POLICY, requiresAcceptance: false },
  { slug: 'PROHIBITED_SERVICES', title: 'Prohibited and Restricted Services', path: '/prohibited-services', body: PROHIBITED_SERVICES_POLICY, requiresAcceptance: false },
  { slug: 'COOKIES', title: 'Cookie Notice', path: '/cookies', body: COOKIE_NOTICE, requiresAcceptance: false },
  { slug: 'SUBPROCESSORS', title: 'Subprocessors', path: '/subprocessors', body: SUBPROCESSOR_NOTICE, requiresAcceptance: false },
];

export const DOCUMENTS_REQUIRING_ACCEPTANCE = LEGAL_DOCUMENTS.filter((d) => d.requiresAcceptance);

export { PRIVACY_POLICY, TERMS_OF_USE };
