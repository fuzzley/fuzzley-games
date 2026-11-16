// How a fuzzball caught looks, as the kit's `rescuedFx()` draws a stray
// rescued, in `art/lib/fx.mjs`: a soft ring opening from where its bubble
// was; and, as `plan.md`'s row has it, the line in tow springing as one
// joins it, swinging aside and settling.

import { easeOutCubic, shareDone } from "@fz/core/math";
import { type Torus, copyShift } from "../../rules/torus";
import { MOST_CREW, STRAY_RADIUS } from "../../rules/tuning";
import type { TowLine } from "../field/tow_line";
import { RESCUE_MS } from "./timing";

/**
 * How a fuzzball caught's soft ring is drawn, as the kit's: how far out it
 * starts, at a stray's bubble's rim, and how much further it opens, in
 * field units; its soft outside, how wide as it starts, narrowing to half,
 * at least in pixels, and how opaque; and its line, how wide, in field
 * units, and at least in pixels, and how opaque, each fading as it opens.
 */
export const RESCUE_RING = {
  from: STRAY_RADIUS,
  opens: 1.5,
  softWidth: 0.7,
  softLeast: 2,
  softAlpha: 0.24,
  width: 0.1,
  least: 1,
  alpha: 0.75,
} as const;

/** Describes a fuzzball caught's soft ring at a moment: how far out it is, in field units, how wide its soft outside is, and how much of it still shows. */
export interface RescueRing {
  radius: number;
  softWidth: number;
  shown: number;
}

/**
 * Writes a fuzzball caught's soft ring a time after it was caught, in
 * milliseconds, into a record and returns it, or returns null before or
 * once it is gone: opening fast, then slowing, and fading.
 */
export function rescueRingAt(
  sinceMs: number,
  into: RescueRing,
): RescueRing | null {
  if (!(sinceMs >= 0 && sinceMs < RESCUE_MS)) return null;
  const done = shareDone(0, sinceMs, RESCUE_MS);
  into.radius = RESCUE_RING.from + RESCUE_RING.opens * easeOutCubic(done);
  into.softWidth = RESCUE_RING.softWidth * (1 - done / 2);
  into.shown = 1 - done;
  return into;
}

/**
 * How the line in tow springs as one joins it: how far it bows aside at
 * most, in field units, how many times it swings over its time, and how
 * many steps each stretch of it is drawn in while it bows.
 */
export const SPRING = { reach: 0.3, swings: 3, steps: 4 } as const;

/**
 * Returns how far the line in tow bows aside a time after one joined it,
 * in milliseconds, as a share of {@link SPRING}'s reach, back the other
 * way below 0: from straight, swinging and dying away, straight again by
 * {@link RESCUE_MS}, and straight before.
 */
export function springShare(sinceMs: number): number {
  const done = sinceMs / RESCUE_MS;
  if (!(done >= 0 && done < 1)) return 0;
  return (1 - done) ** 2 * Math.sin(2 * Math.PI * SPRING.swings * done);
}

/** Returns a record for the line in tow drawn springing, with room for each stretch's steps. */
export function createSprungLine(): TowLine {
  return {
    count: 0,
    at: Array.from({ length: 1 + (MOST_CREW - 1) * SPRING.steps }, () => ({
      x: 0,
      y: 0,
    })),
    shift: { x: 0, y: 0 },
  };
}

/**
 * Returns the line in tow as drawn while it springs: written into a record,
 * each stretch from the hook drawn in steps along half a turn of a sine,
 * bowed aside by a share of {@link SPRING}'s reach, each the other way
 * from the one before, so the line swings as one string, its copies past
 * the edges as far as it then reaches on the field; or the line as it is,
 * for no share or no stretch.
 */
export function sprungLine(
  line: TowLine,
  share: number,
  torus: Readonly<Torus>,
  into: TowLine,
): TowLine {
  const [hook] = line.at;
  const [start] = into.at;
  if (share === 0 || line.count < 2 || !hook || !start) return line;
  start.x = hook.x;
  start.y = hook.y;
  let left = hook.x;
  let right = hook.x;
  let top = hook.y;
  let bottom = hook.y;
  let count = 1;
  for (let i = 1; i < line.count; i++) {
    const from = line.at[i - 1];
    const to = line.at[i];
    if (!from || !to) break;
    const alongX = to.x - from.x;
    const alongY = to.y - from.y;
    const length = Math.hypot(alongX, alongY) || 1;
    const bow = (i % 2 === 1 ? 1 : -1) * share * SPRING.reach;
    for (let step = 1; step <= SPRING.steps; step++) {
      const at = into.at[count];
      if (!at) break;
      const along = step / SPRING.steps;
      const aside = bow * Math.sin(Math.PI * along);
      at.x = from.x + alongX * along - (alongY / length) * aside;
      at.y = from.y + alongY * along + (alongX / length) * aside;
      left = Math.min(left, at.x);
      right = Math.max(right, at.x);
      top = Math.min(top, at.y);
      bottom = Math.max(bottom, at.y);
      count += 1;
    }
  }
  into.count = count;
  into.shift.x =
    copyShift((left + right) / 2, (right - left) / 2, torus.width) *
    torus.width;
  into.shift.y =
    copyShift((top + bottom) / 2, (bottom - top) / 2, torus.height) *
    torus.height;
  return into;
}
