// The violet kind, which the design draws purple: a short coat over its top
// half and a fringe of seven long strands hanging from under it, so its
// outline is a jellyfish's. It sits high in its square to make room for
// the fringe, which splays as its fur stands on end.

import { createRandom } from "@fz/core/random";
import { type Point, quadraticPoints } from "@fz/phaser/shapes";
import { BODY } from "../design_square";
import {
  type Coat,
  type KindArt,
  STRAND_WIDTH,
  coat,
  strokes,
} from "./kind_art";

/** Its coat, over its top half alone, from its left round to its right. */
const COAT: Coat = {
  count: 15,
  reach: 1.13,
  vary: 0.08,
  bend: 0.14,
  seed: 37,
  arc: { from: Math.PI * 0.98, to: Math.PI * 2.02 },
};

/** How many strands its fringe has, from its left. */
const FRINGE = 7;

/**
 * Says how its fringe hangs, in the body's radii: where its strands' roots
 * lie across, from the left one, and how far apart the outer ones are;
 * how far down the outer roots lie and how much lower the middle ones;
 * how long the outer strands are, how much longer the middle ones, and
 * how much longer each may be by chance; how far they splay apart at rest
 * and how much further on end; and how much they shorten on end, as a
 * share.
 */
const FRINGE_LOOK = {
  left: -0.78,
  across: 1.56,
  down: 0.18,
  sag: 0.42,
  length: 0.74,
  middle: 0.36,
  vary: 0.1,
  splay: 0.34,
  spread: 0.5,
  shrink: 0.12,
} as const;

/** The seed by which each strand of its fringe is a little longer or shorter, so it is drawn the same every time. */
const FRINGE_SEED = 41;

/** How wide a strand of its fringe is, in the design's units. */
const FRINGE_WIDTH = BODY * 0.3;

/** Returns its fringe's strands, splayed further and a little shorter `lift` of the way to on end. */
function fringe(lift: number): readonly (readonly Point[])[] {
  const random = createRandom(FRINGE_SEED);
  const look = FRINGE_LOOK;
  return Array.from({ length: FRINGE }, (_, i) => {
    const t = i / (FRINGE - 1);
    const arch = Math.sin(t * Math.PI);
    const root = {
      x: BODY * (look.left + look.across * t),
      y: BODY * (look.down + look.sag * arch),
    };
    const length =
      BODY * (look.length + look.middle * arch + random() * look.vary);
    const splay = (t - 0.5) * BODY * (look.splay + lift * look.spread);
    return [
      root,
      ...quadraticPoints(
        root,
        { x: root.x + splay * 0.3, y: root.y + length * 0.6 },
        { x: root.x + splay, y: root.y + length * (1 - lift * look.shrink) },
      ),
    ];
  });
}

/** The violet kind's art, seated high in its square. */
export const VIOLET: KindArt = {
  seat: { x: 0, y: -BODY * 0.22 },
  fur: (ink, lift) => [
    ...strokes(coat(COAT, lift), ink, STRAND_WIDTH),
    ...strokes(fringe(lift), ink, FRINGE_WIDTH),
  ],
};
