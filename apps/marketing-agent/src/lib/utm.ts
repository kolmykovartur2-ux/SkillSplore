// First-party UTM parameters only. Never puts personally-identifying
// information in a query string (§24) — utm_content is the internal content
// item id, never a name/email/anything user-supplied verbatim.
export function buildUtmUrl(
  destinationUrl: string,
  params: { campaign: string; content: string | number; medium?: string; source?: string },
): string {
  const url = new URL(destinationUrl);
  url.searchParams.set('utm_source', params.source ?? 'linkedin');
  url.searchParams.set('utm_medium', params.medium ?? 'organic_social');
  url.searchParams.set('utm_campaign', params.campaign);
  url.searchParams.set('utm_content', String(params.content));
  return url.toString();
}
