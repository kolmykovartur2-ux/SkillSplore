# Consent management

**Status: draft for review.**

How consent is captured, stored and withdrawn, and the design rules that make
the records worth anything.

## Design rules

### 1. Evidence is append-only

A withdrawal never rewrites a grant. `UserConsent.withdrawnAt` is set and a
`ConsentWithdrawal` row is created; the original grant keeps its timestamp,
method and wording.

If a user later disputes what they agreed to, the record has to show what the
wording actually said **at the moment they agreed to it**. A mutable row cannot
do that.

### 2. Wording is copied, not referenced

`UserConsent.grantedWording` duplicates the `ConsentVersion` text. Deliberate
denormalisation: rewording a consent must never retroactively change what an
existing user is recorded as having agreed to.

### 3. There is no way to express a pre-ticked box

- `ConsentVersionDef` has no `defaultChecked` field.
- `GET /api/consents` returns no default-state field — a client has nothing to
  read that would make a box start ticked. Asserted by a test.
- `POST /api/consents` requires `confirmed: true` as a literal. Omitting it
  fails validation, so consent cannot be granted by an incomplete request.
- Registration's `marketingOptIn` defaults to `false` and writes nothing unless
  actively true.

### 4. Optional means optional

No consent here is required to use SkillSplore. Marketing is separate from
`acceptTerms` at registration — bundling them is exactly what makes marketing
consent invalid.

### 5. Withdrawal claims are honest

`priorDisclosuresReversible` and `recipientsMustDeleteOnWithdrawal` are stored
per version and shown on the consent screen. For the Data Insights Programme
both are **false**, because an aggregate report already delivered cannot have
one person's contribution surgically removed. Saying otherwise would be a
misrepresentation.

## Consent kinds

| Kind | Status | Notes |
|---|---|---|
| `MARKETING_EMAIL` | Available | Optional product updates. Separate from account creation. |
| `ANALYTICS_COOKIES` | Available, but nothing behind it | No analytics product is in use. |
| `DATA_INSIGHTS` | **Disabled** | Gated on `DATA_INSIGHTS_PROGRAM_ENABLED` *and* a recorded legal review reference. The API refuses a grant while disabled. |

## Data captured per grant

User, kind, version, verbatim wording, method, IP, user agent, timestamp, and
`withdrawnAt` once withdrawn. Withdrawals additionally record reason, method,
and downstream deletion status.

## Always excluded from any insights programme

Enforced by `assertInsightsCategoriesSafe`, which **throws** rather than
filtering — if a caller is asking for private messages, the correct outcome is
a loud failure, not a quietly smaller result set.

`children_information`, `names`, `exact_addresses`, `private_messages`,
`identity_documents`, `payment_credentials`, `reports`, `complaints`,
`moderation_records`, `health_information`, `disability_information`,
`educational_support_needs`, `precise_location`, `government_identifiers`.

A new sensitive field added to `DataCategory` defaults to
`insightsEligible: false`, so the safe state is the default.

## Where to look

| | |
|---|---|
| Wording | `apps/api/src/content/legal/consents.ts` |
| API | `apps/api/src/modules/legal/consent.routes.ts` |
| UI | `apps/web/src/pages/account/PrivacySettings.tsx` |
| Tests | `apps/api/tests/legalPrivacy.test.ts` — "consent API" |
