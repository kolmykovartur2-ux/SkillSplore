# Handling privacy requests

**Status: draft for review.**

How access, correction, export, deletion, opt-out and complaint requests are
received and handled. Records live in `PrivacyRequest` / `PrivacyRequestEvent`.

## How requests arrive

- `/privacy-request` — the public form. **No login required**, deliberately:
  someone whose account was closed, or who appears in another user's content
  without ever registering, still has the right to ask what is held about them.
- `admin@skillsplore.org` — recorded manually into the same table so nothing is
  tracked in only one place.

## Request types

`ACCESS`, `CORRECTION`, `EXPORT`, `DEACTIVATION`, `DELETION`,
`MARKETING_OPT_OUT`, `CONSENT_WITHDRAWAL`, `COMPLAINT`,
`AUTOMATED_DECISION_ENQUIRY`.

## Workflow

`RECEIVED` → `IDENTITY_CHECK` → `IN_PROGRESS` → (`AWAITING_USER`) →
`COMPLETED` | `REFUSED` | `WITHDRAWN`

Every transition writes a `PrivacyRequestEvent`. Refusals require
`refusalReason` — the requester must be told why, and a regulator may review it
later.

## Identity verification must be proportionate

Record what you did in `identityCheckNote`.

| Request | Proportionate check |
|---|---|
| Marketing opt-out | None — just action it |
| Access / export | Confirm control of the account email |
| Correction | Confirm control of the account email |
| Deletion | Confirm control of the account email; confirm intent |
| Request about another user's content | Enough to establish the person is who they say, without collecting more than necessary |

**Do not demand identity documents for a simple opt-out.** Collecting a
passport scan to action an unsubscribe creates a worse privacy problem than the
one being solved.

## Fulfilling each type

**Access / export.** `npm run export` currently dumps the whole database, not
one user's data. A per-user export does not exist yet — a real gap that must be
closed before launch, or fulfilled manually with care in the meantime.

**Correction.** Most profile fields are self-service. Use this route for things
the user cannot edit themselves.

**Deletion.** The existing flow anonymises in place: email and name scrambled,
`deletedAt` set, while reviews, messages and engagements survive under the
anonymised identity so other people's history stays intact.

Tell the requester plainly that deletion may not immediately remove: legally
required records; fraud-prevention records; evidence in a live dispute; copies
in backup cycles until they expire; content already delivered to another user;
or properly de-identified data.

Whether anonymisation satisfies a specific erasure obligation is a legal
question — see `LEGAL_REVIEW_REQUIRED.md`.

**Consent withdrawal.** Self-service in account settings. Handle here only if
the user cannot access their account.

**Complaint.** Investigate, respond in writing with reasons, and tell the person
they may approach the Privacy Commissioner (NZ) or the OAIC (AU) regardless of
our answer. Do not imply they need our permission.

**Automated decision enquiry.** We have no automated decision-making producing
legal effects. Search ranking affects visibility, and we currently publish no
explanation of it — see question 9 in `LEGAL_REVIEW_REQUIRED.md`.

## Response times

**No timeframe is committed to anywhere in the product.** Statutory periods
differ by jurisdiction and the founder has not yet agreed to a service level.
Confirm the applicable period with the lawyer, then state it — in the Privacy
Policy and in the form confirmation — rather than leaving it vague.

## Gaps

- No per-user export
- No automated deletion job
- Single-person team: no cover if the founder is unavailable
