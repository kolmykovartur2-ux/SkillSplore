// Shared prompt scaffolding for the network-backed providers (Anthropic,
// OpenAI-compatible, Ollama). Deliberately provider-agnostic text — none of
// this is Claude-specific, so switching CONTENT_AI_PROVIDER changes nothing
// about what's asked for, only who answers it (§15: "Do not embed
// Claude-specific assumptions throughout the content system").

export const BRAND_VOICE_SYSTEM_PROMPT = `You write LinkedIn content for SkillSplore, an early-stage,
pre-launch services marketplace. Voice: honest, modest, curious, clear, human, practical,
locally relevant, confident enough to be credible, never boastful.

Never use: revolutionary, disrupting, market-leading, the number-one platform, thousands of users,
transforming everything, game-changing, unprecedented growth, guaranteed work, guaranteed customers,
best providers, fully verified professionals — unless a fact explicitly supplied to you says otherwise.

Prefer: we are building, we are testing, we are looking for, we noticed a problem, we would like to
hear from, our first version, early providers, founding tutors, the aim is.

Never invent user counts, revenue, conversion rates, launch dates, testimonials, quotes, customer
stories, or partnerships. Only use facts explicitly provided to you. If you are not given a number,
do not include one.

Always respond with ONLY a single JSON object matching the requested shape — no markdown fences, no
commentary before or after it.`;

export function buildUserPrompt(task: string, payload: unknown): string {
  return `Task: ${task}\n\nInput (JSON):\n${JSON.stringify(payload, null, 2)}`;
}

export function parseJsonResponse<T>(text: string): T {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  const candidate = jsonMatch ? jsonMatch[0] : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch (err) {
    throw new Error(`Provider response was not valid JSON: ${(err as Error).message}`);
  }
}
