# Image generation (post creative)

Generates imagery for LinkedIn posts, aimed at a chosen **audience persona** — a maths tutor, a
chef, an electronics teacher, a plant-based cooking coach — so the creative reflects that
SkillSplore is for any skill, not only academic tutoring.

It is **off by default** and entirely optional. With `IMAGE_AI_PROVIDER=none` (the default) the
Generate button is replaced by a note explaining how to enable it, and every other part of the
agent works exactly as before. No image vendor is ever a runtime requirement.

## Enabling it

Set these for the marketing-agent service (its own `.env`, or Render's env group):

| Variable | Purpose |
| --- | --- |
| `IMAGE_AI_PROVIDER` | `none` (default), `openai_compatible`, or `automatic1111` |
| `IMAGE_AI_BASE_URL` | Endpoint root. Required whenever the provider isn't `none` |
| `IMAGE_AI_API_KEY` | Bearer token, if the endpoint needs one |
| `IMAGE_AI_MODEL` | Model (`openai_compatible`) or checkpoint (`automatic1111`) |
| `IMAGE_AI_SIZE` | Defaults to `1024x1024` |

**Hosted (`openai_compatible`)** — OpenAI itself or any gateway speaking the same
`/images/generations` shape (LocalAI, LiteLLM, …):

```
IMAGE_AI_PROVIDER=openai_compatible
IMAGE_AI_BASE_URL=https://api.openai.com/v1
IMAGE_AI_API_KEY=<your key>
IMAGE_AI_MODEL=gpt-image-1
```

**Self-hosted (`automatic1111`)** — Stable Diffusion WebUI started with `--api`. Nothing leaves
your machine and no API key is involved:

```
IMAGE_AI_PROVIDER=automatic1111
IMAGE_AI_BASE_URL=http://localhost:7860
```

In production the service refuses to boot if a provider is selected without a base URL, rather
than failing later at the moment someone clicks Generate.

## How a prompt is built

`src/lib/imagePrompt.ts` composes the prompt deterministically, server-side, from the persona, an
optional theme, the pillar, and the launch city/country. The client only picks a persona and an
optional theme — it cannot edit the prompt, so the constraints below can't be bypassed from the
browser. Being a pure function, the exact wording is unit-tested.

## Safety constraints (applied to every prompt)

These are brand rules, not stylistic preferences. An image can imply a claim just as loudly as a
sentence, so the same rules that govern copy apply to creative:

- **No recognisable real people.** A synthetic face presented as a tutor or customer would be a
  fabricated testimonial — the thing `docs/PRODUCT_POSITIONING.md` most firmly rules out.
- **No children or minors.** The marketplace serves them; generated marketing imagery avoids
  depicting them entirely rather than attempting it tastefully.
- **No text, numbers, ratings, review counts or fake dashboards** rendered into the image. Those
  would be invented evidence, and SkillSplore is pre-launch with no such numbers to show.
- **No brand logos or copyrighted characters.**
- **No medical, health-outcome, income or guaranteed-result claims.**

A supplied theme is treated as *mood only*, and the prompt explicitly forbids rendering it as text
in the image — otherwise "trusted by 10,000 students" could be typed into a theme box and end up
printed on the creative.

## Provenance and disclosure

Every generated asset is stored as a normal `MediaAsset` and additionally records
`isAiGenerated`, `generationProvider`, `generationModel`, `generationPrompt` and `personaKey`.
Its `usageRights` are written automatically and state that the image is synthetic and depicts no
real person. The media library shows an **AI-generated** badge, so a synthetic image can never be
quietly mistaken for a real photo. Generation is written to the audit log as `media.generate`.

No `ContentConsent` is attached, by design: these images depict nobody real, so there is no person
whose consent could be sought or withdrawn.

## Known limitations

- Image models ignore instructions from time to time. **Review each image before approving a post**
  — especially for stray text, which is the constraint models most often break.
- There is no automated check that the returned image actually obeys the constraints; the review
  step is the control.
- Unlike text generation there is deliberately **no offline fallback**. A placeholder image could be
  published without anyone noticing, so a missing provider fails loudly instead.
- On Render's free tier local disk does not survive a redeploy, so generated files are lost on
  restart (the database rows remain). Use S3-compatible storage to keep them.
