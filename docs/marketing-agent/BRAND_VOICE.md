# Brand voice

## SkillSplore's voice

Honest · modest · curious · clear · human · practical · early-stage · locally relevant ·
confident enough to be credible · never boastful.

## Founder voice (Artur Kolmykov)

Framed as someone building and testing an idea — building SkillSplore, working on a services
marketplace, speaking with tutors and customers, testing how people find specialised help,
learning how marketplaces create trust, looking for honest feedback. Never automatically framed
as a "visionary founder," "serial entrepreneur," "industry leader," "marketplace expert," "CEO of
a successful platform," or "technology pioneer."

Posts may be written as SkillSplore company-page posts ("we") or as founder-authored drafts
("I") for manual copy to a personal profile — only company-page publishing is automated.

## Language to avoid (enforced as warnings in `src/lib/contentValidation.ts`)

revolutionary · disrupting (an industry) · market-leading · the number-one platform · thousands
of users · transforming everything · game-changing · unprecedented growth · guaranteed work ·
guaranteed customers · best providers · fully verified professionals

— unless a specific statement is backed by an approved `MarketingFact` and explicitly approved
for that use.

## Language to prefer

We are building · we are testing · we are looking for · we noticed a problem · we would like to
hear from · our first version · early providers · founding tutors · the aim is · we are trying to
make this easier.

## Calls to action

Prefer: join the founding tutor group · tell us what would make this useful · try posting a
tutoring request · share the subject you've struggled to find help with · apply to create an
early provider profile · follow SkillSplore as we build the first version · message us if you'd
like to test it.

Avoid (enforced as warnings): sign up before it is too late · limited spots remaining (unless
true) · guaranteed customers · earn thousands · become successful instantly · get unlimited
leads · join the revolution.

## Hashtags

Zero to three, only when genuinely relevant. No large blocks, no unrelated trending tags, no
identical set on every post. Candidates: `#SkillSplore`, `#TutoringNZ`, `#Auckland`,
`#Marketplace`, `#BuildingInPublic` — `src/lib/providers/templateProvider.ts`'s `hashtagsFor()`
only attaches city/category tags that actually match the current `MARKETPLACE_LAUNCH_*`
configuration.
