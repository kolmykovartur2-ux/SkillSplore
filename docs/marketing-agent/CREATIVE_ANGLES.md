# Creative angles — making posts sharp instead of safe

The brand rules in `src/lib/providers/promptUtils.ts` are mostly prohibitions. They keep the copy
honest, but nothing in them makes it *interesting*, which is how unguided output drifts into
forgettable corporate mush. Creative angles supply the other half: a specific structure to write
into.

## Before anything else: check which provider you are on

`CONTENT_AI_PROVIDER=template` assembles posts from **fixed sentence banks**. It is deterministic
and safe, and it is what demo mode and the seeded launch calendar run on — but it cannot invent an
angle, cannot be witty, and **ignores creative angles entirely**. If drafts read as bland, this is
almost always why.

For genuinely creative copy set `CONTENT_AI_PROVIDER` to `anthropic` or `openai_compatible` (plus
`CONTENT_AI_API_KEY`, and `OPENAI_COMPATIBLE_BASE_URL` for the latter). The Brief page tells you
when the current provider cannot act on an angle, rather than letting you wonder why the setting
did nothing.

## The angles

Chosen on the Brief page before generating. Each is a formula, not a template — the model gets the
structure and the reasoning behind it, never canned sentences.

| Angle | Shape |
| --- | --- |
| **Founder story (real skill, honest gap)** | A skill the founder genuinely has, a gap they will admit to, the marketplace as the bridge |
| **The skill nobody thinks of as teachable** | Takes an everyday practical skill seriously |
| **One small, recognisable problem** | A single concrete frustration, described precisely |
| **Behind the build** | What was tried, what broke, what changed |
| **Myth vs reality** | States an assumption fairly, then corrects it |
| **A question actually being asked** | A genuine open question, left unanswered |

## The founder-story angle, and why it works

This is the strongest angle available pre-launch, because it needs no user numbers, no
testimonials and no results — only something true about you.

Its structure:

1. Open with a concrete thing you actually do.
2. Show real competence with a small specific detail, not a boast.
3. Admit the honest limit — the part you still get wrong or guess at.
4. Make that gap the reason the marketplace should exist: someone out there is further along.
5. Close with a real question or a specific ask.

It works for three reasons. Admitting a limit in a skill you visibly have is credible in a way
claiming expertise is not. It demonstrates the product from the inside — even competent people want
someone further along. And it is personal enough to reshare from your own profile without reading
as an advert.

### Supplying the true details

The agent will not invent a biography. It may only use facts you have entered — the same
`MarketingFact` gate that governs every other claim (`src/lib/facts.ts`). So before using this
angle, add your real background on the **Facts** page, for example:

- key `founder.skill.cars` — "The founder has been buying, repairing and reselling cars for years"
- key `founder.gap.cars` — "Still relies on guesswork when judging whether a specific model is
  worth buying at auction"

Source them to yourself and mark them public. The angle then has something true to build from, and
the honest-gap step has a real gap rather than false modesty.

Without such facts the model has nothing personal to work with and will stay generic — that is the
guard working as intended, not a failure.

## What the angles do not override

Angles change the *shape* of a post, never its truthfulness. Every prohibition still applies: no
invented user counts, revenue, testimonials, quotes, partnerships or launch dates; only supplied
facts; nothing implying an established platform. The founder-story angle carries an extra caution
of its own, because it is the one most likely to tempt a model into inventing a biography.

## Craft rules now in the brand voice

Added alongside the prohibitions, because modesty was being read as licence to be vague:

- The first line must earn the second — no "I'm excited to announce".
- One idea per post.
- Concrete nouns over abstraction: "the gearbox on a 1998 Corolla", not "automotive challenges".
- Vary sentence length. Short sentences carry weight.
- Self-deprecating beats boastful, but the limit must be real and specific.
- End with a genuine question or one specific ask — not "thoughts?".
- No emoji strings, no hashtag walls, no engagement-bait openers.
- Being unable to cite numbers is not a reason to be generic.

## Short-form video scripts (reels)

Generated from the Brief page, using the same angle you picked for written posts. Produces a
**script and shot list, not a video** — the deliberate choice being that the hard part of a reel is
the hook and the beat structure, not the footage, and a founder filming themselves on a phone
outperforms synthetic video for a personal-brand-led launch.

Each selected platform produces its own draft, because the formats genuinely differ:

| | LinkedIn native video | Instagram Reels / TikTok |
| --- | --- | --- |
| Hook window | 3s | **1.5s** |
| Length | 30–90s | 15–45s |
| Aspect | 9:16 (1:1 acceptable) | 9:16 |
| Watched | Muted, in a professional feed, slightly more patience | Fast consumer scroll, sound sometimes on |
| Style | Talking head beats heavy editing | Cut on the beat; captions carry the story alone |

Each script contains a hook, numbered beats (`SHOT` / `SAY` / `ON SCREEN`), a caption, hashtags and
filming notes. Scripts are stored as ordinary `ContentDraft` rows with `contentType`
`NATIVE_VIDEO_BRIEF`, so they inherit versioning, warnings, the approval gate and the audit trail
rather than needing a separate review path.

### Safety in motion

Video makes some rules easier to break than text does — an actor delivering a line reads as a
testimonial far more strongly than the same words typed. So every script request carries hard
constraints: never script anyone presenting themselves as a SkillSplore user, tutor or success
story; no on-screen statistics, ratings or user counts; no screen recordings implying activity that
does not exist; no income, outcome or health claims; every spoken claim must trace to a supplied
Fact; and any generated imagery used in a shot must be labelled illustrative on screen.

### Template mode

With `CONTENT_AI_PROVIDER=template` you get a correctly structured **filming scaffold** with the
hook left blank — useless as finished copy, genuinely useful as a checklist to film against. The
Brief page says so rather than letting you wonder why the hook is a placeholder. Switch to
`anthropic` or `openai_compatible` for a written hook and script.
