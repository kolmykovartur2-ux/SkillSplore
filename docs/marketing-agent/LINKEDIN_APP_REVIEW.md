# LinkedIn app review

## Development Tier (first step)

Requested under the developer app's Products section: **Community Management API, Development
Tier**. This is reviewed before being granted, but is the lighter-weight tier — intended for
building and testing before a full production application.

Explain the use case accurately (see the suggested wording in `LINKEDIN_SETUP.md` step 8) —
truthfully describing this as a Page-management tool with mandatory human approval, not an
engagement bot, is both the honest description and the one most likely to be approved: LinkedIn's
review specifically looks for exactly the automated-engagement patterns this codebase avoids
(automated connections, DMs, likes, comments, artificial impressions).

## Standard Tier (later)

After Development Tier access and a working connection (built in this codebase — see
`ROADMAP.md` Phase 6-8), LinkedIn may require a Standard Tier application containing:

- A working OAuth demonstration.
- Test credentials.
- A product and use-case explanation.
- A downloadable screen recording.
- A demonstration of posting to the Page.
- A demonstration of any analytics or comments shown inside the application.

**Preparing the screen recording:** once real publishing is verified (see
`KNOWN_LIMITATIONS.md` — do this after your first successful real connect-and-publish), record:
1. Logging into the dashboard.
2. Generating a draft, reviewing warnings, editing, approving.
3. Scheduling it, then using "Publish now".
4. The published post appearing on the actual LinkedIn Page.
5. The Analytics page showing synced data for that post.

This walks through the exact same generate → review → edit → approve → schedule → publish loop
described in `CONTENT_APPROVAL.md` — nothing to stage separately for the recording, it's the
same tool used for real content.

## What to never claim in a review application

- That this integration has been tested against the live API by its original build process (it
  hasn't — see `KNOWN_LIMITATIONS.md`; only the founder's own real usage verifies it).
- That any automated engagement (likes, comments, follows, connection requests, DMs) exists —
  it doesn't, and never will per the original product spec §26.
- That paid advertising is part of this application — it isn't (§25); that's an explicitly
  separate, unbuilt phase requiring its own review.

## If access is denied or delayed

Draft-only mode remains fully functional regardless of API approval status — generate, review,
approve, and schedule content, then copy the approved text to LinkedIn manually until access is
granted. Nothing about the founder's day-to-day workflow depends on Development/Standard Tier
approval except the final automated "Publish now" click.
