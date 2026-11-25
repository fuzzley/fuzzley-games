import type { TraitRule } from "../../flight/hooks";

/**
 * A ramp's slant, which acts at no moment of a flight, since the ramp's
 * faces, as `../../flight/faces.ts` builds them, do all it does.
 *
 * A turn off any of them strikes nothing, since a ramp never breaks (its
 * kind's `hits` are "never", as `takesStrikes()` reads them).
 */
export const SLANTS_RULE: TraitRule = {};
