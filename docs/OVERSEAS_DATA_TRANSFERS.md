# Overseas storage and disclosure

**Status: draft. The deployed region has not been confirmed.**

## Current position

SkillSplore runs on Render, with a Render-managed PostgreSQL database.

> **The deployed region is not recorded anywhere in this repository.**
> `render.yaml` does not pin a region, so the service runs in whichever region
> was selected in the dashboard when it was created.

This is an open item, not a settled fact. Until it is confirmed:

- the Privacy Policy points at `/subprocessors` rather than naming a country;
- `SUBPROCESSORS.md` records the country as **to confirm**;
- no country is stated to users that has not been verified.

Naming a plausible-sounding country would be worse than admitting we have not
checked.

## What needs to happen

1. Confirm the actual region of the Render web service and database.
2. Record it in `SUBPROCESSORS.md` and the `Subprocessor` table.
3. Pin the region in `render.yaml` so it cannot drift on a rebuild.
4. Confirm where Render holds backups — it may differ from the primary region.
5. Have the lawyer confirm the transfer position, given both NZ and AU users.

## Considerations for that review

- **New Zealand:** disclosing personal information to a foreign person or
  entity generally requires reasonable belief that comparable safeguards apply,
  or the individual's authorisation given after being told the safeguards may
  not apply. Which basis applies here needs confirming.
- **Australia:** APP 8 requires reasonable steps to ensure an overseas recipient
  does not breach the APPs, and the discloser may remain accountable for what
  the recipient does.
- Whether using a cloud provider is "disclosure" or only "use" can turn on the
  contract and on who can access the data. This needs a real answer rather than
  an assumption.

## Future providers

Email delivery and object storage are both still unselected. Each new provider
requires: identifying the data location, reviewing the contract terms,
recording it in `SUBPROCESSORS.md`, and updating the Privacy Policy if the
disclosure position changes.

Do this **before** the integration ships, not after.
