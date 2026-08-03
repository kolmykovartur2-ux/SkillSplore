import { env } from '../config/env.js';
import type { LaunchContext } from './contentGenerationProvider.js';

// §1 — the single source of truth for what SkillSplore may currently claim
// to offer. Content generation must never advertise a category, location or
// stage beyond this.
export function getLaunchContext(): LaunchContext {
  return {
    country: env.MARKETPLACE_LAUNCH_COUNTRY,
    city: env.MARKETPLACE_LAUNCH_CITY,
    category: env.MARKETPLACE_LAUNCH_CATEGORY,
    stage: env.MARKETPLACE_LAUNCH_STAGE,
  };
}
