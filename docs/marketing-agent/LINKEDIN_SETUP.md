# LinkedIn setup

Founder-side steps. None of this is code — it's account/business setup that only the founder
(as a real person with legal authority over SkillSplore) can do. Do this before wiring real
credentials into `LINKEDIN_PUBLISHING_ENABLED`.

## 1. Create or verify the SkillSplore LinkedIn Page

Confirm your personal LinkedIn account has the **Super Admin** role on the SkillSplore Page — not
just Content Admin. A Content Admin can publish manually, but only a Super Admin can approve a
developer application's association with the Page.

## 2. Complete the Page

Accurate website address, logo, cover image, business description, location, industry, and
contact details. The Page, website, and legal business details should all use the same
SkillSplore name — LinkedIn's review checks for consistency across the organization, website,
domain, and Page.

## 3. Use a business-controlled email address

`admin@skillsplore.com` or similar, on your own domain — not a personal address. LinkedIn's
Community Management API application vetting currently requires this.

## 4. Publish a real privacy policy

A public page (e.g. `skillsplore.com/privacy`) covering: what data SkillSplore collects and why,
how users can contact you, how users can request deletion, what third-party services are used,
and how LinkedIn data specifically is handled by this marketing agent (see
`LINKEDIN_COMPLIANCE.md` for what that handling actually is, to describe accurately).

## 5. Confirm the legal entity behind SkillSplore

LinkedIn's Community Management API access is currently available to registered legal
organizations for commercial use. Have ready: registered legal name, registration number,
registered address, the SkillSplore domain, and the business email from step 3. **This is
frequently the actual blocker** — until it's resolved, this service runs perfectly well in
draft-only mode (see `README.md`).

## 6. Create the LinkedIn developer application

1. Sign in to the LinkedIn Developer Portal → **My Apps** → **Create App**.
2. Name it something clear, e.g. "SkillSplore Marketing Assistant".
3. Associate it with the SkillSplore Page.
4. Enter the SkillSplore privacy-policy URL.
5. Upload the SkillSplore logo.
6. Create the application, then open its settings and generate the Page-association
   verification request — approve it as the Page's Super Admin.

## 7. Configure the OAuth redirect URL

Fixed by this codebase, not a guess:

```
{APP_URL}/api/linkedin/oauth/callback
```

e.g. `https://marketing.skillsplore.com/api/linkedin/oauth/callback` — set `APP_URL` in this
service's `.env` to match wherever you deploy it, and register the exact same URL in the LinkedIn
developer app. See `src/modules/linkedinConnection/linkedinConnection.routes.ts` for the route
that receives it.

## 8. Apply for the correct API access

Under the developer app's **Products** section, apply for **Community Management API,
Development Tier**. Suggested use-case description (truthful, and matches what this codebase
actually does):

> SkillSplore Marketing Assistant enables authorised administrators of the SkillSplore LinkedIn
> Page to generate, review, schedule and publish company-page content and view aggregate
> post-performance analytics. All AI-generated content requires human approval before
> publication. The application does not scrape LinkedIn or automate connection requests, direct
> messages, likes, comments or artificial engagement.

Development Tier is reviewed before being granted; Standard Tier comes later, after
demonstrating a working integration (see `LINKEDIN_APP_REVIEW.md`).

## 9. Minimum necessary permissions

`w_organization_social` (publish), `r_organization_social` (read posts/analytics),
`r_organization_admin` (verify admin role) — exactly the scopes requested in
`src/lib/linkedin/oauth.ts`'s `LINKEDIN_SCOPES`. Final approved scopes depend on what LinkedIn
grants.

## 10. Wire in credentials — never through chat, never committed

Add directly to this service's own deployed `.env` (or your orchestrator's secret store):

```
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
LINKEDIN_REDIRECT_URI=https://marketing.skillsplore.com/api/linkedin/oauth/callback
LINKEDIN_ORGANIZATION_URN=...
LINKEDIN_PUBLISHING_ENABLED=true
MOCK_LINKEDIN_API=false
```

Restart, log in to the dashboard, and use the "Connect LinkedIn" button on the LinkedIn page —
this redirects your browser to LinkedIn's own consent screen. This service never sees your
LinkedIn password.

## 11. Disconnecting

The dashboard's LinkedIn page has a one-click Disconnect action
(`POST /api/linkedin/disconnect`) — wipes stored tokens, preserves historical published-post
records. Also revoke the app's access directly from LinkedIn's own Page admin settings if you
want to fully sever it there too.
