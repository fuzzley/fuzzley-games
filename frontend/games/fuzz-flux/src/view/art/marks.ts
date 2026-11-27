// A wave's mark, "×2" to "×9", drawn as shapes, since the scene draws no
// text and the announcer says the wave: a bold, round figure of the game's
// own, stroked, in the marks' color with a rim of the page's, so it reads
// over any piece, larger the more waves, as the design's grows.

import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  ORIGIN,
  type Point,
  arcPoints,
  centered,
  quadraticPoints,
  stroke,
} from "@fz/phaser/shapes";
import type { BoardPalette } from "../colors/palette";
import { SQUARE, atLeastAPixel, inPixels } from "./design_square";
import { FRAMES, TIMES, type Times } from "./frame_names";
import { rimOf } from "./rim";

/** A figure's strokes, each a line through points, in shares of its box across and down. */
type Figure = readonly (readonly Point[])[];

/** Returns the points along an oval's arc about a middle, as far across and down as given, from an angle to another, in radians clockwise from the right. */
function oval(
  middle: Point,
  across: number,
  down: number,
  from: number,
  to: number,
): readonly Point[] {
  return arcPoints(ORIGIN, 1, from, to).map(({ x, y }) => ({
    x: middle.x + x * across,
    y: middle.y + y * down,
  }));
}

/** The figure 6, whose turn is the 9. */
const SIX: Figure = [
  [
    { x: 0.86, y: 0.04 },
    ...quadraticPoints(
      { x: 0.86, y: 0.04 },
      { x: 0.1, y: 0 },
      { x: 0, y: 0.66 },
    ),
  ],
  oval({ x: 0.5, y: 0.68 }, 0.5, 0.32, 0, 2 * Math.PI),
];

/** Each count's figure. */
const FIGURES = {
  2: [
    [
      ...oval({ x: 0.5, y: 0.27 }, 0.48, 0.27, 1.1 * Math.PI, 2.2 * Math.PI),
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ],
  ],
  3: [
    [
      ...oval({ x: 0.5, y: 0.25 }, 0.44, 0.25, 1.15 * Math.PI, 2.5 * Math.PI),
      { x: 0.3, y: 0.5 },
    ],
    [
      { x: 0.3, y: 0.5 },
      ...oval({ x: 0.5, y: 0.75 }, 0.48, 0.25, 1.5 * Math.PI, 2.85 * Math.PI),
    ],
  ],
  4: [
    [
      { x: 0.72, y: 1 },
      { x: 0.72, y: 0 },
      { x: 0, y: 0.68 },
      { x: 1, y: 0.68 },
    ],
  ],
  5: [
    [
      { x: 0.9, y: 0 },
      { x: 0.14, y: 0 },
      { x: 0.08, y: 0.45 },
      ...oval({ x: 0.48, y: 0.68 }, 0.5, 0.32, -0.64 * Math.PI, 0.85 * Math.PI),
    ],
  ],
  6: SIX,
  7: [
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.32, y: 1 },
    ],
  ],
  8: [
    oval({ x: 0.5, y: 0.25 }, 0.4, 0.25, 0, 2 * Math.PI),
    oval({ x: 0.5, y: 0.72 }, 0.48, 0.28, 0, 2 * Math.PI),
  ],
  9: SIX.map((points) => points.map(({ x, y }) => ({ x: 1 - x, y: 1 - y }))),
} as const satisfies Readonly<Record<Times, Figure>>;

/**
 * Says how a mark is laid out, as shares of its figure's height: its
 * figure's width; how far either way the "×"'s arms reach from its middle,
 * and how far down its middle lies; the gap between the "×" and the
 * figure; and how wide a stroke and the rim are, the rim a CSS pixel at
 * least.
 */
const MARK = {
  figure: 0.58,
  arm: 0.2,
  timesMiddle: 0.6,
  gap: 0.3,
  line: 0.17,
  rim: 0.07,
} as const;

/** Returns how tall a count's figure is, in the design's units: the design's type for "×2" up to "×8"'s and on, its figures 0.72 of its size. */
function heightOf(times: Times): number {
  return 0.72 * SQUARE * (0.42 + 0.03 * Math.min(8, times));
}

/** Returns a count's mark in a color, the "×" and its figure, about its middle. */
function markOf(times: Times, color: number): readonly DrawCommand[] {
  const height = heightOf(times);
  const width = height * MARK.figure;
  const arm = height * MARK.arm;
  const left = 2 * arm + height * MARK.gap;
  // From the "×"'s left to the figure's right, about the middle of the two.
  const at = (x: number, y: number): Point => ({
    x: x - (left + width) / 2,
    y: y - height / 2,
  });
  const middle = { x: arm, y: height * MARK.timesMiddle };
  const style = { color, width: height * MARK.line };
  return [
    ...stroke(
      [at(middle.x - arm, middle.y - arm), at(middle.x + arm, middle.y + arm)],
      style,
    ),
    ...stroke(
      [at(middle.x - arm, middle.y + arm), at(middle.x + arm, middle.y - arm)],
      style,
    ),
    ...FIGURES[times].flatMap((points) =>
      stroke(
        points.map(({ x, y }) => at(left + x * width, y * height)),
        style,
      ),
    ),
  ];
}

/** Returns each count's mark, "×2" to "×9", in a palette at a scale, each drawn about its middle. */
export function markFrames(
  palette: BoardPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return TIMES.map((times) => {
    const mark = markOf(times, palette.marks);
    const rim = atLeastAPixel(heightOf(times) * MARK.rim, scale);
    return centered(
      FRAMES.times(times),
      inPixels([...rimOf(mark, rim, palette.page), ...mark], scale),
    );
  });
}
