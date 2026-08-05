/**
 * External links for the site, read from build-time configuration.
 *
 * Nothing here is hardcoded to a guessed URL. A social icon pointing at a 404
 * -- or worse, at someone else's page -- is worse than no icon at all, so an
 * unset value renders nothing rather than a dead link.
 *
 * To enable the LinkedIn link, set VITE_LINKEDIN_URL in the web build
 * environment, for example:
 *
 *   VITE_LINKEDIN_URL=https://www.linkedin.com/company/skillsplore
 *
 * On Render this goes on the web service as an environment variable. Vite
 * inlines VITE_* variables at build time, so a change requires a rebuild.
 */

function externalUrl(raw: string | undefined): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;
  // Only http(s). Guards against a misconfigured value becoming a
  // `javascript:` URL in an anchor href.
  if (!/^https?:\/\//i.test(value)) {
    console.warn(`Ignoring non-http(s) external URL from configuration: ${value}`);
    return null;
  }
  return value;
}

export const LINKEDIN_URL = externalUrl(import.meta.env.VITE_LINKEDIN_URL as string | undefined);

/** True when at least one social link is configured. */
export const HAS_SOCIAL_LINKS = Boolean(LINKEDIN_URL);
