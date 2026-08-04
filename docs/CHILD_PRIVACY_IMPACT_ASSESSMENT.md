# Children's privacy impact assessment

**Status: draft for review. Not legal advice.**
Assessed 2026-08-04.

## Scope

SkillSplore does not permit children to hold accounts. But it is used to
arrange lessons *for* children, so children's personal information enters the
system indirectly — through what an adult writes in a request or a message.

This assessment covers that indirect flow. It is separate from
`PRIVACY_IMPACT_ASSESSMENT.md` because the risk profile is different: the
subject of the information cannot consent, cannot exercise their own rights
through the product, and may not know the platform exists.

## How children's information enters

| Route | Example | Control |
|---|---|---|
| Learning request | "My daughter is in Year 9 and needs help with NCEA maths" | Public to approved providers. No field asks for a child's name, and none should be added. |
| Private message | Scheduling, ability level, what the child struggles with | Participants only |
| Attachment | A marked assignment | Participants only |
| Review | "My son really enjoyed the lessons" | **Public** |

**Every one of these is free text.** There is no structured child-data field
anywhere in the schema, which is deliberate — a structured field invites
completion, and there is no version of "child's date of birth" that improves
the product.

## What is never published

- A child's contact details
- A child's exact location or address
- A child's school or timetable
- A child's photograph (no upload path attaches one to a child)

## What is never used

- Children's information is in `ALWAYS_EXCLUDED_FROM_INSIGHTS`, and
  `assertInsightsCategoriesSafe` **throws** rather than filtering it out.
- `SELL_CHILD_DATA` is false, has no implementation, and production refuses to
  boot if it is set.
- No behavioural advertising exists at all, to anyone.

## Risks specific to children

| Risk | Control | Residual |
|---|---|---|
| An adult writes identifying detail about a child into a public request | Contextual notice at request creation; no field invites it | **Medium** — free text cannot be prevented, only discouraged |
| A review identifies a child | Community Guidelines prohibit publishing others' personal information; reports remove it | Medium |
| A provider contacts a child directly outside the arrangement | Prohibited in Terms and Community Guidelines; grooming indicators listed in `CHILD_SAFETY.md`; child reports triaged first | **High — off-platform contact is undetectable** |
| A child's information persists after the parent closes the account | Anonymisation preserves message and review content | **Medium — unresolved**, see below |
| Age self-declaration is false and a child holds an account | None beyond the checkbox | **Medium** |

## Two unresolved items

**1. A child cannot exercise rights through the product.** The parent holds the
account, so a child has no route to ask what is held about them. In practice
they would use `/privacy-request`, which is open to non-users — but nothing
tells them that, and they would have no way to prove the connection. Needs a
decision.

**2. Anonymisation does not remove children's details from free text.** Closing
a parent's account scrambles the parent's identifiers, but a message saying
"my daughter Emma struggles with fractions" survives intact under the
anonymised identity. Whether that is acceptable is a legal question — raised in
`LEGAL_REVIEW_REQUIRED.md`.

## Regulatory watch

- **New Zealand:** Privacy Act 2020 rights apply regardless of age. There is no
  separate children's code, but the reasonableness of collection is judged in
  context, and the context here is children.
- **Australia:** a Children's Online Privacy Code is under development for
  services likely to be accessed by children. Whether SkillSplore falls within
  scope — given children do not hold accounts but are the subject of the
  service — needs confirming. Do not assume the 18+ rule places it outside.

## Conclusion

The design keeps children's data minimal by refusing to structure it, never
publishing it, and never admitting it to any data programme. The residual risk
sits in free text an adult chooses to write, and in off-platform contact the
system cannot see.

**Any future change permitting under-18 accounts invalidates this assessment
entirely and requires it to be redone before build.**
