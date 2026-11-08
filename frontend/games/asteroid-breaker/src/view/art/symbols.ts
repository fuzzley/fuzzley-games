import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  arcPoints,
  discIn,
  placed,
  polygon,
  rimIn,
  shifted,
  stroke,
  symbolLineStyle,
} from "@fz/phaser/shapes";
import type { PickupId } from "../../rules/catalog/pickups";
import type { DeckButton } from "../steering/deck";
import { fuzzballCommands } from "./pilot_art";

/**
 * Draws a symbol in a square, in a style, its lines its width or wider, on a
 * ground of another color, which a few of its parts take.
 */
export type DrawSymbol = (
  square: Area,
  style: LineStyle,
  ground: number,
) => readonly DrawCommand[];

/** How far the Extra ship's window reaches, how wide its pilot is and how far below the middle it sits, as shares of the square's side. */
const WINDOW = { radius: 0.56, pilot: 1.3, drop: 0.03 } as const;

/** Returns points given about a square's middle, in shares of its side, as device pixels. */
function about(
  square: Area,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  return placed(
    shares.map(([x, y]) => ({ x, y })),
    square.width,
    { x: square.x + square.width / 2, y: square.y + square.height / 2 },
  );
}

/** Returns a line through points given about a square's middle, in shares of its side, round at its ends and corners. */
function lineAbout(
  square: Area,
  shares: readonly (readonly [number, number])[],
  style: LineStyle,
): readonly DrawCommand[] {
  return stroke(about(square, shares), style);
}

/** Returns lines out from a square's middle, one for each of a number of angles about it, between two shares of its side. */
function rays(
  square: Area,
  count: number,
  from: number,
  to: number,
  style: LineStyle,
): readonly DrawCommand[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    return lineAbout(
      square,
      [
        [x * from, y * from],
        [x * to, y * to],
      ],
      style,
    );
  }).flat();
}

/** Each pickup's symbol, which its pickup, its tag and How to play show, and each button's on the deck. */
export const SYMBOLS = {
  spread: (square, style) => {
    const pen = symbolLineStyle(square, style);
    return [
      ...lineAbout(
        square,
        [
          [0, 0.42],
          [-0.4, -0.34],
        ],
        pen,
      ),
      ...lineAbout(
        square,
        [
          [0, 0.42],
          [0, -0.44],
        ],
        pen,
      ),
      ...lineAbout(
        square,
        [
          [0, 0.42],
          [0.4, -0.34],
        ],
        pen,
      ),
    ];
  },
  rapid: (square, style) => {
    const pen = symbolLineStyle(square, style);
    return [
      ...lineAbout(
        square,
        [
          [-0.34, 0.02],
          [0, -0.32],
          [0.34, 0.02],
        ],
        pen,
      ),
      ...lineAbout(
        square,
        [
          [-0.34, 0.38],
          [0, 0.04],
          [0.34, 0.38],
        ],
        pen,
      ),
    ];
  },
  shield: (square, style) => [
    rimIn(square, 0.4, symbolLineStyle(square, style)),
    discIn(square, 0.14, style),
  ],
  // A pilot in its window, as the pickup gives one more ship to fly.
  ship: (square, style, ground) => [
    discIn(square, WINDOW.radius, style),
    ...fuzzballCommands(WINDOW.pilot * square.width, ground).map((command) =>
      shifted(command, {
        x: square.x + square.width / 2,
        y: square.y + square.height / 2 + WINDOW.drop * square.width,
      }),
    ),
  ],
  lance: (square, style) => {
    const pen = symbolLineStyle(square, style);
    return [
      rimIn(square, 0.26, pen),
      ...lineAbout(
        square,
        [
          [-0.5, 0],
          [0.5, 0],
        ],
        pen,
      ),
      ...lineAbout(
        square,
        [
          [0.3, -0.18],
          [0.5, 0],
          [0.3, 0.18],
        ],
        pen,
      ),
    ];
  },
  // A horseshoe, its ends up.
  magnet: (square, style) =>
    lineAbout(
      square,
      [
        [-0.3, -0.4],
        ...arcPoints({ x: 0, y: 0.04 }, 0.3, Math.PI, 0).map(
          ({ x, y }) => [x, y] as const,
        ),
        [0.3, -0.4],
      ],
      symbolLineStyle(square, style),
    ),
  // An hourglass.
  slow: (square, style) => [
    polygon(
      about(square, [
        [-0.3, -0.42],
        [0.3, -0.42],
        [0, 0],
      ]),
      style,
    ),
    polygon(
      about(square, [
        [0, 0],
        [0.3, 0.42],
        [-0.3, 0.42],
      ]),
      style,
    ),
  ],
  nova: (square, style) =>
    rays(square, 8, 0.16, 0.46, symbolLineStyle(square, style)),
  fire: (square, style) => {
    const pen = symbolLineStyle(square, style);
    return [rimIn(square, 0.3, pen), ...rays(square, 4, 0.18, 0.5, pen)];
  },
  dash: (square, style) => {
    const pen = symbolLineStyle(square, style);
    return [
      ...lineAbout(
        square,
        [
          [-0.38, -0.32],
          [-0.04, 0],
          [-0.38, 0.32],
        ],
        pen,
      ),
      ...lineAbout(
        square,
        [
          [0.04, -0.32],
          [0.38, 0],
          [0.04, 0.32],
        ],
        pen,
      ),
    ];
  },
} as const satisfies Readonly<Record<PickupId | DeckButton, DrawSymbol>>;
