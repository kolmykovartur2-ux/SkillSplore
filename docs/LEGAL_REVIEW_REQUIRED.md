# Legal review required before launch

**Nothing in `apps/api/src/content/legal/` has been reviewed by a lawyer.**
Every document is a draft. This file lists what a qualified lawyer needs to
decide, and what the founder needs to supply.

Read this before publishing anything.

---

## Part 1 — Facts only the founder can supply

Each of these appears in the documents as a `[[TOKEN]]` placeholder. The
publish gate (`assertPublishable` in `src/lib/legalPlaceholders.ts`) refuses to
mark a version production-ready while any remain, so the site cannot
accidentally go live with a half-filled policy.

| Placeholder | What it needs | Why it matters |
|---|---|---|
| `[[BUSINESS_IDENTIFIER]]` | NZBN | Issued on incorporation; not present in the Form 2 director consent. Lets a user or regulator identify the operator unambiguously. |
| `[[EFFECTIVE_DATE]]` | Date | Must not predate legal review. |
| `[[LAST_UPDATED_DATE]]` | Date | Shown at the top of every policy page. |

### Already resolved

**Confirmed 2026-08-05** from the Companies Office Form 2 director consent, and
by the founder confirming incorporation has completed:

| Detail | Value |
|---|---|
| Legal entity | SkillSplore Limited |
| Trading name | SkillSplore |
| Company number | 9449842 |
| Privacy Officer | Artur Kolmykov |
| Governing jurisdiction | New Zealand — still question 6 for the lawyer, on exclusive vs non-exclusive |
| Contact addresses | `admin@skillsplore.org` (privacy, support, security, disputes) |

**Registered address: deliberately NOT published.** The only address in the
incorporation paperwork is the director's *residential* address, and the
founder decided against publishing it. That is the right call for a platform
where strangers arrange in-person meetings, some involving children.

The policies instead state the company name and number and point at the New
Zealand Companies Register, where the registered office is public and can be
looked up. That keeps the operator identifiable — which consumer law expects —
without republishing a home address on the site itself.

**No residential address is recorded anywhere in this repository.** If a
registered office service is arranged later, the wording in `privacy.ts`,
`terms.ts` and `Contact.tsx` can be updated to name it directly.

**Worth changing before launch:** all four contact roles point at one mailbox.
Role aliases (`privacy@`, `security@`, `support@`, `disputes@`) cost nothing on
a domain you already own:

- a security researcher expects `security@` and may not find `admin@`;
- a privacy complaint mixed into general support is easier to lose, and the
  response is what a regulator would later ask about;
- you can hand over `support@` without also handing over the mailbox that
  receives legal correspondence.

Each alias can forward to the same inbox today. Update
`apps/api/src/content/legal/` when they exist.

Current placeholder counts per document: run
`npx tsx apps/api/prisma/syncLegal.ts` and inspect
`LegalDocumentVersion.unresolvedPlaceholders`, or open any policy page — the
draft banner reports the count.

---

## Part 2 — Questions for the lawyer

### 1. The liability cap (Terms s20)

The cap is written as "the greater of (a) fees paid to SkillSplore in the
period, and (b) a figure to be set on advice."

**SkillSplore currently charges users nothing.** A cap expressed purely as
"fees paid" is therefore a cap of **zero**, which is very likely to be found
unfair under the Australian unfair-contract-terms regime and unenforceable.
A monetary floor is needed. What should it be?

### 2. The indemnity (Terms s21)

Drafted narrowly — limited to unlawful conduct, fraud, IP infringement,
material breach, and unlicensed regulated services, and expressly not applying
where our own negligence contributed. Is this the right scope, or is it
narrower than it needs to be?

### 3. Platform liability for user conduct

SkillSplore is a noticeboard. Users meet in person, sometimes with children
present. The Terms disclaim responsibility for provider conduct.

**How far does that disclaimer actually hold** if something happens at a
session arranged through the platform, given we review profiles before
publishing them? Does the review itself create an assumed duty? This is the
single largest exposure in the business and needs a direct answer.

### 4. Verification badges

Badges state what was checked. The Privacy Policy and Safety Policy both say
explicitly that a badge is not a police vet or a working-with-children check.

Is that disclaimer sufficient, or does offering *any* verification create an
expectation we then have to meet? Does the answer change if a badge is ever
offered for work involving children?

### 5. Children

Current design: account holders must be 18+; a parent or guardian arranges
learning for a child through their own account.

- Is self-declared 18+ adequate, or is a stronger check needed?
- Does the platform need working-with-children checks for providers who teach
  minors, in NZ and in each Australian state?
- Australia is developing a Children's Online Privacy Code. Does the current
  design anticipate it adequately?

### 6. Governing law

Do **not** pick an offshore jurisdiction to reduce exposure. Mandatory NZ and
Australian consumer protections apply regardless of the clause, and a clause
that appears designed to evade them is itself a risk. Which jurisdiction, and
should it be exclusive or non-exclusive?

### 7. A defined complaint-response period

Terms s22 sets out the dispute steps but commits to no timeframe. Comparable
platforms commit to a period (see `LEGAL_BENCHMARK.md`). Should we? Only if the
founder can actually meet it.

### 8. Aggregate insights licensing

Privacy Policy s8 permits licensing aggregated, de-identified statistical
reports. Nothing is running and nothing has been licensed.

Before the first report is ever sold:
- Is the aggregation threshold sufficient for individuals not to be reasonably
  identifiable?
- Does licensing such reports amount to "trading in personal information" under
  the Australian Privacy Act, and would that bring the business within the Act
  even where a small-business exemption might otherwise apply?
- Are the contractual anti-re-identification terms adequate?

### 9. Recommendation and ranking transparency

We offer a `relevance` sort and accept `AUTOMATED_DECISION_ENQUIRY` privacy
requests, but publish no explanation of how ranking works. Should we publish
one? (See `LEGAL_BENCHMARK.md`.)

### 10. Retention periods

`DATA_RETENTION.md` lists categories with periods marked **unapproved**. None
were invented from a statute. Each needs a decision, and some need a legal
basis identified (tax and accounting records in particular).

---

## Part 3 — What is deliberately disabled

These are off, and the production boot refuses to start if any is switched on.
See `apps/api/src/config/env.ts`.

| Flag | State | Enforcement |
|---|---|---|
| `SELL_PERSONAL_DATA` | false | Production refuses to boot if true. `env.sellPersonalData` is `false as const`. |
| `SELL_CHILD_DATA` | false | Production refuses to boot if true. |
| `USE_MESSAGES_FOR_ADVERTISING` | false | Production refuses to boot if true. |
| `BEHAVIOURAL_ADVERTISING_ENABLED` | false | Production refuses to boot if true. |
| `DATA_INSIGHTS_PROGRAM_ENABLED` | false | Requires `DATA_INSIGHTS_LEGAL_REVIEW_REF` to be set before production will start. |

There is **no implementation** behind the first four. They exist so that
enabling data selling is an explicit, greppable, test-failing act rather than
something that can be added quietly later.

Verification: `GET /api/legal/data-practices`, and the
`data monetisation is disabled` suite in `apps/api/tests/legalPrivacy.test.ts`.

---

## Part 4 — Publishing checklist

1. Fill in every placeholder in `apps/api/src/content/legal/`.
2. Run `npx tsx apps/api/prisma/syncLegal.ts` — creates new draft versions.
3. Have a lawyer review the filled-in text.
4. Record the review: set `legalReviewedAt` and `legalReviewedBy` on the version.
5. Publish with `publishVersion()` — it refuses if any placeholder remains.
6. Confirm the draft banner has disappeared from every policy page.

Steps 3 and 4 are not automated and must not be. The placeholder gate only
proves nobody forgot to fill in a blank; it proves nothing about whether the
content is legally sound.
