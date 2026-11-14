// The balls' fur: `@fz/phaser`'s fuzzball, its fur combed for each kind of
// ball, so a kind shows by its shape as well as its color, and a normal
// ball's lifted by the streak, as the uplift's art kit's `ball()` draws it.

import {
  FUZZBALL_STRANDS,
  type Strand,
  combedStrands,
  furReach,
} from "@fz/phaser/fuzzball";
import type { BallKindId } from "../../rules/catalog/balls";
import { multiplier } from "../../rules/field/scoring";

/** How far a fire ball's fur rises at its crown, on the fuzzball's grid. */
const FLAME_RISE = 7;

/** How much nearer the middle a fire ball's fur draws in as it rises, at its crown. */
const FLAME_PINCH = 0.45;

/** How much longer a blast ball's spikes are than the fur they stand in for. */
const SPIKE_LENGTH = 1.2;

/**
 * Returns a strand risen into a flame: the higher round the body it grows,
 * the further it rises and draws in toward the middle, so the fur
 * underneath stays as it was.
 */
function flame({ from, control, to }: Strand): Strand {
  const up = ((1 - to.y / Math.hypot(to.x, to.y)) / 2) ** 2;
  return {
    from,
    control: {
      x: control.x * (1 - (FLAME_PINCH * up) / 2),
      y: control.y - (FLAME_RISE * up) / 2,
    },
    to: { x: to.x * (1 - FLAME_PINCH * up), y: to.y - FLAME_RISE * up },
  };
}

/** Returns a strand stood on end as a spike: straight out from the body's middle, through where it grew, and longer. */
function spike({ from, to }: Strand): Strand {
  const way = Math.hypot(to.x, to.y);
  const along = { x: to.x / way, y: to.y / way };
  const root = Math.hypot(from.x, from.y);
  const tip = way * SPIKE_LENGTH;
  return {
    from: { x: along.x * root, y: along.y * root },
    control: {
      x: (along.x * (root + tip)) / 2,
      y: (along.y * (root + tip)) / 2,
    },
    to: { x: along.x * tip, y: along.y * tip },
  };
}

/**
 * How each kind of ball wears its fur: a normal ball the fuzzball's own, a
 * fire ball's risen into a flame, and a blast ball's stood on end.
 */
export const FUR: Readonly<Record<BallKindId, readonly Strand[]>> = {
  normal: FUZZBALL_STRANDS,
  fire: FUZZBALL_STRANDS.map(flame),
  blast: FUZZBALL_STRANDS.map(spike),
};

/**
 * How far a normal ball's fur reaches from its body's middle, half a
 * strand's width included, on the fuzzball's grid: the ball's edge.
 */
export const REACH = furReach(FUR.normal);

/** Says how a normal ball's fur stands at a step of the streak: its strands, and whether sparks fly about it. */
export interface StreakFur {
  readonly fur: readonly Strand[];
  readonly sparks: boolean;
}

/**
 * How a normal ball's fur stands at each of the streak's multipliers, from
 * ×1 up: flat, lifted half way, on end, and on end with sparks about it.
 */
export const STREAK_FUR: readonly StreakFur[] = [
  { fur: FUR.normal, sparks: false },
  { fur: combedStrands(0.5), sparks: false },
  { fur: combedStrands(1), sparks: false },
  { fur: combedStrands(1), sparks: true },
];

/**
 * Returns the step of {@link STREAK_FUR} a normal ball wears at a streak:
 * its multiplier's, counted from 0, or the last for one past them all.
 */
export function streakStep(streak: number): number {
  return Math.min(multiplier(streak), STREAK_FUR.length) - 1;
}
