# Legal benchmark: profi.ru vs SkillSplore

**Status: internal working note. Not legal advice.**
Compared on 2026-08-04 against the then-current published versions of
`profi.ru/documents/privacy-policy/` and `profi.ru/documents/terms-of-use/`.

## Why this comparison has limited value

Worth stating up front, because it constrains every conclusion below.

1. **Different legal regime.** profi.ru is a Russian operator writing for
   Russian law (152-FZ on personal data, Russian consumer legislation).
   SkillSplore is aimed at New Zealand and Australia. The Privacy Act 2020, the
   Australian Privacy Principles, the Consumer Guarantees Act and the
   Australian Consumer Law impose obligations that a Russian policy has no
   reason to address — and vice versa.
2. **Different business model.** profi.ru processes payments and takes
   commission. A large part of their Terms is about compensation, VAT and
   refunds. SkillSplore does not touch lesson payments at all, so those clauses
   have no analogue here and copying their shape would misdescribe what we do.
3. **Copyright.** Their wording is theirs. This comparison is a coverage check,
   not a source of text. Nothing in our drafts is derived from their language.

What the comparison *is* good for: checking we have not overlooked a topic a
mature marketplace found necessary.

## Structural comparison

| | profi.ru | SkillSplore draft |
|---|---|---|
| Privacy Policy sections | 9 | 21 |
| Terms sections | 8 | 29 |
| Separate community/safety/prohibited-services policies | No | Yes (6 more documents) |
| Recommendation-algorithm disclosure | Separate published document | **Gap — see below** |

## Topics they cover that we should check

### 1. Recommendation and ranking algorithms — genuine gap

profi.ru publishes a separate document on recommendation algorithms. Russian
law requires it; NZ/AU currently do not. But we have:

- a search ranking with a `relevance` sort;
- a `AUTOMATED_DECISION_ENQUIRY` privacy request type that a user can submit;
- no published explanation of how ranking works to answer it with.

**Action:** either publish a short plain-language note on how search ordering
works, or accept that the enquiry route exists with no prepared answer. The
first is cheap and closes the loop. Tracked in `LEGAL_REVIEW_REQUIRED.md`.

### 2. A defined pre-litigation complaint period

Their Terms require a written complaint and a 30-day response window before
court. Our draft Terms (s22) set out the steps but attach no timeframe.

**Action:** ask the lawyer whether to commit to a specific acknowledgement and
response period. A stated period is good practice and reassures users, but it
is a commitment the founder has to actually be able to meet.

### 3. Refund and cancellation mechanics

Extensive in theirs, absent in ours — correctly, because we do not process
payments. **No action.** Do not import this; it would describe a service we do
not operate. If SkillSplore ever introduces its own fees, revisit.

## Topics we cover that they do not

These validate the approach rather than requiring action.

| Topic | profi.ru | SkillSplore |
|---|---|---|
| Prohibited services list | Not addressed | Full policy, prohibited + restricted + judgement-call tiers |
| Provider licensing/registration requirements | Not addressed | Terms s15 + Prohibited Services Part B |
| Children's privacy specifically | Only capacity-to-contract | 18+ account holders, child data never published, never in any data programme |
| Retention schedule | "until the purpose is achieved" | Documented per-category schedule, marked for approval |
| User-rights procedure | Email address only | Nine request types, tracked workflow, event history, DB-backed |
| Moderator access to private messages | Not addressed | Mandatory ground + written reason + audit log |
| Subprocessor register | Two named telecoms | Full register with contract status and review dates |

The children's-privacy difference is the most significant. A platform used to
arrange lessons for children needs more than a capacity-to-contract clause, and
that is a substantive divergence rather than a stylistic one.

## Two things in their policy worth *not* copying

1. **A conditional no-sale statement.** Theirs says personal data is not sold
   or provided for marketing *without consent*. That carve-out means the
   sentence does not actually promise much. Our statement is unconditional:
   we do not sell personal information or user-level behavioural profiles, full
   stop, and the configuration is asserted by a test.

2. **Combining "anonymised" data with third-party information.** Their policy
   reserves the right to do this. That is precisely the re-identification
   vector our aggregate-insights contracts are required to prohibit
   (Privacy Policy s8). Keep the prohibition.

Also noted: they run Google Analytics, AppsFlyer and Yandex.Metrica. We
currently run no third-party analytics at all, which is why our Cookie Notice
has an empty Analytics section. That emptiness is accurate and should stay
accurate — if analytics is ever added, the notice must be updated *first*.

## Conclusion

The comparison surfaced one real gap (recommendation-algorithm transparency)
and one question for the lawyer (a defined complaint-response period).
Everything else either does not transfer across jurisdictions, does not apply
to a platform that takes no payments, or is already covered more thoroughly on
our side.
