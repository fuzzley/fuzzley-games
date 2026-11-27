// The amber kind, which the design draws yellow: a short coat under a
// top-knot of three long strands that curls over to its right, so its
// outline has a plume. It sits low in its square to make room for the knot.

import { BODY } from "../design_square";
import {
  type Coat,
  type KindArt,
  STRAND_WIDTH,
  coat,
  strand,
  strokes,
} from "./kind_art";

/** Its coat, short and nearly even. */
const COAT: Coat = { count: 24, reach: 1.13, vary: 0.08, bend: 0.16, seed: 23 };

/** How far out the knot's strands grow from, in the body's radii. */
const KNOT_ROOT = 0.7;

/** The knot's three strands from its left: how far each is turned from straight up, in radians; how far it reaches, in the body's radii; and how far round its tip curls, in radians. */
const KNOT = [
  { turn: -0.13, reach: 1.5, bend: 0.42 },
  { turn: 0, reach: 1.86, bend: 0.4 },
  { turn: 0.13, reach: 1.62, bend: 0.5 },
] as const;

/** How much wider the knot's strands grow on end, as a share. */
const KNOT_THICKENS = 0.1;

/** How wide a strand of the knot is at rest, in the design's units. */
const KNOT_WIDTH = BODY * 0.26;

/** The amber kind's art, seated low in its square. */
export const AMBER: KindArt = {
  seat: { x: 0, y: BODY * 0.24 },
  fur: (ink, lift) => [
    ...strokes(coat(COAT, lift), ink, STRAND_WIDTH),
    ...strokes(
      KNOT.map(({ turn, reach, bend }) =>
        strand(-Math.PI / 2 + turn, BODY * KNOT_ROOT, BODY * reach, bend),
      ),
      ink,
      KNOT_WIDTH * (1 + lift * KNOT_THICKENS),
    ),
  ],
};
