// Consent wording — LAWYER-REVIEW DRAFTS.
//
// These become ConsentVersion rows. The wording is stored on each UserConsent
// at the moment it is granted, so rewording a consent here never rewrites what
// an existing user is recorded as having agreed to.
//
// Rules encoded in this file rather than left to the UI:
//   * `defaultChecked` does not exist. There is no way to express a pre-ticked
//     consent, because a pre-ticked box is not consent.
//   * DATA_INSIGHTS carries an explicit exclusion list. The list is long on
//     purpose: it is the part a user actually needs in order to decide.

import type { ConsentKind } from '@prisma/client';

export interface ConsentVersionDef {
  kind: ConsentKind;
  version: string;
  /** Verbatim label rendered next to the (never pre-ticked) checkbox. */
  wording: string;
  purpose: string;
  dataCategories: string[];
  excludedCategories: string[];
  recipientCategories: string[];
  countries: string[];
  retentionSummary: string;
  withdrawalSummary: string;
  recipientsMustDeleteOnWithdrawal: boolean;
  priorDisclosuresReversible: boolean;
}

/**
 * Categories that must never appear in any insights programme. Enforced in
 * code (see assertInsightsCategoriesSafe) rather than only described in prose,
 * so adding a new data category cannot silently opt it in.
 */
export const ALWAYS_EXCLUDED_FROM_INSIGHTS: readonly string[] = [
  'children_information',
  'names',
  'exact_addresses',
  'private_messages',
  'identity_documents',
  'payment_credentials',
  'reports',
  'complaints',
  'moderation_records',
  'health_information',
  'disability_information',
  'educational_support_needs',
  'precise_location',
  'government_identifiers',
];

export const CONSENT_VERSIONS: ConsentVersionDef[] = [
  {
    kind: 'MARKETING_EMAIL',
    version: '2026-08-04-draft-1',
    wording:
      'Send me occasional emails about new features and tips for using SkillSplore. '
      + 'I understand this is optional, that I do not need it to use SkillSplore, '
      + 'and that I can unsubscribe at any time.',
    purpose: 'To send optional product and feature updates.',
    dataCategories: ['email_address', 'display_name'],
    excludedCategories: [...ALWAYS_EXCLUDED_FROM_INSIGHTS],
    recipientCategories: ['Email delivery provider'],
    countries: [],
    retentionSummary:
      'Kept until you unsubscribe or close your account. The record that you consented, and later '
      + 'withdrew, is kept afterwards as evidence that we had permission at the time.',
    withdrawalSummary:
      'Unsubscribe from any marketing email, or turn it off in your account settings. Takes effect '
      + 'immediately for anything not already queued for sending.',
    recipientsMustDeleteOnWithdrawal: true,
    priorDisclosuresReversible: false,
  },
  {
    kind: 'ANALYTICS_COOKIES',
    version: '2026-08-04-draft-1',
    wording:
      'Allow optional analytics cookies to help us understand how SkillSplore is used. '
      + 'I understand this is optional and that declining does not affect my use of the site.',
    purpose: 'To measure aggregate site usage so we can improve navigation and search.',
    dataCategories: ['pages_viewed', 'searches', 'feature_usage', 'referral_source'],
    excludedCategories: [...ALWAYS_EXCLUDED_FROM_INSIGHTS],
    recipientCategories: [],
    countries: [],
    retentionSummary: 'Not currently applicable — no analytics product is in use.',
    withdrawalSummary: 'Turn off analytics cookies in your account settings or the cookie banner.',
    recipientsMustDeleteOnWithdrawal: true,
    priorDisclosuresReversible: false,
  },
  {
    kind: 'DATA_INSIGHTS',
    version: '2026-08-04-draft-1',
    wording:
      'Include my activity in SkillSplore’s aggregated market-insight reports. '
      + 'I understand this is entirely optional, that I do not need it to use SkillSplore, '
      + 'that my name and messages are never included, and that I can withdraw at any time.',
    purpose:
      'To produce aggregated, de-identified statistical reports about broad platform activity — for '
      + 'example demand for a subject by broad region, seasonal trends, or typical response times. '
      + 'Reports are aggregated so that an individual is not reasonably identifiable. Recipients are '
      + 'contractually prohibited from attempting to re-identify anyone or from combining a report '
      + 'with another dataset to do so.',
    dataCategories: [
      'subject_category_interest',
      'broad_region',
      'delivery_mode_preference',
      'broad_price_band',
      'response_time_band',
      'season_of_activity',
    ],
    excludedCategories: [...ALWAYS_EXCLUDED_FROM_INSIGHTS],
    recipientCategories: [
      'Education sector researchers',
      'Market research organisations',
      'Public sector education and skills agencies',
    ],
    countries: [],
    retentionSummary:
      'Contribution stops when you withdraw. Reports already produced and delivered continue to '
      + 'exist, because they are aggregated and contain no record identifying you to remove.',
    withdrawalSummary:
      'Withdraw at any time in your account settings. Withdrawal takes effect going forward: your '
      + 'activity stops being included in reports produced after that point.',
    // Honest answers, not flattering ones. An aggregate report cannot have one
    // person's contribution surgically removed after the fact, and saying
    // otherwise on the consent screen would be a misrepresentation.
    recipientsMustDeleteOnWithdrawal: false,
    priorDisclosuresReversible: false,
  },
];

export class InsightsCategoryExcludedError extends Error {
  constructor(offending: string[]) {
    super(
      `These data categories can never be included in an insights programme: ${offending.join(', ')}. `
      + 'See ALWAYS_EXCLUDED_FROM_INSIGHTS in src/content/legal/consents.ts.',
    );
    this.name = 'InsightsCategoryExcludedError';
  }
}

/**
 * Guard for any code path that assembles an insights dataset. Throws rather
 * than filtering silently: if a caller is asking for private messages, the
 * correct outcome is a loud failure, not a quietly smaller result set.
 */
export function assertInsightsCategoriesSafe(categories: readonly string[]): void {
  const offending = categories.filter((c) => ALWAYS_EXCLUDED_FROM_INSIGHTS.includes(c));
  if (offending.length > 0) throw new InsightsCategoryExcludedError(offending);
}
