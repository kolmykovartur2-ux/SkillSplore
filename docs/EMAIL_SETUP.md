# Email setup

**Status: NOT configured. The deployed site cannot send email.**

## Why this matters more than it looks

`SMTP_HOST` is unset on Render, so it falls back to `localhost:1025` — a local
mail-capture tool that exists on a developer's machine and nowhere else. Every
send fails.

The consequences are not limited to "emails don't arrive":

| Flow | What happens now |
|---|---|
| Register | Account is created and the user is signed in, but the confirmation email never arrives, so `emailVerifiedAt` stays null |
| Send a message | **Blocked.** `requireVerified` gates conversations — so an unverified user cannot message anyone, which is the point of the platform |
| Forgot password | Silently does nothing. **Permanent lockout** — there is no other route back into an account |
| Notifications | Never delivered |

So the marketplace does not currently function for anyone who signs up.

## What was changed in the meantime

Configuring a provider needs credentials only the founder has. What the code
does now is refuse to lie about it:

- `sendMail` returns `{ delivered }` instead of swallowing failures, and
  short-circuits when the host is the local default rather than waiting out a
  TCP timeout on every request.
- **Registration** tells the user their confirmation email could not be sent
  and points them at `admin@skillsplore.org`, rather than "check your inbox".
- **Forgot password** says reset is unavailable instead of claiming a link was
  sent. This reports `mailConfigured`, a deployment-wide fact identical for
  every address, so it cannot be used to discover whether an account exists —
  the enumeration protection is intact.
- **Production refuses to boot** with a localhost SMTP host or a `.local`
  sender address. Demo and development still start, but log a loud warning.

That last point is why the currently deployed site keeps running: it is
`APP_ENV=demo`, not `production`.

## Configuring a provider

Set these on the Render **web service**:

| Variable | Value |
|---|---|
| `SMTP_HOST` | Your provider's SMTP host |
| `SMTP_PORT` | Usually `587` (STARTTLS) or `465` (implicit TLS) |
| `SMTP_USER` | Provider username or API key id |
| `SMTP_PASS` | Provider password or API key — **a secret, never commit it** |
| `SMTP_SECURE` | `true` for port 465, `false` for 587 |
| `MAIL_FROM` | `SkillSplore <no-reply@skillsplore.org>` |

`MAIL_FROM` must be a domain you control. The current default
(`no-reply@skillsplore.local`) is not a real TLD and will be rejected outright
by any provider.

### Choosing one

No recommendation is made here because it depends on volume and budget, and
the honest answer for a pre-launch site is that almost any transactional
provider will do. What matters:

- it must support plain SMTP (the code uses nodemailer, no vendor SDK);
- you must be able to verify `skillsplore.org` as a sending domain;
- a free tier is fine at this volume.

Whichever is chosen must be added to `docs/SUBPROCESSORS.md` **before** it goes
live — it will process every user's email address and the content of every
notification.

### DNS

Deliverability is mostly DNS, not code. Expect to add:

- **SPF** — authorises the provider to send as your domain
- **DKIM** — signs outgoing mail
- **DMARC** — tells receivers what to do when the first two fail

Without these, mail will land in spam even when the SMTP connection succeeds.
"Sent successfully" and "arrived in the inbox" are different things, and only
the first is visible from the application.

## Verifying it works

After configuring, from a Render shell or locally against the production
database:

1. Register a test account with an address you control.
2. Confirm the API logs `"email sent"` rather than
   `"email NOT sent: no SMTP server configured"`.
3. Confirm the message arrives — check the spam folder too.
4. Follow the link and confirm `emailVerifiedAt` is set.
5. Confirm you can then start a conversation.

Step 5 is the one that proves the fix, because messaging is what verification
gates.

## Related

- `docs/SUBPROCESSORS.md` — the provider must be recorded there
- `docs/PRIVACY_IMPACT_ASSESSMENT.md` — risk 10
- `apps/api/src/lib/mailer.ts`
