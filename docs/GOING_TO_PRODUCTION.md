# Going to production

**The current deployment is `APP_ENV=demo`:** seeded fictional accounts, demo
login shortcuts, and a demo banner. This is the sequence for turning it into a
real production site.

> **Do the steps in this order.** Flipping `APP_ENV` to `production` before
> step 1 will take the site offline — production refuses to boot without a
> working mail configuration. That guard is deliberate (a site that cannot send
> email cannot verify anyone, and verification gates messaging), but it means
> email is a hard prerequisite rather than a nice-to-have.

---

## 1. Configure email — blocking

Nothing else works without it. See `EMAIL_SETUP.md`.

- [ ] Choose a transactional email provider
- [ ] Verify `skillsplore.org` as a sending domain
- [ ] Add SPF, DKIM and DMARC DNS records
- [ ] Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`
- [ ] Set `MAIL_FROM` to `SkillSplore <no-reply@skillsplore.org>`
      — the current `.local` default is not a real domain and will be rejected
- [ ] Add the provider to `SUBPROCESSORS.md`
- [ ] Send a real test message and confirm it arrives (check spam)

## 2. Secrets

- [ ] `SESSION_SECRET` — a unique random string of 32+ characters. Production
      refuses to boot with a known-insecure or short value.
- [ ] Confirm no secret is committed to the repository

## 3. Fill in the legal placeholders

9 remain. Production will serve policies with a visible "Draft — not yet in
force" banner until they are filled in and published.

- [ ] `LEGAL_ENTITY_NAME`, `TRADING_NAME`, `COMPANY_NUMBER`,
      `BUSINESS_IDENTIFIER`, `REGISTERED_ADDRESS`
- [ ] `GOVERNING_JURISDICTION`
- [ ] `PRIVACY_OFFICER_NAME` — must be a named person
- [ ] `EFFECTIVE_DATE`, `LAST_UPDATED_DATE`
- [ ] Have a lawyer review the filled-in text (`LEGAL_REVIEW_REQUIRED.md`)
- [ ] Record the review, then publish each version

## 4. Deal with the demo data

The live database currently holds 4 demo accounts and 12 fictional tutor
profiles. **Flipping `APP_ENV` does not remove rows that already exist.**

`npm run demo:reset` refuses to run in production, and in any case it reseeds
rather than clears — so it is not the tool for this.

**Recommended: start from an empty database.**

The reference data repopulates itself on first boot, because it is boot-synced
rather than seeded:

| Data | Repopulates automatically? |
|---|---|
| Categories, subjects, aliases | Yes — `syncTaxonomy` |
| Teaching levels | Yes — `syncTaxonomy` |
| Legal documents, consent wording | Yes — `syncLegal` |
| Demo users, profiles, requests, reviews | **No, and that is the point** |

So: provision a fresh database, point `DATABASE_URL` at it, and the catalogue
and policies rebuild themselves with no fictional accounts.

- [ ] Provision a fresh production database
- [ ] Point `DATABASE_URL` at it
- [ ] Confirm on first boot: 37 categories, 489 subjects, 8 teaching levels,
      8 legal documents, **0 users**

*If you would rather keep the existing database, the demo accounts must be
removed by hand. There is no tool for partial cleanup, and writing one that
deletes user rows is not something to improvise against a live database.*

## 5. Flip the environment

Only after steps 1–4.

- [ ] `APP_ENV=demo` → `APP_ENV=production` in `render.yaml`
- [ ] Remove `ENABLE_DEMO_LOGIN`
- [ ] Remove `SHOW_DEMO_BANNER`

On boot, production will now refuse to start if any of these is wrong:

- demo login enabled
- an insecure or short session secret
- S3 storage selected without credentials
- **SMTP host still the local default**
- **a `.local` sender address**
- any data-monetisation flag switched on
- the insights programme enabled without a recorded legal review

A refusal to boot is the guard working. Read the error — it names the variable.

## 6. Fix file storage — currently broken

`STORAGE_DRIVER=local` writes uploads to the container filesystem, which
Render's free tier **does not persist**. Profile photographs and qualification
documents are lost on every redeploy.

- [ ] Either attach a persistent disk (paid plan), or
- [ ] Set `STORAGE_DRIVER=s3` with S3-compatible credentials
- [ ] Add the storage provider to `SUBPROCESSORS.md`

See `KNOWN_LIMITATIONS.md`.

## 7. Verify the real journeys

Against the production site, with a real email address:

- [ ] Register → confirmation email **arrives**
- [ ] Follow the link → account verified
- [ ] Start a conversation → **works** (this is what verification gates)
- [ ] Post a request
- [ ] Create a tutor profile, submit it, approve it as admin
- [ ] Upload a photograph → redeploy → **confirm it is still there**
- [ ] Forgot password → reset email arrives → reset works
- [ ] Submit feedback → appears in `/admin/feedback`
- [ ] Submit a privacy request → appears in `/admin/privacy-requests`

Step 3 and the upload check are the two that catch the known-broken things.

## 8. Before you tell anyone about it

- [ ] Set `VITE_LINKEDIN_URL` if you want the LinkedIn link (build-time —
      needs a rebuild, not just an env change)
- [ ] Decide the payment position (`PAYMENTS.md`) — currently disabled
- [ ] Approve the retention schedule (`DATA_RETENTION.md`) — currently nothing
      is ever deleted
- [ ] Nominate a backup for the Privacy Officer and moderator roles. One person
      holding all of them is a single point of failure, and it is the one item
      on this list that no amount of code fixes.

---

## Known blockers, honestly

At the time of writing, **the site is not ready for real users**:

| Blocker | Status |
|---|---|
| No email provider | Registration cannot be completed; messaging is gated |
| Uploads not durable | Files lost on every redeploy |
| Nothing is ever deleted | Retention schedule unapproved, no deletion job |
| Legal drafts unreviewed | 9 placeholders, no lawyer sign-off |
| Single point of failure | One person is Privacy Officer, moderator and owner |

The first two are the ones that break the product. The rest are risk.
