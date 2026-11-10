import {
  type Area,
  type DrawCommand,
  type LineStyle,
  dotIn,
  polygon,
  polyline,
  rect,
  share,
  star,
  symbolLineStyle,
  within,
} from "@fz/phaser/shapes";
import type { CapsuleId } from "../../rules/catalog/capsules";

/** Draws a capsule's symbol in a square, in a style, its lines its width or wider. */
export type DrawSymbol = (
  square: Area,
  style: LineStyle,
) => readonly DrawCommand[];

/** Each capsule's symbol, which its capsule, its tag and How to play show. */
export const SYMBOLS = {
  wide: (square, style) => [
    polygon(
      within(square, [
        [0, 0.5],
        [0.32, 0.2],
        [0.32, 0.8],
      ]),
      style,
    ),
    polygon(
      within(square, [
        [1, 0.5],
        [0.68, 0.2],
        [0.68, 0.8],
      ]),
      style,
    ),
    rect(share(square, 0.3, 0.42, 0.4, 0.16), style),
  ],
  multi: (square, style) => [
    dotIn(square, { x: 0.5, y: 0.27 }, 0.16, style),
    dotIn(square, { x: 0.24, y: 0.73 }, 0.16, style),
    dotIn(square, { x: 0.76, y: 0.73 }, 0.16, style),
  ],
  slow: (square, style) => [
    polyline(
      within(square, [
        [0.15, 0.3],
        [0.5, 0.68],
        [0.85, 0.3],
      ]),
      symbolLineStyle(square, style),
    ),
  ],
  life: (square, style) => [
    dotIn(square, { x: 0.32, y: 0.36 }, 0.2, style),
    dotIn(square, { x: 0.68, y: 0.36 }, 0.2, style),
    polygon(
      within(square, [
        [0.13, 0.44],
        [0.87, 0.44],
        [0.5, 0.88],
      ]),
      style,
    ),
  ],
  catch: (square, style) => [
    polyline(
      within(square, [
        [0.2, 0.2],
        [0.2, 0.8],
        [0.8, 0.8],
        [0.8, 0.2],
      ]),
      symbolLineStyle(square, style),
    ),
  ],
  net: (square, style) => [rect(share(square, 0.1, 0.42, 0.8, 0.16), style)],
  laser: (square, style) => [
    rect(share(square, 0.24, 0.15, 0.14, 0.7), style),
    rect(share(square, 0.62, 0.15, 0.14, 0.7), style),
  ],
  narrow: (square, style) => [
    polygon(
      within(square, [
        [0.46, 0.5],
        [0.1, 0.2],
        [0.1, 0.8],
      ]),
      style,
    ),
    polygon(
      within(square, [
        [0.54, 0.5],
        [0.9, 0.2],
        [0.9, 0.8],
      ]),
      style,
    ),
  ],
  fire: (square, style) => [
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
      style,
    ),
  ],
  fast: (square, style) => [
    polyline(
      within(square, [
        [0.15, 0.5],
        [0.5, 0.15],
        [0.85, 0.5],
      ]),
      symbolLineStyle(square, style),
    ),
    polyline(
      within(square, [
        [0.15, 0.85],
        [0.5, 0.5],
        [0.85, 0.85],
      ]),
      symbolLineStyle(square, style),
    ),
  ],
  blast: (square, style) => [
    polygon(
      star(
        { x: square.x + square.width / 2, y: square.y + square.height / 2 },
        square.width * 0.48,
        square.width * 0.2,
        8,
      ),
      style,
    ),
  ],
} as const satisfies Readonly<Record<CapsuleId, DrawSymbol>>;
