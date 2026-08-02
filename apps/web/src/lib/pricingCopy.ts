// Central source of truth for payment/pricing-related public copy.
//
// SkillSplore's revenue model is not finalised. When pricing policy changes,
// update the strings here rather than editing individual pages — every page
// that references payments or rates should import from this file.

export const PAYMENT_DISCLAIMER = 'SkillSplore does not process payments.';

export const RATES_ARE_SELF_SET = 'Tutors and teachers set their own rates.';

export const ARRANGEMENT_DISCLAIMER =
  `Learning is arranged and paid directly between both people. ${PAYMENT_DISCLAIMER}`;
