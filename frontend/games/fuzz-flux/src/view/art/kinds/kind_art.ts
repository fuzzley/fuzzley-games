// How a kind of fuzzball is drawn, each kind's in a file of its own beside
// this one: where its body sits in its square, and its fur, which tells it
// from the other five by its outline alone. Most wear a coat of short fur,
// each strand a curve from inside the body out to its tip, drawn round at
// its ends.

import { createRandom } from "@fz/core/random";
import {
  type DrawCommand,
  type Point,
  quadraticPoints,
  stroke,
} from "@fz/phaser/shapes";
import { BODY, polar } from "../design_square";

/** Says how a kind of fuzzball is drawn, on the design's square, about its body's middle. */
export interface KindArt {
  /** Where its body's middle sits from its square's middle, so the whole of it, fur and all, looks centered there. */
  readonly seat: Point;
  /**
   * Returns its fur in an ink, which lies behind its body, standing `lift`
   * of the way from at rest, 0, to on end, 1.
   */
  readonly fur: (ink: number, lift: number) => readonly DrawCommand[];
}

/** How wide a strand of a coat is, in the design's units. */
export const STRAND_WIDTH = BODY * 0.27;

/** How far out a coat's strands grow from, in the design's units: a little inside the body's edge, so no gap shows at their roots. */
const ROOT = BODY * 0.78;

/** How much further a coat's tips reach with its fur on end, as a share of their reach at rest. */
const RISE = 0.22;

/**
 * Returns the points of a strand of fur, a curve from inside the body out
 * to its tip, from a radius at an angle, in radians clockwise from the
 * right, to a radius, its tip carried round by `bend` radians.
 */
export function strand(
  angle: number,
  from: number,
  to: number,
  bend: number,
): readonly Point[] {
  const root = polar(angle, from);
  return [
    root,
    ...quadraticPoints(
      root,
      polar(angle + bend * 0.35, (from + to) / 2),
      polar(angle + bend, to),
    ),
  ];
}

/** Returns strands of fur in an ink, each a width wide and round at its ends. */
export function strokes(
  strands: readonly (readonly Point[])[],
  ink: number,
  width: number,
): readonly DrawCommand[] {
  return strands.flatMap((points) => stroke(points, { color: ink, width }));
}

/** Says how a coat of short fur grows: its strands, their reach and bend, and where round the body it grows. */
export interface Coat {
  readonly count: number;
  /** How far its tips reach, in the body's radii. */
  readonly reach: number;
  /** How much its tips' reach varies, in the body's radii. */
  readonly vary: number;
  /** How far round each tip is carried, in radians, at rest; on end, none. */
  readonly bend: number;
  /** The seed its strands' angles and reach are drawn from, so it is drawn the same every time. */
  readonly seed: number;
  /** Where round the body it grows, in radians clockwise from the right, its first strand at `from` and its last at `to`; all the way round without. */
  readonly arc?: { readonly from: number; readonly to: number };
}

/**
 * Returns a coat's strands, standing `lift` of the way from at rest, 0, to
 * on end, 1: each strand's angle a little off even, its reach a little off
 * the coat's, longer and straighter the further it stands.
 */
export function coat(
  { count, reach, vary, bend, seed, arc }: Coat,
  lift: number,
): readonly (readonly Point[])[] {
  const random = createRandom(seed);
  const from = arc?.from ?? 0;
  const span = arc ? arc.to - arc.from : 2 * Math.PI;
  return Array.from({ length: count }, (_, i) => {
    const step = arc ? i / (count - 1) : i / count;
    const angle = from + span * step + (random() - 0.5) * (span / count) * 0.5;
    const tip = BODY * (reach + (random() - 0.5) * vary) * (1 + lift * RISE);
    return strand(angle, ROOT, tip, bend * (1 - lift));
  });
}
