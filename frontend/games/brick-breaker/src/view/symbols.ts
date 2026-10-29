import type { CapsuleId } from "../rules/catalog/capsules";
import {
  type Area,
  type DrawCommand,
  circle,
  polygon,
  polyline,
  rect,
  share,
  star,
  within,
} from "./shapes";

/** Draws a capsule's symbol in a square, in a color, its lines a width or wider. */
export type DrawSymbol = (
  square: Area,
  color: number,
  line: number,
) => readonly DrawCommand[];

/** Returns how wide a symbol's lines are: a share of its square, and a line's width at least. */
function stroke(square: Area, line: number): number {
  return Math.max(line, square.width * 0.14);
}

/** Returns a dot at shares of a square across and down, its radius a share of the square's side. */
function dot(
  square: Area,
  across: number,
  down: number,
  radius: number,
  color: number,
): DrawCommand {
  return circle(
    square.x + across * square.width,
    square.y + down * square.height,
    radius * square.width,
    color,
  );
}

/** Each capsule's symbol, which its capsule, its tag and How to play show. */
export const SYMBOLS = {
  wide: (square, color) => [
    polygon(
      within(square, [
        [0, 0.5],
        [0.32, 0.2],
        [0.32, 0.8],
      ]),
      color,
    ),
    polygon(
      within(square, [
        [1, 0.5],
        [0.68, 0.2],
        [0.68, 0.8],
      ]),
      color,
    ),
    rect(share(square, 0.3, 0.42, 0.4, 0.16), color),
  ],
  multi: (square, color) => [
    dot(square, 0.5, 0.27, 0.16, color),
    dot(square, 0.24, 0.73, 0.16, color),
    dot(square, 0.76, 0.73, 0.16, color),
  ],
  slow: (square, color, line) => [
    polyline(
      within(square, [
        [0.15, 0.3],
        [0.5, 0.68],
        [0.85, 0.3],
      ]),
      stroke(square, line),
      color,
    ),
  ],
  life: (square, color) => [
    dot(square, 0.32, 0.36, 0.2, color),
    dot(square, 0.68, 0.36, 0.2, color),
    polygon(
      within(square, [
        [0.13, 0.44],
        [0.87, 0.44],
        [0.5, 0.88],
      ]),
      color,
    ),
  ],
  catch: (square, color, line) => [
    polyline(
      within(square, [
        [0.2, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
        [0.8, 0.2],
      ]),
      stroke(square, line),
      color,
    ),
  ],
  net: (square, color) => [rect(share(square, 0.1, 0.42, 0.8, 0.16), color)],
  laser: (square, color) => [
    rect(share(square, 0.24, 0.15, 0.14, 0.7), color),
    rect(share(square, 0.62, 0.15, 0.14, 0.7), color),
  ],
  narrow: (square, color) => [
    polygon(
      within(square, [
        [0.46, 0.5],
        [0.1, 0.2],
        [0.1, 0.8],
      ]),
      color,
    ),
    polygon(
      within(square, [
        [0.54, 0.5],
        [0.9, 0.2],
        [0.9, 0.8],
      ]),
      color,
    ),
  ],
  fire: (square, color) => [
    polygon(
      within(square, [
        [0.5, 0.05],
        [0.8, 0.5],
        [0.75, 0.8],
        [0.5, 0.95],
        [0.25, 0.8],
        [0.2, 0.5],
        [0.38, 0.35],
      ]),
      color,
    ),
  ],
  fast: (square, color, line) => [
    polyline(
      within(square, [
        [0.15, 0.5],
        [0.5, 0.15],
        [0.85, 0.5],
      ]),
      stroke(square, line),
      color,
    ),
    polyline(
      within(square, [
        [0.15, 0.85],
        [0.5, 0.5],
        [0.85, 0.85],
      ]),
      stroke(square, line),
      color,
    ),
  ],
  blast: (square, color) => [
    polygon(
      star(
        square.x + square.width / 2,
        square.y + square.height / 2,
        square.width * 0.48,
        square.width * 0.2,
        8,
      ),
      color,
    ),
  ],
} as const satisfies Readonly<Record<CapsuleId, DrawSymbol>>;
