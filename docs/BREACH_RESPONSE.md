# Privacy breach response procedure

**Status: draft for review. Not legal advice.**

Covers a privacy breach — unauthorised access to, disclosure of, or loss of
personal information. For a security vulnerability with no known data exposure,
start at `SECURITY.md`; if exposure is suspected, come here.

Records live in the `PrivacyIncident` and `BreachAssessment` tables.

---

## Step 1 — Detect and record

Open a `PrivacyIncident` immediately, before you know how bad it is. A record
opened and later closed as harmless costs nothing; one opened three days late
loses the timeline.

Capture: reference, summary, `detectedAt` (when *we* became aware, not when it
started), and who raised it.

## Step 2 — Contain

Stop the bleeding first. Revoke credentials, disable the affected route, take
the feature offline, force session invalidation — whatever ends the exposure.

Set `containedAt`. Containment comes before investigation.

## Step 3 — Preserve evidence

Before cleaning up:

- snapshot relevant logs (they may rotate);
- note the deployed commit;
- preserve the database state if practical;
- record who accessed what, and when.

Do not "tidy" the affected system. Fixing forward is fine; destroying the trail
is not.

## Step 4 — Assess

Create a `BreachAssessment`. Answer explicitly:

- What categories of information were involved? (Sensitive categories —
  identity documents, children's information, message content — raise the
  stakes considerably.)
- How many people are affected?
- Who could have accessed it, and is it recoverable?
- **Is serious harm likely?**

`seriousHarmLikely` is deliberately nullable and starts unset. It is a judgement
a person records, not a value the system computes.

## Step 5 — Decide on notification

> **This procedure does not pre-decide whether an incident is notifiable.**
> That is assessed case by case against the applicable threshold, and the
> reasoning is recorded in `BreachAssessment.reasoning`.

Points for the assessment:

- New Zealand: notifiable privacy breaches must be reported to the Office of
  the Privacy Commissioner where the serious-harm threshold is met. The
  Commissioner has indicated an expectation of notification **as soon as
  practicable — in the order of 72 hours** after becoming aware. Confirm the
  current requirement with the lawyer; do not rely on this file.
- Australia: the Notifiable Data Breaches scheme applies where the Privacy Act
  applies to the business. Whether it does is itself a question — see
  `LEGAL_REVIEW_REQUIRED.md`.

If in doubt, take advice. The cost of an unnecessary notification is
embarrassment; the cost of a missed one is an enforcement action.

Record `regulatorNotifiedAt` and `usersNotifiedAt` when done.

## Step 6 — Notify affected people

Where notification is required or appropriate, tell people plainly:

- what happened, and when;
- what information was involved;
- what we have done;
- what they should do (change a password, watch for phishing);
- how to contact us — `admin@skillsplore.org`, Privacy Officer
  `[[PRIVACY_OFFICER_NAME]]`.

No minimising language. If we do not yet know the scope, say that.

## Step 7 — Remediate

Fix the root cause, not just the symptom. Record it in `remediation`.

## Step 8 — Post-incident review

Within two weeks of closing. Record in `postIncidentReview`:

- timeline from cause to containment;
- what detected it — and if it was a user rather than our own monitoring, why;
- what would have prevented it;
- what would have caught it sooner;
- follow-up actions, with owners.

Then set `closedAt`.

---

## Roles

Currently one person: the founder is Privacy Officer, incident lead and
communications. **This is a single point of failure** and should be noted as
such. Nominate a backup before launch.

## Contacts

| | |
|---|---|
| Privacy Officer | `[[PRIVACY_OFFICER_NAME]]` |
| Privacy | `admin@skillsplore.org` |
| Security | `admin@skillsplore.org` |
| NZ regulator | Office of the Privacy Commissioner |
| AU regulator | Office of the Australian Information Commissioner |

## Related

- `INCIDENT_RESPONSE.md` — general (non-privacy) incidents
- `SECURITY.md` — security posture
- `CHILD_SAFETY.md` — anything involving a child takes priority over everything here
