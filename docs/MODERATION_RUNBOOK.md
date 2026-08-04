# Moderation runbook

**Status: draft for review.**

## Triage order

1. **Risk to a child** — ahead of everything else. See `CHILD_SAFETY.md`.
2. Threats of violence, or risk to life.
3. Sexual content or sexual services.
4. Fraud and financial harm.
5. Harassment.
6. Everything else.

## Accessing private message content

There is exactly one route: `logModeratorMessageAccess`, which requires a
permitted ground and a written reason of at least ten characters, and records
the access in `ModeratorAccessLog`.

Permitted grounds — the ones published in the Privacy Policy, and the only ones
the function accepts:

`support`, `report`, `fraud`, `rules`, `security`, `legal`, `serious-harm`

"I was curious" is not a ground. The function fails closed on an invalid ground
or a token reason, which occasionally means re-submitting with a real one. That
is the intended cost.

## Actions available

| Action | Mechanism | When |
|---|---|---|
| Warn | Notification / email | First minor breach |
| Hide content | `hiddenAt` | Content breaches the rules; the row is preserved |
| Restrict | `AccountRestriction` | Repeated breaches, short of suspension |
| Suspend | `User.suspendedAt` | Serious or repeated breach |
| Terminate | Account closure | Severe breach |
| Preserve evidence | Do not delete | Any referral |
| Refer to authorities | Police / child protection | Crime or risk to life |

**Never hard-delete evidence.** Hiding removes it from view; the record stays.

## Principles

- **Proportionate.** Match the action to the breach, not to how annoying the
  person was.
- **Explain where you can.** Terms s16 commits to telling people what was done
  and why, and giving an opportunity to respond, where appropriate and lawful.
  Serious immediate risk is the exception — act first, explain after.
- **Reviews are not removed for being negative.** Only for breaching the rules:
  fabricated, purchased, extortionate, irrelevant, or privacy-invasive.
- **Record it.** `AuditLog` and `AdminNote`.

## Reviewing a provider application

Check the profile is coherent, the claims are plausible, and that anything in a
regulated field (Prohibited Services, Part B) has evidence of the required
licence.

**Approval is not verification.** It does not confirm identity, qualifications
or safety, and no badge may imply otherwise. Badges state exactly what was
checked.

## Escalation

Anything involving a child, a credible threat, a possible crime, a regulator, a
legal demand, or a suspected data breach goes to the founder immediately. For a
suspected breach, start `BREACH_RESPONSE.md`.

## Gaps

- Single moderator (the founder). No cover, no second opinion, and no
  separation between the person moderating and the person who owns the business.
- No proactive scanning; moderation is entirely report-driven.
- No formal appeal process beyond the disputes route in Terms s22.
