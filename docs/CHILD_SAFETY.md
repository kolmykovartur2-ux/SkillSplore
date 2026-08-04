# Child safety

**Status: draft for review. Not legal advice.**

SkillSplore is used to arrange lessons, and some of those lessons are for
children. This is the highest-consequence risk area in the product.

---

## Current design

| Control | State |
|---|---|
| Minimum age for an account holder | 18, self-declared at registration (`confirmAdult`, enforced in `auth.schemas.ts`) |
| Children holding accounts | **Not permitted** |
| How a child gets a lesson | A parent or guardian arranges it through their own adult account and stays responsible for it |
| Child contact details published | Never |
| Child exact location published | Never |
| Child school or timetable published | Never |
| Children's data in any data programme | **Never** — `children_information` is in `ALWAYS_EXCLUDED_FROM_INSIGHTS` and the guard throws rather than filtering |
| Behavioural advertising to children | Not performed; the platform runs no behavioural advertising at all |

**Self-declared age is a weak control and is not presented as anything more.**
Its purpose is that the platform never *knowingly* holds a child's account,
which keeps the children's-privacy surface limited to information an adult
chose to share about their own child. Whether this is sufficient is question 5
in `LEGAL_REVIEW_REQUIRED.md`.

## What is NOT in place

Stated plainly, because assuming otherwise is dangerous:

- **No working-with-children checks.** No police vetting, no WWCC, no NDIS
  screening, in any jurisdiction.
- **No identity verification** of providers.
- **No supervision of sessions.** Sessions happen off-platform.
- **No proactive scanning** of message content for grooming indicators.
- **No age verification** beyond a checkbox.

Verification badges state exactly what was checked, and both the Privacy Policy
and the Safety Policy say explicitly that a badge is not a criminal record
check. That wording must not be softened.

## Reporting and escalation

### Immediate risk to a child

1. **Contact police first.** Not us first.
2. Then notify `admin@skillsplore.org` so we can act on the account.
3. We preserve evidence, suspend the account, and refer as required.

### Concerning but not immediate

Report through the in-product report button — it carries the surrounding
context, which an email does not.

Reports involving a child are triaged **ahead of everything else in the
queue**.

### Handling

1. **Preserve first.** Do not delete anything. Set `hiddenAt` to remove content
   from view; the row stays.
2. **Restrict the account** — suspension, or an `AccountRestriction` short of it.
3. **Access message content only through `logModeratorMessageAccess`**, with
   ground `serious-harm`, and a written reason. There is no path around this
   and there must not be one.
4. **Refer** to police or the relevant child protection authority. In New
   Zealand, Oranga Tamariki. In Australia, the relevant state or territory
   agency.
5. **Record** the decision and the referral.

Err toward referral. It is not our job to determine whether a crime occurred.

## Grooming indicators worth acting on

Not exhaustive, and not a substitute for judgement:

- moving conversation off-platform quickly, especially to a channel a parent
  cannot see;
- asking a child for personal contact details, photographs or location;
- requesting sessions without an adult present;
- secrecy framing — "don't tell your parents";
- gifts, money, or special treatment;
- an adult account whose activity is overwhelmingly directed at minors.

## Guidance given to parents

In the Safety Policy: meet publicly where practical for a first in-person
session; be present or nearby, with the door open; never leave a child alone
with someone newly met; do not share the child's school, timetable, address or
contact details; treat any private contact outside the arranged session as a
red flag.

## Open questions

Tracked in `LEGAL_REVIEW_REQUIRED.md` (question 5):

- Are working-with-children checks legally required for providers teaching
  minors, in NZ and in each Australian state?
- Is self-declared 18+ adequate?
- Does Australia's forthcoming Children's Online Privacy Code apply, and does
  the current design anticipate it?
- Does reviewing profiles before publication create an assumed duty of care?

Any future change permitting accounts for under-18s requires separate legal and
product review **before** it is built.

## Related

- `CHILD_PRIVACY_IMPACT_ASSESSMENT.md`
- `MODERATION_RUNBOOK.md`
- `BREACH_RESPONSE.md`
