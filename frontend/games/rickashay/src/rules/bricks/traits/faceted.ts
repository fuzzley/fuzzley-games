import type { TraitRule } from "../../flight/hooks";

/**
 * A gem's facets, which act at no moment of a flight, since the gem's
 * faces, as `../../flight/faces.ts` builds them, do all they do.
 *
 * Every turn off a gem strikes it, whichever of its faces met the
 * fuzzball.
 */
export const FACETED_RULE: TraitRule = {};
