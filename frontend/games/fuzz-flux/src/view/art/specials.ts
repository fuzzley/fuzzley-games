// The specials' second furs, each worn behind its fuzzball's own and drawn
// in its kind's second ink, which says what it does when it goes off: a
// dasher's streamers along its line, an arrowhead past either end; a
// puffer's ruff, standing straight out all round; and a wisp's seed-head,
// a fan of fine hairs on a stalk above it. A special keeps its kind's
// color, outline and face, drawn a little smaller and seated anew to make
// room for its second fur, and wears a rim in the square's color between
// the two.

import {
  type DrawCommand,
  type Point,
  circle,
  polygon,
  stroke,
} from "@fz/phaser/shapes";
import type { SpecialId } from "../../rules/catalog/specials";
import { BODY, polar } from "./design_square";
import { strand, strokes } from "./kinds/kind_art";

/** Says how a special is drawn, on the design's square, about its fuzzball's body's middle. */
interface SpecialArt {
  /** How large its fuzzball is drawn, second fur and all, as a share of a plain one. */
  readonly scale: number;
  /** Returns where its fuzzball's body sits in its square, from where its kind's plain one sits. */
  readonly seat: (plain: Point) => Point;
  /** Returns its second fur in an ink. */
  readonly secondFur: (ink: number) => readonly DrawCommand[];
}

/** How large a dasher or a puffer is drawn, second fur and all, as a share of a plain fuzzball. */
const DRAWN_SMALLER = 0.86;

/**
 * Where a dasher's or a puffer's body sits from its plain one's: as far
 * across, as it is drawn smaller, and not quite as far up or down, as its
 * second fur stands out all round it.
 */
function closerIn({ x, y }: Point): Point {
  return { x: x * DRAWN_SMALLER, y: y * 0.6 };
}

/**
 * A dasher's streamers either side, each a long one along its line and a
 * short one either side of it: how far each is turned off the line, in
 * radians; how far its tip reaches, in the body's radii; and how wide its
 * root is either side, in radians.
 */
const STREAMERS = [
  { turn: 0, reach: 1.9, half: 0.27 },
  { turn: 0.5, reach: 1.56, half: 0.2 },
  { turn: -0.5, reach: 1.56, half: 0.2 },
] as const;

/** How far out a dasher's streamers' roots lie, in the body's radii. */
const STREAMER_ROOT = 0.9;

/** How wide the line round a dasher's streamers is, rounding their corners, in the design's units. */
const STREAMER_ROUNDING = BODY * 0.1;

/**
 * Returns a dasher's streamers in an ink, along a line the way it runs, in
 * radians clockwise from the right: 0 across, a quarter turn up and down.
 */
function streamers(ink: number, way: number): readonly DrawCommand[] {
  return [way, way + Math.PI].flatMap((along) =>
    STREAMERS.flatMap(({ turn, reach, half }) => {
      const angle = along + turn;
      const first = polar(angle - half, BODY * STREAMER_ROOT);
      const corners = [
        first,
        polar(angle, BODY * reach),
        polar(angle + half, BODY * STREAMER_ROOT),
      ];
      return [
        polygon(corners, { color: ink }),
        ...stroke([...corners, first], {
          color: ink,
          width: STREAMER_ROUNDING,
        }),
      ];
    }),
  );
}

/** How many strands a puffer's ruff has, long and short in turn. */
const RUFF = 16;

/**
 * Says how a puffer's ruff is drawn, in the body's radii: how far out its
 * strands grow from, how far its long ones and its short ones reach, and
 * how wide each is; and how far round its first strand is turned from the
 * right, in radians.
 */
const RUFF_LOOK = {
  root: 0.8,
  long: 1.62,
  short: 1.48,
  width: 0.36,
  turn: 0.2,
} as const;

/** Returns a puffer's ruff in an ink. */
function ruff(ink: number): readonly DrawCommand[] {
  return strokes(
    Array.from({ length: RUFF }, (_, i) =>
      strand(
        (i / RUFF) * 2 * Math.PI + RUFF_LOOK.turn,
        BODY * RUFF_LOOK.root,
        BODY * (i % 2 === 0 ? RUFF_LOOK.long : RUFF_LOOK.short),
        0,
      ),
    ),
    ink,
    BODY * RUFF_LOOK.width,
  );
}

/** How many hairs a wisp's seed-head fans out into. */
const HAIRS = 7;

/**
 * Says how a wisp's seed-head is drawn, in the body's radii: how high its
 * stalk starts and how high its hub is, above the body's middle; how long
 * each hair is and how far apart, in radians; how wide the stalk and a
 * hair are; and a bead's radius at each hair's tip.
 */
const SEED_HEAD = {
  stalk: 0.82,
  hub: 1.5,
  hair: 0.82,
  apart: 0.36,
  stalkWidth: 0.12,
  hairWidth: 0.085,
  bead: 0.085,
} as const;

/** Returns a wisp's seed-head in an ink. */
function seedHead(ink: number): readonly DrawCommand[] {
  const look = SEED_HEAD;
  const hub = { x: 0, y: -BODY * look.hub };
  const tips = Array.from({ length: HAIRS }, (_, i) => {
    const { x, y } = polar(
      -Math.PI / 2 + (i - (HAIRS - 1) / 2) * look.apart,
      BODY * look.hair,
    );
    return { x: hub.x + x, y: hub.y + y };
  });
  return [
    ...stroke([{ x: 0, y: -BODY * look.stalk }, hub], {
      color: ink,
      width: BODY * look.stalkWidth,
    }),
    ...strokes(
      tips.map((tip) => [hub, tip]),
      ink,
      BODY * look.hairWidth,
    ),
    ...tips.map((tip) => circle(tip, BODY * look.bead, { color: ink })),
  ];
}

/** Each special's art, by its id, so a special cataloged without art fails to compile. */
export const SPECIAL_ART = {
  "dasher-across": {
    scale: DRAWN_SMALLER,
    seat: closerIn,
    secondFur: (ink) => streamers(ink, 0),
  },
  "dasher-down": {
    scale: DRAWN_SMALLER,
    seat: closerIn,
    secondFur: (ink) => streamers(ink, Math.PI / 2),
  },
  puffer: { scale: DRAWN_SMALLER, seat: closerIn, secondFur: ruff },
  wisp: {
    scale: 0.8,
    seat: ({ x }) => ({ x, y: BODY * 0.42 }),
    secondFur: seedHead,
  },
} as const satisfies Readonly<Record<SpecialId, SpecialArt>>;

/** How wide the rim between a special's fuzzball and its second fur is, in the design's units, where that is more than a CSS pixel. */
export const RIM = BODY * 0.08;
