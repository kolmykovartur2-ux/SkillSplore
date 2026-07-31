# Features

Every item below is implemented against a real PostgreSQL database with real authentication and
permissions. Nothing important is simulated in frontend state only.

## Authentication & accounts
- [x] Register with email and password
- [x] Email confirmation (token emailed via the email adapter; captured by Mailpit in dev)
- [x] Log in / log out (server-side sessions in PostgreSQL, session regenerated on login)
- [x] Password reset by email (hashed single-use tokens, no account enumeration)
- [x] Persistent session (rolling cookie, hardened in production)
- [x] Edit profile, upload avatar
- [x] Delete account (anonymises personal data, preserves referential integrity)
- [x] Accept terms & privacy policy at registration
- [x] One account holds both student and tutor roles; admin role supported

## Tutor onboarding
- [x] Become a tutor; multi-step profile with save-as-you-go
- [x] Subjects (with subject-specific price overrides), teaching levels
- [x] Experience, teaching style, years of experience
- [x] Own default price; online / in-person / both; location and travel radius
- [x] Weekly availability slots + availability note
- [x] Qualifications with **private** document upload
- [x] Preview public profile, submit for review, respond to change requests, pause/resume

## Administrator approval
- [x] Pending application queue and full application detail
- [x] Secure access to qualification documents (owner/admin only, admin access audited)
- [x] Approve / request changes / reject / suspend, with internal notes
- [x] Qualification verification
- [x] Audit-log entries, in-app notifications, and emails on decisions
- [x] Only approved profiles are public/searchable

## Tutor search
- [x] Real database queries (never a hard-coded array)
- [x] Filter by subject, keyword, level, country, city, online/in-person, price, availability
- [x] Sort by relevance, rating, price, newest
- [x] Public profile with accurate rates, reviews and trust indicators
- [x] Save a tutor (after authentication)

## Direct enquiry & messaging
- [x] Contact an approved tutor, creating a conversation and first message
- [x] Conversation list, threads, timestamps, unread indicators, mark-as-read
- [x] Archive a conversation, block a user, report a message
- [x] Polling keeps threads live without any proprietary realtime service
- [x] In-app notification (+ dev email) to the recipient

## Student requests & tutor responses
- [x] Create/preview/publish/pause/edit/close requests (stored in PostgreSQL)
- [x] Tutor request feed filtered to relevant subjects
- [x] One active response per tutor per request; edit/withdraw
- [x] **Tutors never see competing tutors' proposed rates**
- [x] Student compares responses, accepts or declines; accepting opens a conversation + engagement
- [x] The UI never treats the cheapest tutor as automatically the best

## Engagements & reviews
- [x] Record an arrangement; mark completed/cancelled
- [x] Payment is explicitly arranged off-platform (no payment simulation, no financial-protection claims)
- [x] Reviews require a real completed engagement (no unrelated reviews)
- [x] One review per engagement (no duplicates); aggregate rating recomputed correctly
- [x] Tutor can post one public response; admins can moderate reviews

## Reporting & moderation
- [x] Report tutor profiles, requests, messages, reviews, users
- [x] Admin: view/investigate/dismiss/resolve, hide content, suspend users, record notes, produce audit logs

## Administration dashboard
- [x] Users, tutor applications, approved tutors, requests, reviews, reports
- [x] Categories, subjects, teaching levels management
- [x] Qualification checks, account suspensions, audit log, platform statistics

## Subject catalogue growth (user-submitted, duplicate-safe)
- [x] Any student or tutor can suggest a subject that isn't in the catalogue from the tutor-onboarding
      and request-creation subject pickers.
- [x] A normalized-name uniqueness constraint (case/accent/punctuation-insensitive) means an exact
      near-duplicate resolves instantly to the existing subject — no admin step, no new row.
- [x] Fuzzy "did you mean" search (Postgres `pg_trgm`) surfaces close matches while typing, so most
      near-duplicates are avoided before a suggestion is ever submitted.
- [x] Genuinely new suggestions queue for admin review (`/admin/subject-suggestions`): approve as a
      new subject, merge into an existing one, or reject with a note. The submitter is notified either way.

## Product quality
- [x] Responsive mobile + desktop, consistent visual system
- [x] Loading, empty and error states; form validation; success messages
- [x] Working navigation, role permissions and admin controls
- [x] No dead buttons or blank placeholder pages
