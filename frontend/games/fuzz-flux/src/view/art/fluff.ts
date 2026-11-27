// The kit every move's effects are drawn from, as the design's fifth rule
// of motion has it: fluff, a tuft of each kind's fur, which a gathered
// fuzzball leaves; a thin ring; a dasher's streak; and a frizzball's bolt
// of static. And the hint's hand, which shows a level's first move. The
// ring and the streak are white, for the scene to tint in the ink an
// effect names.

import { createRandom } from "@fz/core/random";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  arcPoints,
  centered,
  circle,
  polygon,
  quadraticPoints,
  ring,
  stroke,
} from "@fz/phaser/shapes";
import { KIND_IDS } from "../../rules/catalog/kinds";
import type { BoardPalette } from "../colors/palette";
import { SQUARE, atLeastAPixel, inPixels } from "./design_square";
import { FRAMES } from "./frame_names";
import { rimOf } from "./rim";

/** The color of the frames the scene tints. */
const WHITE = 0xffffff;

/**
 * Says how a tuft is drawn at the largest a gathered fuzzball throws one,
 * which the scene draws smaller, in the design's units: how long and how
 * wide it is, and how far above its ends its curve's control lies, as a
 * share of its length.
 */
const TUFT = { length: 18, width: 9.5, control: 0.4 } as const;

/** Returns a tuft of fur in an ink, a curved strand round at its ends, about its middle. */
export function tuftOf(ink: number): readonly DrawCommand[] {
  const { length, width, control } = TUFT;
  const from = { x: -length / 2, y: 0 };
  return stroke(
    [
      from,
      ...quadraticPoints(
        from,
        { x: 0, y: -length * control },
        { x: length / 2, y: 0 },
      ),
    ],
    { color: ink, width },
  );
}

/**
 * The ring's radius, in squares, which the scene scales it from as it
 * spreads, from a quarter of a square out to as far as the effect says.
 *
 * Its line scales with it, where the design's keeps its width as it
 * spreads: thinner than its frame's while the ring is under a square
 * across, and thicker past it, as a blast's ring spreads to 3 squares
 * and more.
 */
export const RING_RADIUS = 1;

/**
 * How wide the ring's line is at its frame's radius, in the design's
 * units, a CSS pixel at least: between the design's at a ring's start and
 * at its end, so a bunch's ring, which spreads to most of a square, is
 * about as thin as the design draws it.
 */
const RING_LINE = 6;

/**
 * Says how a dasher's streak is drawn, in the design's units: its round
 * head's radius, how far its tail trails behind its head's middle, how
 * wide the tail is at its end, and how many bands it fades over, as the
 * design's streak fades behind its head. The tint that colors its tail
 * colors its head too, where the design's head is the frizzball's color.
 */
const STREAK = { head: 25, tail: 340, end: 11, bands: 8 } as const;

/** How opaque the streak's tail is at its head, fading to nothing at its end. */
const STREAK_TAIL_ALPHA = 0.85;

/**
 * How far ahead of its frame's middle a streak's head's middle lies, in
 * squares, its tail trailing behind: the scene sets it there on the
 * dasher's line, the frame pointing the way it runs.
 */
export const STREAK_HEAD = (STREAK.tail - STREAK.head) / 2 / SQUARE;

/** Returns a dasher's streak in white, pointing right, about its frame's middle. */
function streakOf(): readonly DrawCommand[] {
  const { head, tail, end, bands } = STREAK;
  const ahead = STREAK_HEAD * SQUARE;
  // How far either side of its line the tail reaches, at a distance behind the head.
  const halfAt = (behind: number): number =>
    head + ((end / 2 - head) * behind) / tail;
  return [
    ...Array.from({ length: bands }, (_, i) => {
      const near = (tail * i) / bands;
      const far = (tail * (i + 1)) / bands;
      return polygon(
        [
          { x: ahead - near, y: -halfAt(near) },
          { x: ahead - far, y: -halfAt(far) },
          { x: ahead - far, y: halfAt(far) },
          { x: ahead - near, y: halfAt(near) },
        ],
        {
          color: WHITE,
          alpha: STREAK_TAIL_ALPHA * (1 - i / bands) ** 1.3,
        },
      );
    }),
    circle({ x: ahead, y: 0 }, head, { color: WHITE }),
  ];
}

/** How long a bolt of static is drawn, in squares, which the scene stretches it from to reach from a frizzball to what it strikes. */
export const BOLT_LENGTH = 2;

/**
 * Says how a bolt of static is drawn, in the design's units: how many
 * legs it zigzags in, how far its corners may stray from its line, each
 * the other side of it from the last, how wide its glow and its core are,
 * and the seed its corners' strays are drawn from. It is one zigzag, where
 * the design's is drawn anew every 45 ms, which the scene may flip across
 * its line to flicker.
 */
const BOLT = { legs: 5, stray: 25, glow: 13.3, core: 5.6, seed: 5 } as const;

/** Returns a bolt of static from left to right about its middle, in the sparks' color with a core of the frizzball's, its core a CSS pixel wide at least. */
function boltOf(
  palette: BoardPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { legs, stray, glow, core, seed } = BOLT;
  const random = createRandom(seed);
  const length = BOLT_LENGTH * SQUARE;
  const corners = Array.from({ length: legs + 1 }, (_, i) => ({
    x: (length * i) / legs - length / 2,
    y:
      i === 0 || i === legs
        ? 0
        : (i % 2 === 0 ? 1 : -1) * (0.4 + 0.6 * random()) * stray,
  }));
  return [
    ...stroke(corners, { color: palette.spark, width: glow }),
    ...stroke(corners, {
      color: palette.frizzball.body,
      width: atLeastAPixel(core, scale),
    }),
  ];
}

/**
 * Says how the hint's hand is drawn, in the design's units: a fingertip's
 * radius, the radius of its corner toward the bottom left, as the design's
 * comes to a point there, and its rim's width, a CSS pixel at least.
 */
const HAND = { radius: 30, corner: 18, rim: 4 } as const;

/** Returns the hint's hand about its fingertip's middle, in the marks' color, rimmed in the page's. */
function handOf(
  palette: BoardPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const { radius, corner } = HAND;
  const inward = radius - corner;
  const tip = polygon(
    [
      ...arcPoints(ORIGIN, radius, Math.PI, 2.5 * Math.PI),
      ...arcPoints({ x: -inward, y: inward }, corner, Math.PI / 2, Math.PI),
    ],
    { color: palette.marks },
  );
  return [...rimOf([tip], atLeastAPixel(HAND.rim, scale), palette.page), tip];
}

/**
 * Returns the kit's frames and the hand's, in a palette at a scale: a tuft
 * in each kind's ink, the ring and the streak in white, the bolt in the
 * sparks' color, and the hand.
 */
export function fluffFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...KIND_IDS.map((kind) =>
      centered(FRAMES.tuft(kind), inPixels(tuftOf(palette.kinds[kind]), scale)),
    ),
    centered(
      FRAMES.ring,
      inPixels(
        [
          ring(ORIGIN, RING_RADIUS * SQUARE, {
            color: WHITE,
            width: atLeastAPixel(RING_LINE, scale),
          }),
        ],
        scale,
      ),
    ),
    centered(FRAMES.streak, inPixels(streakOf(), scale)),
    centered(FRAMES.bolt, inPixels(boltOf(palette, scale), scale)),
    centered(FRAMES.hand, inPixels(handOf(palette, scale), scale)),
  ];
}
