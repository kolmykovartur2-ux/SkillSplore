# Privacy impact assessment

**Status: draft for review. Not legal advice.**
Assessed 2026-08-04 against the repository at that date.

## What the platform does

A moderated noticeboard. People publish profiles offering to teach a skill,
others post what they want to learn, the two message each other, and they
arrange a session — online or in person — directly between themselves.
SkillSplore takes no payment and is not a party to the arrangement.

## Why this carries real privacy risk

Three things make this more than a directory:

1. **People meet in person**, sometimes in homes.
2. **Children are involved**, arranged by their parents.
3. **Private messaging** carries information people would not publish.

## Risk register

| # | Risk | Likelihood | Impact | Controls | Residual |
|---|---|---|---|---|---|
| 1 | A child is harmed by someone met through the platform | Low | Severe | 18+ accounts; parent-arranged; safety guidance; report button; child reports triaged first; referral process | **High — not eliminable by software.** See `CHILD_SAFETY.md` |
| 2 | Staff read private messages without cause | Low | High | Single mandatory access path with recorded ground and written reason; audit log; fails closed | Low |
| 3 | A user publishes more about themselves than they meant to | Medium | Medium | Public/private split; profile preview before publishing; contextual notices at collection points | Medium |
| 4 | A child's details end up published | Low | High | No child accounts; no publishing of child contact, location, school or timetable | Low |
| 5 | Data breach exposing accounts | Low | High | Hashed passwords; HTTP-only secure cookies; role-based access; rate limiting; lockout; breach procedure | Medium |
| 6 | Uploads lost or exposed | **High** | Medium | `STORAGE_DRIVER=local` on Render free tier is **not persistent** — uploads are lost on redeploy | **High — unresolved.** See `KNOWN_LIMITATIONS.md` |
| 7 | Verification badge misread as a safety guarantee | Medium | High | Badges state what was checked; Privacy and Safety policies both say explicitly it is not a criminal check | Medium |
| 8 | Data sold or misused for advertising | **Very low** | High | Not implemented; five env flags forced false; production refuses to boot if set; asserted by tests | Very low |
| 9 | Re-identification from an aggregate report | Low | High | Programme disabled; sensitive categories throw rather than filter; contractual prohibition required before any licensing | Low (while disabled) |
| 10 | Verification emails never delivered | **High** | Medium | **No production SMTP provider is configured.** Accounts cannot verify in production today | **High — unresolved** |
| 11 | Retention creep | **High** | Medium | Nothing is deleted; no expiry job exists; schedule drafted but unapproved | **High — unresolved** |
| 12 | Single-person operation | Certain | Medium | None. One person is Privacy Officer, moderator, incident lead and owner | **High — structural** |

## The four unresolved items

Risks 6, 10, 11 and 12 are not mitigated and should not be presented as if they
were:

- **Uploads are not durable in the current deployment.** Needs a paid disk or
  S3-compatible storage.
- **No email provider.** Verification, password reset and notifications will not
  be delivered in production.
- **Nothing is ever deleted.** The retention schedule exists on paper only.
- **No cover for the founder.** No backup Privacy Officer, no second moderator.

## Data minimisation

Reasonable. No date of birth, no government identifiers, no precise location, no
payment credentials, no health data. IP and user agent are stored only where
they are evidence of a consent or acceptance, not as a general activity log.

The main excess is that **nothing is deleted**, which converts good collection
practice into an accumulating liability over time.

## Consent

Marketing is separate from account creation, never pre-ticked, and withdrawable.
The insights programme is disabled and gated on both configuration and a
recorded legal review. Consent records are append-only and store the exact
wording shown. See `CONSENT_MANAGEMENT.md`.

## Transparency

Eight published policies, contextual notices at collection points, a public
privacy-request form open to non-users, and a machine-readable
`/api/legal/data-practices` endpoint stating the no-sale position.

Every document is currently a **draft** and labelled as such on the page.

## Conclusion

The controls that can be implemented in software are implemented and tested.
The residual risk is concentrated in four operational gaps and in the
irreducible risk of arranging in-person contact — including with children —
which no amount of policy text addresses.

Do not launch without resolving risks 6, 10 and 11, and without a decision on
12.
