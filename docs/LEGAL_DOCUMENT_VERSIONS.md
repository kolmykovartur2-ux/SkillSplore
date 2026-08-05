# Legal document versioning

**Status: draft for review.**

How policy text is stored, versioned, published and evidenced.

## Where the text lives

Source of truth: `apps/api/src/content/legal/`.

Kept in source rather than edited through an admin screen, deliberately —
policy changes then get reviewed like code, diff like code, and land in the
same review process as the code they describe.

| File | Documents |
|---|---|
| `privacy.ts` | Privacy Policy |
| `terms.ts` | Terms of Use |
| `policies.ts` | Community Guidelines, Safety, Prohibited Services, Cookie Notice, Subprocessors |
| `consents.ts` | Consent wording (separate lifecycle — see `CONSENT_MANAGEMENT.md`) |
| `index.ts` | Registry: slug → title → public path → body |

## How it reaches the database

`syncLegalDocuments` (`src/lib/legalSync.ts`) runs on boot, from
`prisma/bootstrap.mjs`, and during `demo:seed`.

Rules:

1. **Additive only.** Never updates or deletes an existing version.
2. **A published version is immutable.** If the source body no longer matches
   the newest stored version, a *new* version is created. Rewriting would
   destroy the evidentiary value of every `UserLegalAcceptance` pointing at it.
3. **New versions land unpublished** and unreviewed. A redeploy can never
   silently promote unreviewed text to a live policy.
4. Version labels: `2026-08-04-draft-1`, then
   `2026-08-04-draft-1+<body-fingerprint>` for subsequent drift.

## Publishing

`publishVersion()` sets `publishedAt`, `effectiveAt`, and points
`LegalDocument.currentVersionId` at the version.

**It refuses if any `[[PLACEHOLDER]]` remains.** That gate is the only thing
standing between a half-filled draft and a live policy page.

It deliberately does **not** require `legalReviewedAt`. A founder may
legitimately want filled-in drafts on a staging site before a lawyer has signed
off. What is guaranteed is that no fill-in-the-blank ever reaches a reader —
not that the content is sound. `legalReviewedAt` / `legalReviewedBy` record the
human review separately, and the public page shows a draft banner until both
publication and review are done.

## What users see

`GET /api/legal/documents/:path` returns the body plus `isPublished`,
`isLegallyReviewed`, `unresolvedPlaceholders` and `placeholderOccurrences`.

`PolicyPage.tsx` renders a prominent **"Draft — not yet in force"** banner if
the document is unpublished, unreviewed, or still has placeholders, including
the count of outstanding details. Presenting an unreviewed draft as a live
policy would be worse than having no page at all — it invites reliance on
something nobody has checked.

If nothing has been synced yet, the endpoint falls back to the in-source body,
so the pages work on a cold database.

## Acceptance evidence

`UserLegalAcceptance` — append-only, one row per user per version, unique on
`(userId, versionId)`. Records method, IP, user agent and timestamp.

`versionId` uses `onDelete: Restrict`: a version that somebody accepted cannot
be deleted out from under the record.

Only `TERMS` and `PRIVACY` require acceptance. The other six are published
rules incorporated by reference in the Terms — asking someone to tick eight
boxes produces worse-quality consent, not better.

Registration records acceptance of the newest version of both, best-effort: a
signup must not fail because the sync has not run on a fresh database.

## Changing a policy

1. Edit the source file.
2. Deploy — the boot sync creates a new unpublished version.
3. Fill in placeholders if any were added.
4. Have the change reviewed; record `legalReviewedAt` / `legalReviewedBy`.
5. `publishVersion()`.
6. For a **material** change, prompt existing users to re-accept. Terms s24
   commits to reasonable notice and no retrospective application.

Step 6 is not yet automated — there is no re-acceptance prompt in the UI. A
gap, not a solved problem.
