// Less motion, the setting a player turns on in Settings, or the system
// asks for: as the design's "Accessibility" lists it, no shake, no flash
// or glow, a quarter of the fluff, no flights to the goal, no hop of the
// whole board and no gust sway, while swaps, hops and falls stay. A move's
// draft is built in one motion or the other, and each event plays its own
// version of what it moves by it.

import type { FeelTuning } from "./feel";
import type { Effect } from "./timeline";

/** Every motion a player can set moves to play in: in full, or with Less motion. */
export const MOTIONS = ["full", "less"] as const satisfies readonly string[];

/** A motion a player sets, such as "less". */
export type Motion = (typeof MOTIONS)[number];

/** Returns what Less motion keeps of a move's effects: no shake and no flash, and a quarter of each fluff's tufts, none where that rounds to none. */
export function withLessMotion(
  effects: readonly Effect[],
  feel: FeelTuning,
): readonly Effect[] {
  return effects.flatMap((effect): readonly Effect[] => {
    switch (effect.what) {
      case "shake":
      case "flash":
        return [];
      case "fluff": {
        const count = Math.round(effect.count * feel.lessMotionFluff);
        return count > 0 ? [{ ...effect, count }] : [];
      }
      case "ring":
      case "streak":
      case "bolt":
      case "gust-line":
        return [effect];
    }
  });
}
