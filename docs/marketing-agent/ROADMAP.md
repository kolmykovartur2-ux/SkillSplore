# Roadmap

Phases as defined in the original product spec (§38), tracked against what's actually built.

- [x] **Phase 1** — Documentation, architecture, PostgreSQL schema, Docker, dashboard foundation.
- [x] **Phase 2** — Content ideas, campaigns, briefs, facts, draft workflow.
- [x] **Phase 3** — AI-provider adapters (Anthropic, OpenAI-compatible, Ollama) and the
      deterministic template fallback.
- [x] **Phase 4** — Review, versioning, approval, scheduling.
- [x] **Phase 5** — Mock LinkedIn API and the complete demo flow, including the 12-post launch
      calendar seeded as real drafts.
- [x] **Phase 6** — Official LinkedIn OAuth and company-page authorization. Built, but
      **unverified against the live API** — see `KNOWN_LIMITATIONS.md`. Treat the founder's first
      real connect as the actual completion of this phase.
- [x] **Phase 7** — Official Posts API publication. Same caveat as Phase 6.
- [x] **Phase 8** — Analytics retrieval where approved. Same caveat.
- [ ] **Phase 9** — Security review, full test coverage, export, backup. Partially done: export
      and backup are implemented and documented; a real independent security review has not
      happened (see `MARKETING_AGENT_SECURITY.md`'s outstanding list).
- [ ] **Phase 10** — Production deployment and LinkedIn app-review preparation. `LINKEDIN_SETUP.md`
      and `LINKEDIN_APP_REVIEW.md` document exactly what the founder needs to do; the actual
      LinkedIn review is entirely LinkedIn's decision, outside this codebase's control.

## Near-term follow-ups (not committed to a phase)

- Live-verify the real LinkedIn integration end to end (first real connect + first real publish)
  and fix whatever the real API's actual response shapes reveal needs fixing.
- Drag-and-drop calendar rescheduling (currently unschedule + reschedule via the draft page).
- A real administrator alert channel (email or Slack webhook) on final publish failure.
- Comment inbox + human-approved reply drafting (§26 of the original spec) — deliberately not
  built yet; requires `r_organization_social` read access to actually list comments.
- Paid LinkedIn advertising — explicitly out of scope per the original spec (§25) unless
  separately instructed; would need `rw_ads`, a human-approved budget ceiling, and its own
  compliance review before any code is written.
