/**
 * Placeholder registry for the legal document drafts.
 *
 * Every legal document ships with visible `[[SQUARE_DOUBLE_BRACKET]]` tokens
 * wherever a real-world fact is required that only the founder or their lawyer
 * can supply -- the registered entity name, the NZBN, the Privacy Officer's
 * contact address, the governing jurisdiction.
 *
 * The point of making these machine-detectable rather than a note in a
 * checklist is that a half-filled policy is worse than an obviously unfinished
 * one. A page that says "governed by the laws of [[GOVERNING_JURISDICTION]]"
 * is plainly a draft. A page where somebody filled in eight of nine
 * placeholders and shipped it reads as authoritative while still being wrong.
 *
 * `scanPlaceholders` is called when a document version is created, and the
 * result is stored on LegalDocumentVersion.unresolvedPlaceholders. A version
 * with a non-empty list can never be marked production ready -- see
 * `assertPublishable`.
 */

export interface PlaceholderDef {
  /** Token as it appears in the document, without the brackets. */
  key: string;
  /** What the founder needs to supply. */
  label: string;
  /** Why it matters, surfaced in the admin UI and in LEGAL_REVIEW_REQUIRED.md. */
  note: string;
}

/**
 * The placeholders every legal document is expected to be able to use. Not
 * every document uses every one; this is the vocabulary, not a per-document
 * requirement.
 */
export const LEGAL_PLACEHOLDERS: PlaceholderDef[] = [
  {
    key: 'LEGAL_ENTITY_NAME',
    label: 'Full legal entity name',
    note: 'The company or sole trader that actually operates SkillSplore and would be named in a claim.',
  },
  {
    key: 'TRADING_NAME',
    label: 'Trading name',
    note: 'The name shown to the public, if different from the legal entity name.',
  },
  {
    key: 'COMPANY_NUMBER',
    label: 'Company registration number',
    note: 'Companies Office number or the equivalent in the country of incorporation.',
  },
  {
    key: 'BUSINESS_IDENTIFIER',
    label: 'NZBN, ABN or other business identifier',
    note: 'Used so a user or regulator can identify the operator unambiguously.',
  },
  {
    key: 'REGISTERED_ADDRESS',
    label: 'Registered address',
    note: 'A real service address. Required for formal notices and regulator correspondence.',
  },
  {
    key: 'GOVERNING_JURISDICTION',
    label: 'Governing law and jurisdiction',
    note: 'Must not be chosen to sidestep mandatory New Zealand or Australian consumer protections.',
  },
  {
    key: 'PRIVACY_OFFICER_NAME',
    label: 'Privacy Officer name',
    note: 'New Zealand agencies must appoint a Privacy Officer. Name the person, not a department.',
  },
  {
    key: 'PRIVACY_EMAIL',
    label: 'Privacy contact email',
    note: 'Where access, correction, deletion and complaint requests are received.',
  },
  {
    key: 'SUPPORT_EMAIL',
    label: 'Support email',
    note: 'General user support address.',
  },
  {
    key: 'SECURITY_EMAIL',
    label: 'Security contact email',
    note: 'Where vulnerability reports and suspected breaches are received.',
  },
  {
    key: 'DISPUTE_EMAIL',
    label: 'Disputes email',
    note: 'Entry point for the formal complaint and dispute process in the Terms.',
  },
  {
    key: 'EFFECTIVE_DATE',
    label: 'Effective date',
    note: 'The date the document takes effect. Must not predate legal review.',
  },
  {
    key: 'LAST_UPDATED_DATE',
    label: 'Last updated date',
    note: 'Shown at the top of every policy page.',
  },
];

export const PLACEHOLDER_KEYS: ReadonlySet<string> = new Set(LEGAL_PLACEHOLDERS.map((p) => p.key));

/**
 * Matches `[[ANY_TOKEN]]`. Intentionally broader than PLACEHOLDER_KEYS so an
 * unrecognised token (a typo like `[[PRIVACY_EMIAL]]`, or a new one somebody
 * invented) is still reported as unresolved rather than silently shipping.
 */
const PLACEHOLDER_PATTERN = /\[\[([A-Z0-9_]+)\]\]/g;

export interface PlaceholderScan {
  /** Distinct tokens found, in first-seen order. */
  unresolved: string[];
  /** Tokens found that are not in the registry -- usually a typo. */
  unknown: string[];
  /** Total occurrences, useful for a "12 placeholders remaining" count. */
  occurrences: number;
}

export function scanPlaceholders(body: string): PlaceholderScan {
  const unresolved: string[] = [];
  const unknown: string[] = [];
  let occurrences = 0;

  for (const match of body.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1]!;
    occurrences++;
    if (!unresolved.includes(key)) {
      unresolved.push(key);
      if (!PLACEHOLDER_KEYS.has(key)) unknown.push(key);
    }
  }

  return { unresolved, unknown, occurrences };
}

export function hasUnresolvedPlaceholders(body: string): boolean {
  PLACEHOLDER_PATTERN.lastIndex = 0;
  return PLACEHOLDER_PATTERN.test(body);
}

export class LegalDocumentNotPublishableError extends Error {
  readonly unresolved: string[];
  constructor(unresolved: string[]) {
    super(
      `This document still contains ${unresolved.length} unresolved placeholder(s) and cannot be `
      + `marked production ready: ${unresolved.map((k) => `[[${k}]]`).join(', ')}. `
      + 'Fill these in and have a qualified lawyer review the result first.',
    );
    this.name = 'LegalDocumentNotPublishableError';
    this.unresolved = unresolved;
  }
}

/**
 * Gate for marking a version production ready. Throws rather than returning a
 * boolean so a caller cannot accidentally ignore the result.
 *
 * Note what this does NOT check: whether the content is legally correct, or
 * whether a lawyer actually read it. `legalReviewedAt` records that separately
 * and is set by a human. This function only guarantees that no obvious
 * fill-in-the-blank is left, which is the part a computer can actually verify.
 */
export function assertPublishable(body: string): void {
  const { unresolved } = scanPlaceholders(body);
  if (unresolved.length > 0) throw new LegalDocumentNotPublishableError(unresolved);
}
