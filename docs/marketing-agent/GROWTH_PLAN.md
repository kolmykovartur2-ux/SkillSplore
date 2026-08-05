# Getting real usage — a plan

Written 2026-08-04, pre-launch. This is a strategy document, not a description of what exists.
It assumes zero users, zero requests, zero reviews, and no budget worth mentioning.

## The only problem that matters right now

A noticeboard with no requests is worthless to providers. A noticeboard with no providers is
worthless to seekers. Both sides arrive, see nothing, and leave — and they do not come back a
second time. Every marketplace either solves this in its first few months or quietly dies of it.

Nothing else on this page matters more than escaping that. Not the logo, not the copy, not the
posting cadence, not the feature list. If a plan does not directly produce **a real request that
gets a real answer**, it is decoration.

Two consequences follow, and both are uncomfortable:

1. **Marketing cannot fix this yet.** Driving traffic to an empty board burns the audience you
   spent effort earning. Supply and the first requests have to be arranged by hand, first.
2. **The tooling in this repo is an amplifier, not a substitute.** The LinkedIn agent is worth
   having and will matter a lot at step 3 — but automating content while the board is empty is
   the most common way founders feel productive and stay stuck. The unscalable work comes first.

## Step 0 — Narrow the beachhead until it feels too small

One city is already chosen (Auckland). One *narrow* category is not.

"Tutoring" is too broad to win from zero. It has established competitors, the buyer is often a
parent rather than the learner, and there is no reason for anyone to pick an empty new board over
an incumbent. Being the eleventh option in a crowded category is worse than being the only option
in a small one.

Pick a niche where three things are true at once:

- **Demand is real but badly served** — people currently learn it from YouTube, forums, or a
  mate, and know that's slow.
- **Supply exists but is invisible** — people who can teach it are not listed anywhere, because
  no platform treats it as a teachable skill.
- **The founder is credible, or can become so quickly.**

On that third point there is an obvious asset already in hand: **cars**. Buying, repairing and
reselling them is a real, specific, verifiable skill the founder is publicly associated with. It
is exactly the kind of practical skill that no tutoring platform serves and that people genuinely
pay to learn — how to judge a car at auction, what to check before buying, what a given repair
should actually cost.

That is a strategic recommendation and it diverges from the currently configured
`MARKETPLACE_LAUNCH_CATEGORY=Tutoring`, so it is the founder's call. But the reasoning is: a
practical-skills wedge is defensible, differentiated, personally credible, and it demonstrates the
"any skill, not just school subjects" positioning far better than competing head-on for algebra
students. Academic tutoring can be added later from a position of having actual traction.

Whatever is chosen: **one category, one city, for at least three months.** Resist widening. A
board that is thin across twenty categories looks dead; the same activity concentrated in one
looks alive.

## Step 1 — Manufacture the first ten real exchanges by hand (weeks 1–4)

The goal of this phase is not growth. It is **ten real requests that received real, useful
answers**, and everything learned from watching them happen.

- Recruit **15–25 providers by direct personal outreach** in the chosen niche. Not ads. Individual
  messages to specific people, explaining honestly that it is new and empty and you are asking them
  to be early. People say yes to being first far more often than founders expect — but only to a
  person, never to a landing page.
- Find **ten real seekers** the same way, and help them post their request. Sit with them while
  they do it if necessary. Watch where they hesitate.
- **Guarantee a response.** At this size the founder can personally make sure every request gets a
  genuine answer within a day, chasing providers individually if needed. That guarantee is the
  entire product promise, and it is deliverable by hand long before it is deliverable by software.

Two rules that are not negotiable:

- **Never fabricate a request, a provider, a review or a response.** Beyond the brand rules already
  written down, seeded fake activity destroys the one asset a new board has — being believable —
  and it is always eventually obvious.
- **Do not measure signups.** Measure exchanges.

## Step 2 — Make "you will get an answer" the reason to use it

The competition is not other tutoring platforms. It is a Facebook group, a WhatsApp thread, and
asking around. Those are free and already populated, and they beat an empty board on every axis
except one: **they are unreliable and unmoderated.** You post and mostly nothing happens, or a
stranger you cannot assess replies.

So the wedge is reliability and moderation, and the message is roughly: *post what you want to
learn, and a real person who actually knows it will answer.* That is worth switching for. "A new
platform for learning" is not.

This is why the response-rate metric below is the north star, and why widening the category early
is fatal — a promise of guaranteed answers can only be kept in a niche you can personally cover.

## Step 3 — Founder-led content, then the agent

Only now does the content engine earn its keep, because now there is something true to point at.

- **Post from the personal profile first, not the company page.** A company page with no followers
  reaches nobody. A personal profile with an existing network reaches people who already know the
  founder. Publish to the personal profile; reshare from the company page. The marketing agent
  handles the company page and keeps the archive — the reach comes from the personal one.
- **Use the founder-story angle** (`docs/marketing-agent/CREATIVE_ANGLES.md`). The car-flipping
  idea — genuinely good at something, still has real gaps, wants someone further along — is the
  strongest post available, because it demonstrates the product from the inside and is honest.
  Enter the true details as Facts first so the agent has something real to build from.
- **Write about the build, not the brand.** Pre-launch, "here is what broke this week" outperforms
  "introducing SkillSplore" every time, and it is the only kind of post that is fully truthful when
  there are no users to cite.
- **Three posts a week, sustained,** beats a burst and a silence. That cadence is already the
  configured default.

Content will not create the marketplace. It will make the people you personally recruit take you
seriously, and it compounds slowly over months.

## Step 4 — Channels worth the effort, and the trap in each

Ordered by likely return for a local, zero-budget, pre-launch board:

| Channel | Why it works | The trap |
| --- | --- | --- |
| Direct personal outreach | The only channel that reliably works at zero scale | Doesn't scale — that's fine, it isn't meant to yet |
| Founder's LinkedIn | Existing network, credibility already banked | Posting as a brand instead of a person |
| Local interest groups (car clubs, men's sheds, maker spaces, community hubs) | Exactly where invisible supply already gathers | Showing up to advertise. Contribute first, for weeks |
| Local Facebook groups | Where the requests currently go | Spam. Answer questions genuinely; mention the board rarely |
| Reddit (r/auckland, r/newzealand) | Real local demand, high reach | Strongly anti-promotion. Only participate as a person with something useful to say |
| University / polytech noticeboards | Concentrated demand for tutoring specifically | Only relevant if the tutoring category is chosen |
| Word of mouth, deliberately asked for | Highest-quality traffic there is | Not asking. After every good exchange, ask for one introduction |

Deliberately **not** on the list yet: paid ads, SEO, influencers, PR. All of them push volume at a
funnel that does not convert yet. Paid acquisition before organic pull is how a small budget
disappears with nothing learned. Revisit once the metrics below are healthy.

One caution specific to this product: if minors are involved on the learner side, safety is both a
genuine obligation and a real marketing asset — but it must be substantiated by actual moderation
practice before it is claimed in copy, and never overstated.

## Step 5 — Measure the three things that matter

Vanity metrics (signups, page views, followers) will look encouraging and mean nothing.

Track instead:

1. **Response rate** — the share of requests receiving at least one genuine response within 24
   hours. Below ~80% the promise is broken and growth makes it worse.
2. **Conversation rate** — the share of requests that become an actual back-and-forth.
3. **Arrangement rate** — the share that become a recorded engagement. This is the true north:
   it is the only number that means real value changed hands.

The marketplace already records engagements, so this is measurable rather than guessed at.

If arrangement rate is healthy and volume is low, the problem is marketing — push harder on
Step 4. If volume is fine and arrangement rate is poor, **stop marketing entirely** and fix the
experience, because every new visitor is being wasted.

## Step 6 — Expand only on evidence

Widen when, and only when, the response guarantee holds without the founder personally intervening
in every case. Then add one adjacent category, or one more city — not both, and not several.

Each expansion resets the cold-start problem in miniature. Expanding before the first niche is
self-sustaining just produces two thin categories instead of one healthy one.

## Honest assessment

This is hard, and most attempts fail at Step 1 rather than for want of a clever channel. The
plan's whole bet is that three months of unglamorous, manual, personal recruiting produces
something real, and that content and tooling then amplify it.

The parts of this plan I am least certain about, and which depend on facts not in this repository:

- How much time per week is genuinely available. Step 1 is the expensive one, and it cannot be
  compressed by tooling.
- The size and relevance of the founder's existing network, which largely determines whether Step 1
  takes four weeks or twelve.
- Whether the practical-skills wedge or academic tutoring is the better beachhead. The argument
  above favours practical skills, but this is a judgement call with real uncertainty, and the
  founder knows the local market better than a document does.
