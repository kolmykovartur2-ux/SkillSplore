# SkillSplore User Journey Audit

Pre-launch pilot-readiness audit. Traced from actual frontend page components (`apps/web/src/pages/**`) through `apps/web/src/lib/api.ts` calls to the actual backend route handlers (`apps/api/src/modules/**/*.routes.ts`) and their Prisma queries. Every row below reflects source actually read, not naming-based inference.

Status legend: **Working** / **Partially working** (functions but has a real gap) / **Broken** (would actually fail or misbehave for a real user) / **Not implemented** / **Intentionally excluded from MVP**.

---

## Visitor journey

| Step | Status | Frontend | Backend | Evidence |
|---|---|---|---|---|
| Understand SkillSplore from homepage | Working | `pages/Home.tsx` | `modules/taxonomy/taxonomy.routes.ts` `GET /overview` | Home.tsx:34-165 renders hero, "two ways to use" explainer, category tiles, how-it-works, benefits — all populated from real API data. |
| Browse categories | **Broken** | `pages/Home.tsx`, `pages/Search.tsx` | `modules/search/search.routes.ts` | Home.tsx:89 links to `/search?categoryId=${c.id}`, but Search.tsx:17 reads `urlParams.get('category')` (wrong key — missing `Id`). Clicking any homepage category tile lands on an **unfiltered** search results page; the category never applies. Manually using the on-page Category dropdown works fine (Search.tsx:35 sets the same `categoryId` key it later reads from its own state, so that round-trip is self-consistent — only the incoming link is broken). |
| Search subjects/skills | Working | `pages/Search.tsx` | `modules/search/search.routes.ts:33-114` | Real DB-backed filtering (subject, category, level, mode, price, location) against `TutorProfile.status='APPROVED'` only. |
| Open a profile | Working | `pages/TutorProfile.tsx` | `modules/tutors/tutors.routes.ts:242-264` | Non-owner/non-admin viewers get `404` for any non-APPROVED profile (tutors.routes.ts:253), so unapproved profiles are never publicly reachable. |
| Understand searching vs. posting a request | Working | `pages/Home.tsx:63-80` | n/a (static copy) | Explicit "Two ways to use SkillSplore" section with two clearly separated CTAs. |
| Reach registration | Working | `pages/Register.tsx` | `modules/auth/auth.routes.ts:32-41`, `auth.schemas.ts:3-8` | `acceptTerms` is enforced server-side as `z.literal(true)`, not just a client checkbox. |
| Access terms/privacy/contact pages | Partially working | `pages/legal/Terms.tsx`, `Privacy.tsx`, `Layout.tsx` footer | n/a (static) | Terms and Privacy pages exist and are linked from footer/register, but explicitly labelled "Draft policy... not yet legally binding" (LegalLayout.tsx:11-13). No `/contact` route exists anywhere in App.tsx and no contact page/form was found in `pages/` — visitors have no on-site way to reach support. |
| Use the site on mobile | Partially working | `styles.css`, `components/Layout.tsx` | n/a | Grid layouts (search, profile, messages, admin detail) correctly collapse to 1 column under 860px (styles.css:279-284) and hero/nav scale down under 600px (styles.css:267-276). However `Layout.tsx:50-69` renders ~9 nav items (Browse skills, Post a request, How it works, Dashboard, My requests, Matching requests, Messages, Alerts, Admin) plus an avatar menu for a logged-in tutor/admin with only `flex-wrap` and no hamburger/collapse — on a narrow viewport this wraps into a cluttered multi-line bar rather than a proper mobile nav. |

---

## Learner journey (student role)

| Step | Status | Frontend | Backend | Evidence |
|---|---|---|---|---|
| Register | Working | `pages/Register.tsx` | `auth.routes.ts:32-41`, `auth.service.ts:19-55` | Creates user with `roles:['STUDENT']`, sends verification email via `sendMail`, logs the user in immediately (session regenerated). |
| Verify email if enabled | Partially working | `pages/VerifyEmail.tsx`, `Dashboard.tsx:21-23` | `auth.routes.ts:43-50`, `auth.service.ts:57-67` | Verification flow itself works (24h token TTL) and Dashboard shows an unverified-email reminder. But there is no "resend verification email" endpoint or button anywhere (grepped `auth.routes.ts` — none) — a user who loses/expires the link is stuck unverified, which silently blocks messaging (see "Start a conversation" below). |
| Log in | Working | `pages/Login.tsx` | `auth.routes.ts:52-61`, `auth.service.ts:69-99` | Per-account brute-force lockout after `LOGIN_LOCKOUT_THRESHOLD` (default 8) failed attempts, uniform error message to prevent account enumeration (auth.service.ts:71-89). |
| Recover access (forgot/reset password) | Working | `ForgotPassword.tsx`, `ResetPassword.tsx` | `auth.routes.ts:72-90`, `auth.service.ts:101-141` | Silent success on unknown email (no enumeration), 1h token TTL, invalidates other outstanding reset tokens, clears lockout on successful reset. |
| Complete/edit basic profile | Working | `pages/Account.tsx` | `modules/users/users.routes.ts:16-49` | `PATCH /users/me` (name/bio) and `POST /users/me/avatar` (3MB image limit, type-checked) both wired correctly. |
| Search by subject/skill | Working | `pages/Search.tsx` | `search.routes.ts` | See visitor journey row — works when reached via the on-page filters; broken only via the homepage category-link entry point. |
| Apply filters | Partially working | `pages/Search.tsx:60-107` | `search.routes.ts:13-30` | Category/subject/level/country/city/mode/maxPrice/availableOnly all wired and functional. Backend also supports `minPrice` (search.routes.ts:21) but there is no minimum-price input in the UI — only "Max price / hour" (Search.tsx:101). |
| Save a profile | Working | `pages/TutorProfile.tsx:46-53` | `tutors.routes.ts:266-291` | `POST/DELETE /tutors/:id/save`, upsert-based so idempotent; blocks saving your own profile. |
| Post a learning request | Working | `pages/requests/CreateRequest.tsx` | `modules/requests/requests.routes.ts:128-162` | Validates budgetMin ≤ budgetMax server-side, supports draft-vs-publish via the `publish` flag. |
| Edit / close a request | Partially working | `pages/requests/MyRequests.tsx` | `requests.routes.ts:247-284` | Backend fully supports editing (`PATCH /requests/:id`, blocked once CLOSED) and publish/pause/close actions. Frontend only wires publish/pause/close (MyRequests.tsx:14-17, 43-45) — there is no edit form anywhere in the app (`RequestDetail.tsx` OwnerView only lists responses, no edit UI) and no `api.patch('/requests/...')` call exists in `apps/web/src` at all. Once posted, title/description/budget/etc. cannot be changed through the UI. |
| Upload permitted files | Not implemented | — | — | No file-attachment capability exists for requests or messages anywhere in the frontend, and no matching backend route exists either (`modules/files/files.routes.ts` only serves avatars and tutor qualification documents — neither is request/message-related). |
| Receive responses | Working | `pages/requests/RequestDetail.tsx` OwnerView | `requests.routes.ts:166-236` | Owner view returns every response including proposed rate; non-owner tutors never see competing rates (requests.routes.ts:216-234). |
| Compare responses | Working | `RequestDetail.tsx:58-94` | (same as above) | Rate, rating, headline, intro shown side-by-side per response card. |
| Start a conversation | Partially working | `pages/TutorProfile.tsx:55-64` | `conversations.routes.ts:33-56` | `POST /conversations/contact` is gated by `requireVerified` (conversations.routes.ts:36) — an unverified student who clicks Contact and sends a message gets a runtime 403 ("Please confirm your email address...") with no upfront warning on the Contact button itself. |
| Block/report another user | Partially working | `pages/Messages.tsx:98-102,109-112`; `TutorProfile.tsx:66-74` | `conversations.routes.ts:186-210`; `modules/reports/reports.routes.ts` | Blocking works (upsert, checked both directions in `postMessage`, conversations.service.ts:56-58). But: (1) no "unblock" UI anywhere even though `DELETE /conversations/block/:userId` exists and works; (2) reporting is only wired for `TUTOR_PROFILE` (TutorProfile.tsx:69) and `MESSAGE` (Messages.tsx:110) — the backend also supports reporting `REQUEST`, `REVIEW` and `USER` (reports.routes.ts:13, `admin.moderation.ts` has full handling for all five), but no frontend page exposes a "report this request/review/user" action. |
| Mark an arrangement completed | Working | `pages/Engagements.tsx:21-24,44` | `modules/engagements/engagements.routes.ts:115-128` | `POST /engagements/:id/complete`, blocked once CANCELLED. |
| Leave a genuine review | Working | `Engagements.tsx:58-89` | `modules/reviews/reviews.routes.ts:68-109` | Requires `COMPLETED` engagement, DB unique constraint on `engagementId` prevents duplicates (`schema.prisma:502`), 409 on repeat attempt (reviews.routes.ts:80). |
| Delete/deactivate account | Working | `pages/Account.tsx:41-48` | `modules/users/users.routes.ts:53-84` | Anonymises email/name/password, soft-deletes, suspends any owned tutor profile, deletes avatar from storage — inside a transaction. |

---

## Person offering instruction (tutor/provider role)

| Step | Status | Frontend | Backend | Evidence |
|---|---|---|---|---|
| Register | Working | `pages/Register.tsx` | (same as learner) | Single account model — no separate "provider signup." |
| Create a teaching profile | Working | `pages/tutor/Onboarding.tsx:31-36` | `tutors.routes.ts:24-32`, `tutors.service.ts:8-20` | `POST /tutors/apply` auto-adds the `TUTOR` role and creates a `DRAFT` profile. |
| Add subjects/skills | Working | `Onboarding.tsx` SubjectsStep:138-228 | `tutors.routes.ts:61-84` | `PUT /tutors/me/subjects`, validates all subjectIds exist before replacing the set transactionally. |
| Describe experience | Working | `Onboarding.tsx` ProfileStep:79-136 | `tutors.routes.ts:49-59` | `PATCH /tutors/me` — `experience`/`teachingStyle` free text. |
| Add rates/pricing | Working | `Onboarding.tsx:129` (default rate), `:186` (per-subject) | `tutors.routes.ts:49-59,61-84` | Default hourly rate plus optional per-subject override (`TutorSubject.priceCents`). |
| Select online/in-person availability (delivery mode) | Working | `Onboarding.tsx:114-118` | `tutors.schemas.ts:7` | `deliveryMode` enum ONLINE/IN_PERSON/BOTH. |
| Add location | Working | `Onboarding.tsx:120-127` | `tutors.routes.ts:49-59` | Only shown/required when delivery mode ≠ ONLINE; enforced again at submit time (`tutors.service.ts:171-173`). |
| Add availability (weekly slots) | Working | `Onboarding.tsx` AvailabilityStep:230-271 | `tutors.routes.ts:101-119` | `PUT /tutors/me/availability`, client-side validates end > start before adding a slot; schema re-validates server-side (`tutors.schemas.ts:33-45`). |
| Submit profile for review | Working | `Onboarding.tsx` ReviewStep:327-358 | `tutors.routes.ts:174-192`, `tutors.service.ts:163-177` | `assertSubmittable` enforces headline, experience, teaching style, ≥1 subject, ≥1 level, hourly rate, and country/city if in-person — with itemised problems returned and rendered via `toast(e.details?.problems...)` (Onboarding.tsx:334). |
| Edit profile | Working | `Onboarding.tsx` all steps | `tutors.routes.ts:49-59` | No status guard blocks editing while `PENDING`/`APPROVED` — admin's review screen (`GET /admin/tutors/:id`) always reads the live row, so no staleness issue. |
| Discover relevant learning requests | Working | `pages/tutor/RequestFeed.tsx` | `requests.routes.ts:58-105` | Requires an `APPROVED` profile (403 otherwise, shown as a friendly EmptyState — RequestFeed.tsx:25); defaults to the tutor's own subjects. |
| Respond to a request | Working | `RequestDetail.tsx` TutorView:96-148 | `modules/responses/responses.routes.ts:34-71` | One active response per tutor per request enforced by a DB unique constraint (`schema.prisma:411`) plus an explicit check (responses.routes.ts:44-49); re-submitting after withdrawal is allowed. |
| Withdraw a response | Working | `RequestDetail.tsx:118-122` | `responses.routes.ts:98-107` | Blocked once `ACCEPTED` (responses.routes.ts:103). |
| Message a learner | Working | `pages/Messages.tsx` | `responses.routes.ts:124-169` (auto-message on accept), `conversations.routes.ts:150-163` | A tutor cannot proactively message a student first (asymmetric by design — matches "student contacts / responds" model); once a response is accepted or a student makes contact, both sides can message freely. |
| Report suspicious activity | Partially working | `Messages.tsx:109-112` (message only) | `reports.routes.ts` | Only message-level reporting is reachable from a tutor's side of a conversation. There is no "report this request" action on `RequestFeed.tsx` or `RequestDetail.tsx` despite the backend fully supporting `entityType: 'REQUEST'` reports. |
| View previous responses | Partially working | `RequestFeed.tsx`, `Engagements.tsx` | `requests.routes.ts:58-105` (feed is `status:'OPEN'` only) | No `GET /responses/mine`-style endpoint or page exists. The feed only shows currently-OPEN matching requests, so once a request is paused/closed by the student, a tutor's PENDING/DECLINED/WITHDRAWN response to it disappears from view entirely. Only `ACCEPTED` responses remain visible, indirectly, via `Engagements.tsx`. |
| Deactivate profile | Working | `Onboarding.tsx:352` ("Pause profile") | `tutors.routes.ts:194-205` | `POST /tutors/me/pause`, only from `APPROVED`; `POST /tutors/me/resume` reverses it. |

---

## Administrator journey

| Step | Status | Frontend | Backend | Evidence |
|---|---|---|---|---|
| View pending profiles | Working | `pages/admin/Applications.tsx`, `ApplicationDetail.tsx` | `admin.routes.ts:101-191` | Status-filterable queue, defaults to PENDING; full detail view with qualifications/verifications. |
| Review requests | **Broken** | `pages/admin/AdminDashboard.tsx` | `admin.routes.ts:352-373` (`GET /admin/requests`) | Backend endpoint exists and returns all requests with hidden-flag/response counts, but **no frontend page calls it** and `AdminNav.tsx:3-12` has no link to it. The Admin Dashboard's "Open requests", "Engagements" and "Completed" stat tiles all link to `/admin` itself (AdminDashboard.tsx:17-19) — clicking them just reloads the dashboard, a dead end. Admins can currently only reach a specific request reactively, through a report on it. |
| Moderate reports | Partially working | `pages/admin/AdminReports.tsx`, `ReportDetail.tsx` | `admin.routes.ts:426-491` | List/detail/resolve (investigate/dismiss/resolve) and content-hiding all work. But `resolveSchema` also supports suspending the reported user in the same action (`suspendUserId`, admin.routes.ts:462), and `ReportDetail.tsx` has no field to supply it (only a status Select, a "hide content" checkbox, and a note field) — an admin must separately navigate to Admin Users to suspend the offending account. |
| Suspend/restore accounts | Working | `pages/admin/AdminUsers.tsx` | `admin.routes.ts:77-97` | Suspend records `suspendedReason`/`suspendedAt` and notifies the user; reinstate clears both. |
| Review reported messages | Working | `ReportDetail.tsx` | `admin.moderation.ts:50-54` (`loadReportContext` for MESSAGE) | Shows sender + message body for context before deciding. |
| Remove inappropriate content | Working | `ReportDetail.tsx` "Hide content" checkbox; `AdminReviews.tsx` hide/restore | `admin.moderation.ts:7-36` (`hideContent`) | Correctly branches per entity type: message → `hiddenAt`, review → `status:HIDDEN` + rating recompute, request → `hiddenAt`, tutor profile/user → suspended. |
| Manage categories | Partially working | `pages/admin/AdminTaxonomy.tsx:32-49` | `admin.routes.ts:534-544` | Add-only in the UI; no edit or delete for categories anywhere (no corresponding backend route either — only subjects have a delete route). |
| Manage subject/skill records | Partially working | `AdminTaxonomy.tsx` (add), `AdminSubjectSuggestions.tsx` (review queue) | `admin.routes.ts:546-558` (add), `:569-578` (delete), `:585-677` (suggestion queue) | Add + full suggestion approve/merge/reject workflow work well (with duplicate-prevention logic, admin.routes.ts:641-642). `DELETE /admin/subjects/:id` exists and correctly blocks deletion of in-use subjects, but there is no delete button anywhere in `AdminTaxonomy.tsx`. |
| Manage pricing copy | Not implemented | — | — | `apps/web/src/lib/pricingCopy.ts` centralises the payment-disclaimer strings, but it is a static source file edited by developers, not an admin-editable setting — there is no admin UI or backend route for it. |
| Manage launch-stage configuration | Not implemented | — | — | `APP_ENV`, `SHOW_DEMO_BANNER`, `ENABLE_DEMO_LOGIN`, etc. (`apps/api/src/config/env.ts:17-114`) are process-level environment variables validated at boot, with hard production safety guards (env.ts:81-102). There is no admin UI or API to view/change these at runtime — changing launch stage requires a redeploy. |
| Review audit history | Working | `pages/admin/AdminAudit.tsx` | `admin.routes.ts:520-526` | Simple reverse-chronological log, capped at 200 rows, no filtering UI (minor). |
| Distinguish demo data from production data | Not implemented | `AdminUsers.tsx` and others (no treatment) | `apps/api/prisma/seed.ts`, `_demo.ts:26-40` | Demo/seed accounts are only distinguishable by an `@demo.skillsplore.local` email convention; there is no `isDemo` field on any model (`schema.prisma`) and no admin-UI flag, filter, or badge anywhere marking a record as demo-origin. Protection against seeding into production is real (`guardDemoCommand` refuses to run when `APP_ENV=production`) but that's an ops-side guard, not an admin-facing way to tell demo from real data once seeded. |

---

## High-priority fixes needed

Ordered by how likely a real user hits the problem in normal use (not theoretical edge cases).

**All seven are now fixed** (2026-08-03). Each is kept below with a note rather than deleted, so
the original finding stays readable next to what was done about it.

1. **Homepage category browsing is broken** — `apps/web/src/pages/Home.tsx:89` links to `/search?categoryId=X`, but `apps/web/src/pages/Search.tsx:17` reads the query string key `category` instead of `categoryId`. Every visitor who clicks a category tile on the homepage (one of the two primary calls-to-action) lands on an unfiltered "browse everyone" page instead of the category they picked. One-line key mismatch, highest visibility.

   **Fixed 2026-08-03.** `Search.tsx` now reads `categoryId`, matching the link the homepage emits. Live-verified against a running dev server.

2. **Admins cannot browse or moderate open requests proactively** — `GET /admin/requests` (`apps/api/src/modules/admin/admin.routes.ts:352-373`) is fully implemented but has zero frontend surface. The Admin Dashboard's "Open requests", "Engagements" and "Completed" tiles (`apps/web/src/pages/admin/AdminDashboard.tsx:17-19`) link back to `/admin` itself — a dead click for an admin trying to drill in. Requests can currently only be reached reactively via a report.

   **Fixed 2026-08-03.** Added `apps/web/src/pages/admin/AdminRequests.tsx`, wired into `App.tsx` and `AdminNav.tsx`, and repointed the dashboard tiles that previously dead-linked to `/admin`.

3. **Posted requests cannot be edited after creation** — `PATCH /requests/:id` works server-side (`apps/api/src/modules/requests/requests.routes.ts:247-261`) but no frontend page calls it (`apps/web/src/pages/requests/MyRequests.tsx` and `RequestDetail.tsx` only wire publish/pause/close). A learner who makes a typo or wants to adjust budget/description has no way to fix it short of closing and re-posting.

   **Fixed 2026-08-03.** Edit action added to `MyRequests.tsx`, opening a modal for title, description, format and timing; closed requests do not offer it, matching the server rule, and the modal warns when responses already exist. Two API tests added (edit preserves OPEN status and existing responses; an optional field sent empty is actually cleared).

4. **Unverified students hit an unexplained wall when messaging** — `requireVerified` gates `POST /conversations/contact` and `POST /conversations/:id/messages` (`apps/api/src/modules/conversations/conversations.routes.ts:36,153`), but there is no "resend verification email" capability anywhere and the Contact button gives no upfront warning — the failure only surfaces as a toast after the user has already written a message.

   **Fixed 2026-08-03.** Added rate-limited `POST /auth/resend-verification`, which retires outstanding tokens before issuing a new one, plus a shared `VerifyEmailNotice` component wired into the message composer and the contact modal. Both now disable their input up front rather than failing after the message is written. Three API tests added.

5. **Reporting is incomplete for requests, reviews and user accounts** — the backend fully supports reporting `REQUEST`, `REVIEW` and `USER` entities (`apps/api/src/modules/reports/reports.routes.ts:13`, `admin.moderation.ts`), but the frontend only ever reports `TUTOR_PROFILE` and `MESSAGE`. A tutor who spots a spam/abusive request, or anyone who wants to flag a bad review, has no in-app way to do so — undermines the "moderated noticeboard" positioning.

   **Fixed 2026-08-03.** Added a shared `ReportButton` covering all five entity types, replacing the ad-hoc modal previously copied into the profile page. It offers preset reasons plus optional free-text detail, giving moderators structured data instead of one unbounded string. Wired into requests (for non-owners), each review on a profile, and the other person in a conversation. Four API tests, including one walking all five types end to end.

6. **No unblock capability** — `DELETE /conversations/block/:userId` works but is never called from the UI (`apps/web/src/pages/Messages.tsx` only has a Block button, no Unblock). A mistaken block is permanent from the user's perspective.

   **Fixed 2026-08-03.** Added `GET /conversations/blocks` and a "Blocked people" section in Account settings; the Block button now confirms first and states that blocking works both ways and is reversible. Writing the test exposed a routing bug -- `/blocks` sat below `/:id`, so Express parsed "blocks" as a conversation id and returned 500; moved above `/:id` and every other router audited for the same pattern. Four API tests added.

7. **Tutors lose visibility into their own response history** — once a request they responded to is paused/closed by the student, it drops out of `GET /requests/feed` (filtered to `status:'OPEN'`, `apps/api/src/modules/requests/requests.routes.ts:73-76`) and there is no equivalent of "my responses" anywhere, so PENDING/DECLINED/WITHDRAWN responses become permanently invisible to the tutor who made them.

   **Fixed 2026-08-03.** Added `GET /responses/mine` and a My responses page, linked from the dashboard and the account menu (kept out of the main nav, which this same audit flags as overcrowded on mobile). Closed or moderation-removed requests appear without a link and say which happened. Three API tests, one asserting the feed drops the response in the same test that asserts the history keeps it.
