// Where Rickashay's own flourishes play and how they move, which the scene
// draws: a ramp's flash along its long face, the streak behind the
// fuzzball dashing home, a spent floor bounce's spring kicking, a portal's
// swirl, the rally's number popping into its next look, and its fire
// flickering. A flourish every wall game plays moves by
// `@fz/brick-wall/view/easing`'s curves.

import {
  CEILINGWARD,
  RIGHT,
  columnOf,
  fieldRowOf,
} from "@fz/brick-wall/rules/grid";
import { easeOutBack } from "@fz/brick-wall/view/easing";
import { easeOutCubic, lerp } from "@fz/core/math";
import type { Wall } from "../../rules/catalog/kinds";
import type { BallView } from "../run_state";
import { FLICKER_MS, STREAK } from "./timing";

/** Describes a strip a flash runs along: its middle on the field and its length, in field units, and its turn on the canvas, in radians. */
export interface Strip {
  x: number;
  y: number;
  length: number;
  angle: number;
}

/** Describes where the streak shows: its middle on the field, in field units, and its turn on the canvas, in radians, the way the fuzzball flies. */
export interface StreakPlace {
  x: number;
  y: number;
  angle: number;
}

/**
 * Writes the strip along the long face of the ramp in a wall cell of a
 * wall into a strip and returns it, or null where the cell holds no ramp:
 * across its cell through the middle, from corner to corner.
 */
export function rampFaceOf(
  wall: Wall,
  cell: number,
  into: Strip,
): Strip | null {
  const brick = wall.bricks[cell];
  if (brick?.kind !== "ramp") return null;
  into.x = columnOf(cell) + 0.5;
  into.y = fieldRowOf(wall, cell) + 0.5;
  into.length = Math.SQRT2;
  // A right angle in the floorward left corner or the ceilingward right one
  // leaves the long face running down the canvas from the cell's left top
  // to its right foot, turned clockwise; the other two, up to its right top.
  const ceilingward = (brick.plates & CEILINGWARD) !== 0;
  const right = (brick.plates & RIGHT) !== 0;
  into.angle = ceilingward === right ? Math.PI / 4 : -Math.PI / 4;
  return into;
}

/**
 * Writes where the streak behind a fuzzball shows into a place and returns
 * it: its middle half {@link STREAK} behind the fuzzball's, back along the
 * way it flies; or null for one that heads nowhere, as one that has
 * landed.
 */
export function streakPlaceOf(
  { x, y, dx, dy }: Pick<BallView, "x" | "y" | "dx" | "dy">,
  into: StreakPlace,
): StreakPlace | null {
  const speed = Math.hypot(dx, dy);
  if (speed === 0) return null;
  into.x = x - (dx / speed) * (STREAK / 2);
  into.y = y - (dy / speed) * (STREAK / 2);
  into.angle = Math.atan2(-dy, dx);
  return into;
}

/** How far a spent floor bounce's spring squashes as it kicks, as a share of its height. */
export const KICK_SQUASH = 0.55;

/**
 * Returns how tall a spent floor bounce's spring stands through its kick,
 * as a share of its height, from 0 as it starts to 1 once it is over:
 * squashed, then springing back past its height and settling.
 */
export function kickHeight(done: number): number {
  return lerp(KICK_SQUASH, 1, easeOutBack(done));
}

/**
 * Returns how large a portal's swirl shows through its time, as a share of
 * its widest: shrinking to nothing as a portal draws the fuzzball in, and
 * spreading from nothing as its twin lets it out.
 */
export function swirlScale(done: number, inward: boolean): number {
  const spread = easeOutCubic(done);
  return inward ? 1 - spread : spread;
}

/** How opaque a floor bounce's puff starts, fading from there to nothing. */
export const PUFF_ALPHA = 0.45;

/**
 * How much larger the rally's number is drawn as it pops into its next
 * look, as a share of its size: as far as its bordered digits reach and
 * still keep clear of the danger line at its thickest.
 */
export const RALLY_POP = 0.12;

/**
 * Returns how large the rally's number is drawn through its pop, as a
 * share of its size, from 0 as it starts to 1 once it is over: larger as
 * it steps into a look, then settling to its size, a little under it
 * first, as a struck brick's swell does.
 */
export function rallyPopScale(done: number): number {
  return lerp(1 + RALLY_POP, 1, easeOutBack(done));
}

/** How far a tongue of the rally's fire sinks as it flickers, as a share of its height at rest. */
export const FLICKER = 0.25;

/**
 * How far apart in each wave neighboring tongues of the fire flicker, in
 * radians: the golden angle, so no two near each other keep step.
 */
const TONGUE_PHASE = 2.399963;

/**
 * Returns how tall a tongue of the rally's fire stands at a moment, in the
 * scene's time, as a share of its height at rest: between 1 − {@link FLICKER}
 * and 1, by two waves of `FLICKER_MS`, each tongue, by its place from the
 * left, on phases of its own, so neighbors rise and fall apart.
 */
export function flickerHeight(tongue: number, now: number): number {
  const phase = tongue * TONGUE_PHASE;
  const wave =
    (Math.sin((2 * Math.PI * now) / FLICKER_MS.slow + phase) +
      Math.sin((2 * Math.PI * now) / FLICKER_MS.fast + 2 * phase)) /
    2;
  return 1 - (FLICKER * (1 - wave)) / 2;
}
