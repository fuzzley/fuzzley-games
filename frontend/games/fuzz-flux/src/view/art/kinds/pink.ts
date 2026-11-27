// The pink kind: a short coat and two tufts of three long strands, one
// either side of its crown, so its outline has ears. It sits low in its
// square to make room for them.

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
const COAT: Coat = { count: 24, reach: 1.13, vary: 0.08, bend: 0.16, seed: 53 };

/** How far either side of straight up each tuft grows, in radians. */
const TUFT_SIDE = 0.56;

/** How far out the tufts' strands grow from, in the body's radii. */
const TUFT_ROOT = 0.7;

/**
 * Each tuft's three strands, from the one nearest the crown: how far each
 * is turned out from the tuft's middle, in radians; how far it reaches, in
 * the body's radii; and how far round its tip is carried, outward, in
 * radians.
 */
const TUFT = [
  { turn: -0.15, reach: 1.46, bend: -0.04 },
  { turn: 0, reach: 1.8, bend: 0.05 },
  { turn: 0.15, reach: 1.52, bend: 0.12 },
] as const;

/** How much wider the tufts' strands grow on end, as a share. */
const TUFT_THICKENS = 0.1;

/** The pink kind's art, seated low in its square. */
export const PINK: KindArt = {
  seat: { x: 0, y: BODY * 0.22 },
  fur: (ink, lift) => [
    ...strokes(coat(COAT, lift), ink, STRAND_WIDTH),
    ...strokes(
      [-1, 1].flatMap((side) =>
        TUFT.map(({ turn, reach, bend }) =>
          strand(
            -Math.PI / 2 + side * (TUFT_SIDE + turn),
            BODY * TUFT_ROOT,
            BODY * reach,
            side * bend,
          ),
        ),
      ),
      ink,
      STRAND_WIDTH * (1 + lift * TUFT_THICKENS),
    ),
  ],
};
