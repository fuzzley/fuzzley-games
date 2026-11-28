// Something thrown off a piece, such as a brick's cushion or a cage's bar:
// it leaves straight aside and up, and the feel's gravity pulls it down
// from where that takes it, so it slows and falls, fading toward its end
// as a loose bit does.

import type { FeelTuning } from "./feel";
import type { Key, Keys, Place } from "./timeline";

/** Describes something thrown: from where and when, how fast aside and up, in squares a second, and for how long. */
export interface Throw {
  readonly from: Place;
  readonly aside: number;
  readonly rise: number;
  readonly atMs: number;
  readonly ms: number;
}

/** Returns the keys of something thrown: its flight aside and up, its fall and its fade. */
export function thrownKeys(
  { from, aside, rise, atMs, ms }: Throw,
  feel: FeelTuning,
): Keys {
  const seconds = ms / 1000;
  return {
    x: [{ atMs, ms, to: from.x + aside * seconds, easing: "linear" }],
    y: [{ atMs, ms, to: from.y - rise * seconds, easing: "linear" }],
    // Its fall from rest, by its lean down from where its flight takes it,
    // which "in" eases by its share of the time squared.
    leanY: [
      { atMs, ms, to: (feel.thrownGravity * seconds ** 2) / 2, easing: "in" },
    ],
    fade: [fadeKey(atMs, ms, feel)],
  };
}

/** Returns the key that fades a loose bit over a while, toward its end only, as the feel's `looseBitFade` has it. */
export function fadeKey(atMs: number, ms: number, feel: FeelTuning): Key {
  const fadeMs = ms / feel.looseBitFade;
  return { atMs: atMs + ms - fadeMs, ms: fadeMs, to: 1, easing: "linear" };
}
