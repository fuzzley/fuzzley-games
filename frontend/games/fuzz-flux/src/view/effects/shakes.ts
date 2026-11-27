// How far the board shakes as something is made or goes off, the design's
// "Shake is small and rare" by name: a plain bunch, a wisp's flight and a
// wisp's pair shake it none.

import type { BlastId, MadeId } from "../../rules/catalog/specials";
import type { FeelTuning } from "../timeline/feel";

/** The feel's shakes, each a size in px, but the size a shake stops at. */
type ShakePx = Exclude<
  {
    readonly [Field in keyof FeelTuning]: Field extends `shake${string}Px`
      ? Field
      : never;
  }[keyof FeelTuning],
  "shakeStopPx"
>;

/** The shake of each blast, by the feel's name for it, or null for a blast that shakes the board none. */
const BLAST_SHAKES = {
  "dasher-across": "shakeDasherPx",
  "dasher-down": "shakeDasherPx",
  puffer: "shakePufferPx",
  wisp: null,
  frizzball: "shakeFrizzballPx",
  "two-dashers": "shakeTwoDashersPx",
  "dasher-and-puffer": "shakeDasherAndPufferPx",
  "two-puffers": "shakeTwoPuffersPx",
  "two-wisps": null,
  "wisp-and-dasher-across": null,
  "wisp-and-dasher-down": null,
  "wisp-and-puffer": null,
  "frizzball-and-dasher": "shakeFrizzballAndSpecialPx",
  "frizzball-and-puffer": "shakeFrizzballAndSpecialPx",
  "frizzball-and-wisp": "shakeFrizzballAndSpecialPx",
  "two-frizzballs": "shakeTwoFrizzballsPx",
} as const satisfies Readonly<Record<BlastId, ShakePx | null>>;

/** Returns how far the board shakes as a bunch makes a special or the frizzball, its whole width in px. */
export function madeShakePx(made: MadeId, feel: FeelTuning): number {
  return made === "frizzball" ? feel.shakeFrizzballMadePx : feel.shakeMadePx;
}

/** Returns how far the board shakes as a blast goes off, its whole width in px, 0 for none. */
export function blastShakePx(blast: BlastId, feel: FeelTuning): number {
  const field = BLAST_SHAKES[blast];
  return field === null ? 0 : feel[field];
}
