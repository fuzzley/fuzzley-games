// The pill the fuzzball's rally rides in beside it, as the design's "Look"
// has it and `docs/rickashay/art/make-art.mjs` draws it: a pill of the
// warning color, its number in the text the palette sets on that color.
// The scene writes no text, so the number is drawn in digits of its own,
// each a frame of strokes round at their ends, baked once a palette and a
// scale; and where the pill stands beside the fuzzball, worked out here.

import { COLUMNS } from "@fz/brick-wall/rules/field";
import type { Place } from "@fz/brick-wall/view/field_metrics";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  arcPoints,
  centered,
  roundRect,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../colors/palette";
import type { BallView } from "../run_state";
import { itemAt } from "./items";

/** Every digit a rally is written in, in order. */
export const DIGITS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
] as const satisfies readonly number[];

/** A digit, 0 to 9. */
export type Digit = (typeof DIGITS)[number];

/** Every count of digits the pill holds: a rally of 1 to 9999. */
export const PILL_LENGTHS = [1, 2, 3, 4] as const satisfies readonly number[];

/** How many digits the pill holds. */
export type PillLength = (typeof PILL_LENGTHS)[number];

/** The most digits the pill holds, a rally past which shows as the most they write. */
export const MOST_DIGITS = PILL_LENGTHS.length;

/** The highest rally the pill writes, 9999: a flight's is never near it. */
export const MOST_WRITTEN = 10 ** MOST_DIGITS - 1;

/** The names of the pill's frames: a pill for each count of digits, and each digit. */
export const PILL_FRAMES = {
  pill: (length: PillLength) => `rally-pill-${length}` as const,
  digit: (digit: Digit) => `rally-digit-${digit}` as const,
} as const;

/** The name of a pill's frame by how many digits it holds, less one, made once, so finding one makes nothing. */
const PILL_NAMES = PILL_LENGTHS.map((length) => PILL_FRAMES.pill(length));

/** The name of each digit's frame, by digit, made once, as {@link PILL_NAMES} are. */
const DIGIT_NAMES = DIGITS.map((digit) => PILL_FRAMES.digit(digit));

/** Returns the frame of a pill that holds some digits. */
export function pillFrameOf(length: PillLength): string {
  return itemAt(PILL_NAMES, length - 1);
}

/** Returns a digit's frame. */
export function digitFrameOf(digit: Digit): string {
  return itemAt(DIGIT_NAMES, digit);
}

/**
 * Says how the pill is drawn and where it stands, in field units, as the
 * art draws it at a cell of 40: 0.75 tall, round at both ends; a digit's
 * room, which a pill of two digits leaves it 1.43 wide; its near end 0.55
 * across from the fuzzball's middle, its foot 0.25 over it.
 */
export const PILL = {
  height: 0.75,
  pitch: 0.34,
  beside: 0.55,
  over: 0.25,
} as const;

/**
 * Says how a digit is drawn, in field units: how tall it stands, and its
 * line, bold, as the art writes the rally.
 */
export const DIGIT = { height: 0.4, line: 0.07 } as const;

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
 * Returns the pill's frames, drawn in a palette at a scale, each about its
 * middle: a pill of the pill's fill for each count of digits, as wide as
 * they need, and each digit in the pill's text, its strokes a CSS pixel
 * wide at least.
 */
export function pillFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const tall = PILL.height * scale.unit;
  const digit = DIGIT.height * scale.unit;
  const line = { color: palette.pill.text, width: widthOf(DIGIT.line, scale) };
  return [
    ...PILL_LENGTHS.map((length) => {
      const wide = pillWidth(length) * scale.unit;
      return centered(PILL_FRAMES.pill(length), [
        roundRect(
          { x: -wide / 2, y: -tall / 2, width: wide, height: tall },
          tall / 2,
          { color: palette.pill.fill },
        ),
      ]);
    }),
    ...DIGITS.map((each) =>
      centered(
        PILL_FRAMES.digit(each),
        GLYPHS[each].flatMap((points): readonly DrawCommand[] =>
          stroke(
            points.map(({ x, y }) => ({
              x: (x - HALF) * digit,
              y: (y - 0.5) * digit,
            })),
            line,
          ),
        ),
      ),
    ),
  ];
}

/** Returns how wide a pill of some digits is, in field units: as tall, and a digit's room for each. */
export function pillWidth(length: PillLength): number {
  return PILL.height + length * PILL.pitch;
}

/** Returns how many digits write a rally, the most written past {@link MOST_WRITTEN}: 1 for none. */
export function digitsIn(rally: number): PillLength {
  let length: PillLength = 1;
  // Read by number, as the pill reads a frame's rally and makes nothing.
  for (let at = 1; at < PILL_LENGTHS.length; at++) {
    const longer = itemAt(PILL_LENGTHS, at);
    if (rally >= 10 ** (longer - 1)) length = longer;
  }
  return length;
}

/**
 * Returns the digit of a rally at a place among its digits, from the left,
 * as the pill writes it, the most written past {@link MOST_WRITTEN}.
 */
export function digitAt(rally: number, at: number): Digit {
  const written = Math.min(rally, MOST_WRITTEN);
  const place = 10 ** (digitsIn(rally) - 1 - at);
  return itemAt(DIGITS, Math.floor(written / place) % 10);
}

/**
 * Returns how far across the field a digit's middle stands from its pill's,
 * in field units, by its place among the pill's digits from the left.
 */
export function digitAcross(length: PillLength, at: number): number {
  return (at - (length - 1) / 2) * PILL.pitch;
}

/**
 * Writes where the middle of the pill a rally rides in stands, in field
 * units, into a place and returns it: beside the fuzzball on its right,
 * over its middle, but on its left where the right wall would cut it, and
 * under its middle where the ceiling would.
 */
export function pillPlace(
  { x, y, rally }: Pick<BallView, "x" | "y" | "rally">,
  depth: number,
  into: Place,
): Place {
  const half = pillWidth(digitsIn(rally)) / 2;
  const right = x + PILL.beside + half;
  into.x = right + half > COLUMNS ? x - PILL.beside - half : right;
  const middle = PILL.over + PILL.height / 2;
  into.y = y + middle + PILL.height / 2 > depth ? y - middle : y + middle;
  return into;
}
