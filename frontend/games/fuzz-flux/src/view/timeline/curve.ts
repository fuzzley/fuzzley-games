// A flight along the sketch's curve from one place to another: eased in
// and out the whole way, bowing to one side by its bend and rising a
// little in the middle, as a wisp's copy flies to where it lands.

import type { FeelTuning } from "./feel";
import type { Key, Keys, Place } from "./timeline";

/**
 * Returns the keys of a sprite flying a curve from where it stands to a
 * place, its bow and rise in its lean, at their widest halfway.
 *
 * @param bend How far it bows, in squares, to the right of its way on the
 *   screen for more than 0, and to the left for less.
 */
export function curveKeys(
  from: Place,
  to: Place,
  bend: number,
  atMs: number,
  ms: number,
  feel: FeelTuning,
): Keys {
  const across = to.x - from.x;
  const down = to.y - from.y;
  const far = Math.hypot(across, down) || 1;
  const bow = bend * feel.curveArc;
  return {
    x: [{ atMs, ms, to: to.x, easing: "in-out" }],
    y: [{ atMs, ms, to: to.y, easing: "in-out" }],
    leanX: outAndBack((-down / far) * bow, atMs, ms),
    leanY: outAndBack((across / far) * bow - feel.curveRiseSquares, atMs, ms),
  };
}

/** Returns the keys of a number moving out to a value halfway through a while and back to 0 by its end. */
function outAndBack(most: number, atMs: number, ms: number): readonly Key[] {
  return [
    { atMs, ms: ms / 2, to: most, easing: "in-out" },
    { atMs: atMs + ms / 2, ms: ms / 2, to: 0, easing: "in-out" },
  ];
}
