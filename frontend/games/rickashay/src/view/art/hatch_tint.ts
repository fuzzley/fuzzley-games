// The look the view writes into a hatch in the wall it draws, as its tint,
// which the hatch's art (`kinds/hatch.ts`) draws it by: kept apart from
// the art, so that the view's playback, in the game's main chunk, takes
// none of the art the scene's chunk holds.

import type { HATCH_HOLDS } from "./frames";

/** Takes the last of an ordered list's entries. */
type Last<List extends readonly unknown[]> = List extends readonly [
  ...unknown[],
  infer Entry,
]
  ? Entry
  : never;

/**
 * The most dots a bar shows, one for each of the design's holds: the last
 * of `frames.ts`' `HATCH_HOLDS`, in order, as its type holds it, written
 * out, since importing the list itself would bring all of `frames.ts` into
 * the main chunk.
 */
const MOST_DOTS: Last<typeof HATCH_HOLDS> = 3;

/**
 * Returns the tint the view gives every hatch in the wall it draws once
 * the hatches have some holds left between them: the dots a bar has lost,
 * 0 while it shows all three, a bar showing no more than three however
 * many are left, up to three once none is left and the hatches open.
 *
 * Before a flight's first hold, the bars show all three whatever the holds
 * are tuned to, which only the debug menu changes.
 */
export function hatchTint(left: number): number {
  return MOST_DOTS - Math.min(MOST_DOTS, left);
}
