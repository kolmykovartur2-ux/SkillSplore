# Roadmap

_Last updated: 2026-08-03_

This is a working roadmap, not a commitment to dates or scope. See
[`PRODUCT_POSITIONING.md`](PRODUCT_POSITIONING.md) for what the product is, and
[`CURRENT_STATE.md`](CURRENT_STATE.md) for what's actually built today.

## Now: pre-launch

SkillSplore is pre-launch. The current focus is making the product experience honestly reflect
that: no fabricated activity, no permanent pricing promises, a broad skills catalogue rather than
tutoring-only, and moderation/verification copy that says exactly what it means.

Open items before inviting real early users at any scale:

- Independent security review and the outstanding items in [`SECURITY.md`](SECURITY.md).
- Professional legal review of Terms, Privacy and the tutoring/consumer-law implications of the
  jurisdiction(s) actually being launched in (both documents are explicitly marked as drafts).
- A decided revenue model. Nothing should be charged or promised until this is settled and approved
  — see the "claims that require evidence" list in `PRODUCT_POSITIONING.md`.
- A real, monitored contact channel before adding a public "Contact" link (deliberately omitted from
  the footer for now).
- Analytics event logging, so launch decisions are based on real funnel data rather than guesses.
- Community guidelines and a prohibited-services policy.
- Additional automated test coverage for rate limiting and upload validation.

## Next: strengthen the core loop

Once early usage exists, prioritise evidence over expansion:

- Instrument the request → response → match funnel and look at it weekly.
- Fix friction in whichever step is actually losing people, rather than adding new features.
- Grow the provider base in the categories that already have real learner demand.
- Only add a new category or feature once there's a specific reason to believe it will be used, not
  because it's easy to build.

## Explicitly not decided yet

The following ideas have been discussed but are **not approved for implementation**: paid
introductions/lead pricing, tutor activation fees, featured/sponsored listings, commission on
sessions, or expansion into non-tutoring service categories beyond the existing broad skills
catalogue. Do not implement or advertise any of these without an explicit go-ahead — see
`PRODUCT_POSITIONING.md` for why premature pricing claims are actively harmful to trust right now.
