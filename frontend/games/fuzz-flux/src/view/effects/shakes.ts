// How far the board shakes as a bunch makes something, the design's
// "Shake is small and rare" by name: a plain bunch shakes it none.

import type { MadeId } from "../../rules/catalog/specials";
import type { FeelTuning } from "../timeline/feel";

/** Returns how far the board shakes as a bunch makes a special or the frizzball, its whole width in px. */
export function madeShakePx(made: MadeId, feel: FeelTuning): number {
  return made === "frizzball" ? feel.shakeFrizzballMadePx : feel.shakeMadePx;
}
