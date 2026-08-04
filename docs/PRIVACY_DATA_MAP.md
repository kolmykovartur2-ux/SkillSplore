# Privacy data map

**Status: draft. Reflects the schema as of 2026-08-04.**

What personal information SkillSplore holds, where it lives, and whether it is
public.

## Legend

- **Public** — visible to anyone, including logged-out visitors and search engines
- **Participants** — visible to the people in a specific conversation or engagement
- **Private** — visible to the user and to authorised staff on a recorded ground
- **Internal** — staff only; never shown to users

## Account and identity

| Data | Table | Visibility |
|---|---|---|
| Email address | `User.email` | Private |
| Password hash | `User.passwordHash` | Internal (never returned by any endpoint) |
| Display name | `User.displayName` | **Public** |
| Bio | `User.bio` | **Public** |
| Avatar | `User.avatarKey` | **Public** |
| Roles, status | `User.roles`, `User.status` | Internal |
| Adult confirmation | Not stored as a column — enforced at registration | — |
| Failed logins, lockout | `User.failedLoginCount`, `lockedUntil` | Internal |

**No plain-text password is stored anywhere.**

`confirmAdult` is validated but not persisted. If evidence of the declaration
is ever needed, that is a schema change — noted as a gap.

## Tutor profile

`TutorProfile`, `TutorSubject`, `AvailabilitySlot`, `Qualification`,
`Verification`.

**Public:** headline, experience, teaching style, subjects, delivery mode,
country, city, hourly rate, availability, ratings, active verification badges.

**Internal:** application status, reviewer notes, qualification evidence,
verification reviewer identity.

City is a general locality, not a street address. No exact address field exists
on a profile.

## Requests and responses

`TutoringRequest`, `RequestResponse`. Visible to the poster and to approved
providers via the feed. `customSubjectLabel` (free text from "Other subject or
skill") is shown wherever the subject is shown.

## Messages

`Conversation`, `ConversationParticipant`, `Message`.

**Participants only.** Access by staff requires
`logModeratorMessageAccess` with a permitted ground and a written reason, and
is recorded in `ModeratorAccessLog`.

**Never** used for advertising or profiling, and never sent to analytics.

## Reviews

`Review`. Rating and body are **public**. Moderation state is internal.

## Safety and moderation

`Report`, `AdminNote`, `Block`, `AccountRestriction`, `AuditLog`,
`ModeratorAccessLog`. All **internal**. Reports are never shown to the person
reported.

## Legal, consent and privacy operations

| Data | Table | Visibility |
|---|---|---|
| Which policy version was accepted | `UserLegalAcceptance` | Private (own records visible in account settings) |
| Consent grants and wording | `UserConsent` | Private |
| Withdrawals | `ConsentWithdrawal` | Private |
| Privacy requests | `PrivacyRequest`, `PrivacyRequestEvent` | Private / internal |
| Disclosures to third parties | `DataDisclosureRecord` | Internal |
| Privacy incidents | `PrivacyIncident`, `BreachAssessment` | Internal |

## Technical and behavioural

IP address, user agent, session identifier, error logs, login attempts.

IP and user agent are stored **only** alongside consent and acceptance records,
where they are evidence of the act. There is no general behavioural event log —
`Analytics event log` remains an open task, and if it is built, this map and
the Cookie Notice must be updated first.

## Never collected

- Full payment card numbers or security codes — no payments are processed
- Government identifiers
- Health information
- Biometric data
- Precise geolocation
- Contact lists or address books

## Children

No child holds an account. Information about a child exists only where an adult
chose to include it in a request or message. It is never published and never
included in any data programme. See `CHILD_SAFETY.md`.

## Related

- `DATA_MODEL.md` — full schema
- `DATA_RETENTION.md` — how long each category is kept
- `SUBPROCESSORS.md` — who else processes it
