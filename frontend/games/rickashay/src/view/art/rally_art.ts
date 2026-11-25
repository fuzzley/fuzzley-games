// The rally, the strikes of the flight under way, as the design's "Look"
// has it: a small, faint number fixed under the danger line, where no
// brick stands while the fuzzball flies, and under the fuzzball, which
// passes over it. The scene writes no text, so the number is drawn in
// digits of its own, each a frame of strokes round at their ends, baked
// once a palette and a scale at the field's own unit, so they are as sharp
// as the bricks at every size; and where it stands, worked out here.

import { COLUMNS } from "@fz/brick-wall/rules/field";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import type { Place } from "@fz/brick-wall/view/field_metrics";
import { itemAt } from "@fz/core/records";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  arcPoints,
  centered,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../colors/palette";

/** Every digit a rally is written in, in order. */
export const DIGITS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const satisfies readonly number[];

/** A digit, 0 to 9. */
export type Digit = (typeof DIGITS)[number];

/** Every count of digits a rally is written in: a rally of 1 to 9999. */
export const RALLY_LENGTHS = [1, 2, 3, 4] as const satisfies readonly number[];

/** How many digits write a rally. */
export type RallyLength = (typeof RALLY_LENGTHS)[number];

/** The most digits a rally is written in, a rally past which shows as the most they write. */
export const MOST_DIGITS = RALLY_LENGTHS.length;

/** The highest rally written, 9999: a flight's is never near it. */
export const MOST_WRITTEN = 10 ** MOST_DIGITS - 1;

/** The names of the rally's frames: each digit. */
export const RALLY_FRAMES = {
  digit: (digit: Digit) => `rally-digit-${digit}` as const,
} as const;

/** The name of each digit's frame, by digit, made once, so finding one makes nothing. */
const DIGIT_NAMES = DIGITS.map((digit) => RALLY_FRAMES.digit(digit));

/** Returns a digit's frame. */
export function digitFrameOf(digit: Digit): string {
  return itemAt(DIGIT_NAMES, digit);
}

/**
 * Says how the rally is drawn, in field units: its digits 0.6 tall, their
 * line 0.09 wide, and a digit's room, 0.5, which keeps two side by side
 * about a twelfth of a unit apart.
 */
export const RALLY = { height: 0.6, line: 0.09, pitch: 0.5 } as const;

/** How wide a digit's strokes run, as a share of its height. */
const DIGIT_WIDE = 0.55;

/** Half a digit's width, as a share of its height, the radius of its round strokes. */
const HALF = DIGIT_WIDE / 2;

/** Returns the points round a circle in a digit's box, a whole turn, the first again at the end. */
function loop(middle: Point, radius: number): readonly Point[] {
  return arcPoints(middle, radius, 0, 2 * Math.PI);
}

/**
 * Each digit's strokes, each a line through points in its box, as shares of
 * its height, across from its left and down from its top, `DIGIT_WIDE`
 * wide: an angle in radians runs clockwise from the right.
 */
const GLYPHS = {
  0: [
    [
      ...arcPoints({ x: HALF, y: HALF }, HALF, Math.PI, 2 * Math.PI),
      ...arcPoints({ x: HALF, y: 1 - HALF }, HALF, 0, Math.PI),
      { x: 0, y: HALF },
    ],
  ],
  1: [
    [
      { x: 0.1, y: 0.2 },
      { x: 0.34, y: 0 },
      { x: 0.34, y: 1 },
    ],
  ],
  2: [
    [
      ...arcPoints({ x: HALF, y: HALF }, HALF, 1.15 * Math.PI, 2.25 * Math.PI),
      { x: 0, y: 1 },
      { x: DIGIT_WIDE, y: 1 },
    ],
  ],
  3: [
    [
      { x: 0.03, y: 0 },
      { x: 0.52, y: 0 },
      ...arcPoints({ x: HALF, y: 0.72 }, 0.28, -Math.PI / 2, 0.85 * Math.PI),
    ],
  ],
  4: [
    [
      { x: 0.42, y: 1 },
      { x: 0.42, y: 0 },
      { x: 0, y: 0.7 },
      { x: DIGIT_WIDE, y: 0.7 },
    ],
  ],
  5: [
    [
      { x: 0.52, y: 0 },
      { x: 0.06, y: 0 },
      { x: 0.04, y: 0.5 },
      ...arcPoints({ x: HALF, y: 0.72 }, 0.28, -0.7 * Math.PI, 0.85 * Math.PI),
    ],
  ],
  6: [
    [
      { x: 0.48, y: 0 },
      { x: 0.2, y: 0.25 },
      { x: 0.03, y: 0.55 },
      ...arcPoints({ x: HALF, y: 1 - HALF }, HALF, Math.PI, 3 * Math.PI),
    ],
  ],
  7: [
    [
      { x: 0, y: 0 },
      { x: DIGIT_WIDE, y: 0 },
      { x: 0.18, y: 1 },
    ],
  ],
  8: [loop({ x: HALF, y: 0.23 }, 0.23), loop({ x: HALF, y: 1 - HALF }, HALF)],
  9: [
    [
      ...arcPoints({ x: HALF, y: HALF }, HALF, 0, 2 * Math.PI),
      { x: 0.52, y: 0.5 },
      { x: 0.35, y: 0.8 },
      { x: 0.1, y: 1 },
    ],
  ],
} as const satisfies Readonly<Record<Digit, readonly (readonly Point[])[]>>;

/**
 * Returns the rally's frames, drawn in a palette at a scale, each digit
 * about its middle in the rally's color at full strength, which the scene
 * shows at the palette's, its strokes a CSS pixel wide at least.
 */
export function rallyFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const tall = RALLY.height * scale.unit;
  const line = {
    color: palette.rally.color,
    width: widthOf(RALLY.line, scale),
  };
  return DIGITS.map((each) =>
    centered(
      RALLY_FRAMES.digit(each),
      GLYPHS[each].flatMap((points): readonly DrawCommand[] =>
        stroke(
          points.map(({ x, y }) => ({
            x: (x - HALF) * tall,
            y: (y - 0.5) * tall,
          })),
          line,
        ),
      ),
    ),
  );
}

/** Returns how many digits write a rally, the most written past {@link MOST_WRITTEN}: 1 for none. */
export function digitsIn(rally: number): RallyLength {
  let length: RallyLength = 1;
  // Read by number, as the painter reads a frame's rally and makes nothing.
  for (let at = 1; at < RALLY_LENGTHS.length; at++) {
    const longer = itemAt(RALLY_LENGTHS, at);
    if (rally >= 10 ** (longer - 1)) length = longer;
  }
  return length;
}

/**
 * Returns the digit of a rally at a place among its digits, from the left,
 * as it is written, the most written past {@link MOST_WRITTEN}.
 */
export function digitAt(rally: number, at: number): Digit {
  const written = Math.min(rally, MOST_WRITTEN);
  const place = 10 ** (digitsIn(rally) - 1 - at);
  return itemAt(DIGITS, Math.floor(written / place) % 10);
}

/**
 * Returns how far across the field a digit's middle stands from the
 * rally's, in field units, by its place among the rally's digits from the
 * left.
 */
export function digitAcross(length: RallyLength, at: number): number {
  return (at - (length - 1) / 2) * RALLY.pitch;
}

/**
 * Where the rally's middle stands, in field units, up from the floor at
 * every depth: across the field's middle, in the floor's row, halfway
 * between the floor and the danger line, wherever the fuzzball flies.
 *
 * No brick stands in the floor's row while the fuzzball flies: one the
 * level doesn't need sinks into the floor as the wall's step brings it
 * there, and one it needs loses the level. The rally shows only in flight,
 * so it never lies under the fuzzball waiting on the floor.
 */
export const RALLY_PLACE: Readonly<Place> = {
  x: COLUMNS / 2,
  y: DANGER_ROW / 2,
};
