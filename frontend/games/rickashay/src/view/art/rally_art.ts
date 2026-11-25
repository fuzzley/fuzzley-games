// The rally, the strikes of the flight under way, as the design's "Look"
// has it: a small number fixed under the danger line, where no brick
// stands while the fuzzball flies, and under the fuzzball, which passes
// over it. It takes a look for each of `RALLY_MARKS` its flight reaches, as
// the fuzzball's fur lifts: thin and faint, then bold, then filled in the
// warning color and bordered, then red-hot over a fire. The scene writes no
// text, so the number is drawn in digits of its own, each a frame of
// strokes round at their ends in each look, and its fire in tongues of
// `@fz/phaser/fuzzball`'s flame, baked once a palette and a scale at the
// field's own unit, so they are as sharp as the bricks at every size; and
// where they stand, worked out here.

import { COLUMNS } from "@fz/brick-wall/rules/field";
import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import type { Place } from "@fz/brick-wall/view/field_metrics";
import { itemAt } from "@fz/core/records";
import { flameTongue } from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  type Point,
  arcPoints,
  centered,
  placed,
  polygon,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { type MarksReached, marksReached } from "../../rules/tuning";
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

/**
 * Every look the rally's number takes, by how many of `RALLY_MARKS` its
 * flight has reached, in order, one for each of `MARK_COUNTS`: thin and
 * faint to a rally of 9, bold from 10, bordered from 25, and on fire
 * from 45.
 */
export const RALLY_LOOKS = [
  "faint",
  "bold",
  "bordered",
  "fire",
] as const satisfies readonly string[] & Readonly<Record<MarksReached, string>>;

/** A look of the rally's number, such as "bold". */
export type RallyLook = (typeof RALLY_LOOKS)[number];

/** Returns the look a rally is drawn in: a step at each of `RALLY_MARKS` it has reached, as the fuzzball's fur lifts. */
export function rallyLookOf(rally: number): RallyLook {
  return RALLY_LOOKS[marksReached(rally)];
}

/**
 * Returns whether the number steps into a look, from the look it showed,
 * or null while it hid: only into a later one, so a number that first
 * shows, or a new flight's, takes its look as it is.
 */
export function stepsInto(shown: RallyLook | null, look: RallyLook): boolean {
  return (
    shown !== null && RALLY_LOOKS.indexOf(look) > RALLY_LOOKS.indexOf(shown)
  );
}

/** The names of the rally's frames: each digit in each look, and a tongue of its fire. */
export const RALLY_FRAMES = {
  digit: (look: RallyLook, digit: Digit) => `rally-${look}-${digit}` as const,
  flame: "rally-flame",
} as const;

/** Returns the name of each digit's frame in a look, by digit. */
function digitNamesIn(look: RallyLook): readonly string[] {
  return DIGITS.map((digit) => RALLY_FRAMES.digit(look, digit));
}

/** The name of each digit's frame in each look, made once, so finding one makes nothing. */
const DIGIT_NAMES = {
  faint: digitNamesIn("faint"),
  bold: digitNamesIn("bold"),
  bordered: digitNamesIn("bordered"),
  fire: digitNamesIn("fire"),
} as const satisfies Readonly<Record<RallyLook, readonly string[]>>;

/** Returns a digit's frame in a look. */
export function digitFrameOf(look: RallyLook, digit: Digit): string {
  return itemAt(DIGIT_NAMES[look], digit);
}

/**
 * Says how the rally is drawn, in field units: its digits 0.6 tall, and a
 * digit's room, 0.6, which keeps two bordered digits side by side about
 * 0.08 of a unit apart. A rally written thin is a lone digit.
 */
export const RALLY = { height: 0.6, pitch: 0.6 } as const;

/** Describes the lines a look draws a digit's strokes in, in field units. */
export interface LookLines {
  /** How wide the strokes are. */
  readonly line: number;
  /** How wide the border round them runs, either side: none but bordered and on fire. */
  readonly border: number;
  /**
   * How wide the field's color runs round the border, either side, which
   * cuts the digits out of the flames behind them: on fire alone.
   */
  readonly cut: number;
}

/**
 * The lines each look draws its digits' strokes in, in field units: thin,
 * 0.09; bold, near half as thick again, 0.13, which the bordered digits
 * keep inside a border 0.03 wide, a CSS pixel at 24 CSS pixels a unit,
 * the least, and three at 97, the most; and on fire, a cut a little wider
 * round that, which the flames' tongues can't close over. Bordered, the
 * digits keep a tenth of a unit clear of the floor and of the danger
 * line, and their cut more than a twentieth.
 */
export const LOOK_LINES = {
  faint: { line: 0.09, border: 0, cut: 0 },
  bold: { line: 0.13, border: 0, cut: 0 },
  bordered: { line: 0.13, border: 0.03, cut: 0 },
  fire: { line: 0.13, border: 0.03, cut: 0.035 },
} as const satisfies Readonly<Record<RallyLook, LookLines>>;

/** Returns how strongly the digits show in a look, in a palette: the thin ones at the palette's part strength, the rest whole. */
export function rallyStrength(look: RallyLook, palette: WallPalette): number {
  return look === "faint" ? palette.rally.alpha : 1;
}

/** Returns the color a look fills its digits' strokes in, in a palette. */
function fillOf(look: RallyLook, palette: WallPalette): number {
  switch (look) {
    case "faint":
    case "bold":
      return palette.rally.color;
    case "bordered":
      return palette.rally.warm;
    case "fire":
      return palette.rally.hot;
  }
}

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
 * Returns the lines a look strokes each digit in, in a palette at a scale,
 * the widest first: the cut, the border, then the strokes, each a CSS pixel
 * wider either side than the one inside it at least, so a border shows on
 * the smallest field.
 */
function linesOf(
  look: RallyLook,
  palette: WallPalette,
  scale: ArtScale,
): readonly LineStyle[] {
  const { line, border, cut } = LOOK_LINES[look];
  const stroked = { color: fillOf(look, palette), width: widthOf(line, scale) };
  if (border === 0) return [stroked];
  const bordered = {
    color: palette.rally.border,
    width: stroked.width + 2 * widthOf(border, scale),
  };
  if (cut === 0) return [bordered, stroked];
  const cutOut = {
    color: palette.rally.cut,
    width: bordered.width + 2 * widthOf(cut, scale),
  };
  return [cutOut, bordered, stroked];
}

/**
 * Says how the fire behind the number on fire is drawn, in field units:
 * each tongue `@fz/phaser/fuzzball`'s flame, rising from the floor, the
 * tallest 0.8 tall, a fifth of a unit under the danger line; 0.48 wide as
 * the tongue reads a width, which roots it 0.34 wide, so tongues 0.3 apart
 * overlap at the floor and burn as one fire; and leaning 0.05 at its tip.
 */
export const FIRE = { height: 0.8, width: 0.48, lean: 0.05 } as const;

/** How much lower the tongues at the fire's ends stand than its middle's, as a share of the tallest. */
const MOUND = 0.4;

/**
 * Returns the fire's tongue, drawn in a palette at a scale about its
 * middle, its root at the frame's foot and its tip leaning right: the
 * scene stands it on the floor by its foot.
 */
function flameFrame(palette: WallPalette, scale: ArtScale): ArtFrame {
  const tall = FIRE.height * scale.unit;
  const tongue = flameTongue({
    turn: -90,
    from: 0,
    to: tall,
    width: FIRE.width * scale.unit,
    lean: FIRE.lean * scale.unit,
  });
  return centered(RALLY_FRAMES.flame, [
    polygon(placed(tongue, 1, { x: 0, y: tall / 2 }), {
      color: palette.rally.flame,
    }),
  ]);
}

/**
 * Returns the rally's frames, drawn in a palette at a scale: each digit in
 * each look, about its middle, at full strength, which the scene shows at
 * the look's, and a tongue of its fire.
 */
export function rallyFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const tall = RALLY.height * scale.unit;
  return [
    ...RALLY_LOOKS.flatMap((look) => {
      const lines = linesOf(look, palette, scale);
      return DIGITS.map((each) => {
        const strokes = GLYPHS[each].map((points) =>
          points.map(({ x, y }) => ({
            x: (x - HALF) * tall,
            y: (y - 0.5) * tall,
          })),
        );
        // Each line under the next, so no stroke's border covers another's.
        return centered(
          RALLY_FRAMES.digit(look, each),
          lines.flatMap((style) =>
            strokes.flatMap((points): readonly DrawCommand[] =>
              stroke(points, style),
            ),
          ),
        );
      });
    }),
    flameFrame(palette, scale),
  ];
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

/** The most tongues of flame the fire burns in, behind the longest rally. */
export const MOST_TONGUES = 2 * MOST_DIGITS + 1;

/** Returns how many tongues of flame burn behind a rally of some digits: one behind each digit, one between each two, and one at either end. */
export function tonguesIn(length: RallyLength): number {
  return 2 * length + 1;
}

/**
 * Returns how far across the field a tongue's root stands from the rally's
 * middle, in field units, by its place among the tongues from the left:
 * half a digit's room apart.
 */
export function tongueAcross(length: RallyLength, at: number): number {
  return ((at - length) * RALLY.pitch) / 2;
}

/**
 * Returns how tall a tongue stands at rest, as a share of the tallest, by
 * its place among the tongues from the left: tallest in the middle and
 * {@link MOUND} lower at either end, so the fire mounds behind the number.
 */
export function tongueHeight(length: RallyLength, at: number): number {
  const out = (at - length) / length;
  return 1 - MOUND * out * out;
}

/** Returns whether a tongue leans left, as those left of the middle do, so the fire spreads from it. */
export function leansLeft(length: RallyLength, at: number): boolean {
  return at < length;
}

/**
 * Where the rally's middle stands, in field units, up from the floor at
 * every depth: across the field's middle, in the floor's row, halfway
 * between the floor and the danger line, wherever the fuzzball flies. Its
 * fire's tongues rise from the floor under it.
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
