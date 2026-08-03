// Deterministic, provider-independent draft evaluation (§16 step 6-12, §17).
// Every rule here only ever *attaches a warning* — it never rewrites founder
// wording, and it never blocks saving a draft. Only the schedule step
// actually enforces anything (approval required, §7).

export interface EvaluationWarning {
  category:
    | 'exaggerated_language'
    | 'banned_cta'
    | 'hashtags'
    | 'length'
    | 'unsupported_claim'
    | 'personal_info'
    | 'repetition';
  message: string;
}

// §3 — language to avoid unless a statement is supported by current evidence
// and explicitly approved.
const BANNED_LANGUAGE = [
  'revolutionary',
  'disrupting',
  'disrupting an industry',
  'market-leading',
  'the number-one platform',
  'number one platform',
  'thousands of users',
  'transforming everything',
  'game-changing',
  'game changing',
  'unprecedented growth',
  'guaranteed work',
  'guaranteed customers',
  'best providers',
  'fully verified professionals',
];

// §20 — calls to action to avoid.
const BANNED_CTA = [
  'sign up before it is too late',
  'sign up before it’s too late',
  'limited spots remaining',
  'guaranteed customers',
  'earn thousands',
  'become successful instantly',
  'get unlimited leads',
  'join the revolution',
];

// Heuristic only: a number followed by a word suggesting scale/outcomes.
// Flags for founder review — it does not know whether the number is backed
// by an approved MarketingFact; that check happens in the drafts module,
// which has access to the brief's claimsRequiringVerification and the fact
// store. This function stays presentation-only so it has no DB dependency.
const NUMERIC_CLAIM = /\b\d[\d,]*\+?\s*(users?|tutors?|students?|customers?|providers?|matches?|requests?|reviews?|%|percent)\b/gi;

const HASHTAG = /#[a-z0-9_]+/gi;

export function evaluateDraftContent(input: {
  body: string;
  maxLength: number;
  hasUnverifiedClaims: boolean;
  recentDraftBodies: string[];
}): EvaluationWarning[] {
  const warnings: EvaluationWarning[] = [];
  const lower = input.body.toLowerCase();

  for (const phrase of BANNED_LANGUAGE) {
    if (lower.includes(phrase)) {
      warnings.push({
        category: 'exaggerated_language',
        message: `Contains language SkillSplore's brand voice avoids: "${phrase}". Only use this if it's backed by current evidence and explicitly approved.`,
      });
    }
  }

  for (const phrase of BANNED_CTA) {
    if (lower.includes(phrase)) {
      warnings.push({
        category: 'banned_cta',
        message: `Contains a call to action SkillSplore avoids: "${phrase}".`,
      });
    }
  }

  const hashtagCount = (input.body.match(HASHTAG) ?? []).length;
  if (hashtagCount > 3) {
    warnings.push({
      category: 'hashtags',
      message: `${hashtagCount} hashtags — default policy is zero to three relevant tags.`,
    });
  }

  if (input.body.length > input.maxLength) {
    warnings.push({
      category: 'length',
      message: `${input.body.length} characters exceeds the brief's maximum of ${input.maxLength}.`,
    });
  }

  if (NUMERIC_CLAIM.test(input.body) && input.hasUnverifiedClaims) {
    warnings.push({
      category: 'unsupported_claim',
      message:
        'Mentions a number that reads like a user/outcome claim, and the brief has no approved fact backing it. Verify or remove.',
    });
  }
  NUMERIC_CLAIM.lastIndex = 0;

  if (looksLikePersonalName(input.body)) {
    warnings.push({
      category: 'personal_info',
      message:
        'This may reference a specific person by name. Publishing an identifiable customer/tutor story requires a recorded consent (see the Consents module).',
    });
  }

  for (const prior of input.recentDraftBodies) {
    if (trigramSimilarity(input.body, prior) > 0.6) {
      warnings.push({
        category: 'repetition',
        message: 'This draft is very similar to a recent draft — check it is not repeating the same idea.',
      });
      break;
    }
  }

  return warnings;
}

// Heuristic: two consecutive capitalised words that aren't at the start of a
// sentence and aren't a known SkillSplore/place-name term. Deliberately
// conservative (false positives are cheap — it's a warning, not a block).
function looksLikePersonalName(body: string): boolean {
  const allowlist = new Set(['SkillSplore', 'New Zealand', 'Auckland', 'LinkedIn']);
  const matches = body.match(/(?<!^|[.!?]\s)\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g) ?? [];
  return matches.some((m) => !allowlist.has(m));
}

function trigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 2; i++) set.add(normalized.slice(i, i + 3));
  return set;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersection = 0;
  for (const t of ta) if (tb.has(t)) intersection++;
  return intersection / Math.min(ta.size, tb.size);
}
