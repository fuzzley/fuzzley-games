import {
  type Area,
  type DrawCommand,
  type Point,
  circle,
  polygon,
  ring,
} from "@fz/phaser/shapes";
import type { PickupId } from "../rules/catalog/pickups";
import type { DeckButton } from "./deck";
import { fuzzballCommands } from "./pilot_art";
import { arcPoints, placed, shifted, stroke } from "./shapes";

/** Draws a symbol in a square, in a color, its lines a width or wider, on a ground of another color, which a few of its parts take. */
export type DrawSymbol = (
  square: Area,
  color: number,
  line: number,
  ground: number,
) => readonly DrawCommand[];

/** How wide a symbol's lines are, as a share of its square's side. */
const STROKE = 0.14;

/** How far the Extra ship's window reaches, how wide its pilot is and how far below the middle it sits, as shares of the square's side. */
const WINDOW = { radius: 0.56, pilot: 1.3, drop: 0.03 } as const;

/** Returns how wide a symbol's lines are: a share of its square, and a line's width at least. */
function thickness(square: Area, line: number): number {
  return Math.max(line, square.width * STROKE);
}

/** Returns points given about a square's middle, in shares of its side, as device pixels. */
function about(
  square: Area,
  shares: readonly (readonly [number, number])[],
): readonly Point[] {
  return placed(
    shares.map(([x, y]) => ({ x, y })),
    square.width,
    square.x + square.width / 2,
    square.y + square.height / 2,
  );
}

/** Returns a line through points given about a square's middle, in shares of its side, round at its ends and corners. */
function lineAbout(
  square: Area,
  width: number,
  color: number,
  shares: readonly (readonly [number, number])[],
): readonly DrawCommand[] {
  return stroke(about(square, shares), width, color);
}

/** Returns a circle's outline about a square's middle, its radius a share of the square's side. */
function rim(
  square: Area,
  radius: number,
  width: number,
  color: number,
): DrawCommand {
  return ring(
    square.x + square.width / 2,
    square.y + square.height / 2,
    radius * square.width,
    width,
    color,
  );
}

/** Returns a disc about a square's middle, its radius a share of the square's side. */
function disc(square: Area, radius: number, color: number): DrawCommand {
  return circle(
    square.x + square.width / 2,
    square.y + square.height / 2,
    radius * square.width,
    color,
  );
}

/** Returns lines out from a square's middle, one for each of a number of angles about it, between two shares of its side. */
function rays(
  square: Area,
  width: number,
  color: number,
  count: number,
  from: number,
  to: number,
): readonly DrawCommand[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    return lineAbout(square, width, color, [
      [x * from, y * from],
      [x * to, y * to],
    ]);
  }).flat();
}

/** Each pickup's symbol, which its pickup, its tag and How to play show, and each button's on the deck. */
export const SYMBOLS = {
  spread: (square, color, width) => {
    const thick = thickness(square, width);
    return [
      ...lineAbout(square, thick, color, [
        [0, 0.42],
        [-0.4, -0.34],
      ]),
      ...lineAbout(square, thick, color, [
        [0, 0.42],
        [0, -0.44],
      ]),
      ...lineAbout(square, thick, color, [
        [0, 0.42],
        [0.4, -0.34],
      ]),
    ];
  },
  rapid: (square, color, width) => {
    const thick = thickness(square, width);
    return [
      ...lineAbout(square, thick, color, [
        [-0.34, 0.02],
        [0, -0.32],
        [0.34, 0.02],
      ]),
      ...lineAbout(square, thick, color, [
        [-0.34, 0.38],
        [0, 0.04],
        [0.34, 0.38],
      ]),
    ];
  },
  shield: (square, color, width) => [
    rim(square, 0.4, thickness(square, width), color),
    disc(square, 0.14, color),
  ],
  // A pilot in its window, as the pickup gives one more ship to fly.
  ship: (square, color, _, ground) => [
    disc(square, WINDOW.radius, color),
    ...fuzzballCommands(WINDOW.pilot * square.width, ground).map((command) =>
      shifted(
        command,
        square.x + square.width / 2,
        square.y + square.height / 2 + WINDOW.drop * square.width,
      ),
    ),
  ],
  lance: (square, color, width) => {
    const thick = thickness(square, width);
    return [
      rim(square, 0.26, thick, color),
      ...lineAbout(square, thick, color, [
        [-0.5, 0],
        [0.5, 0],
      ]),
      ...lineAbout(square, thick, color, [
        [0.3, -0.18],
        [0.5, 0],
        [0.3, 0.18],
      ]),
    ];
  },
  // A horseshoe, its ends up.
  magnet: (square, color, width) =>
    lineAbout(square, thickness(square, width), color, [
      [-0.3, -0.4],
      ...arcPoints(0, 0.04, 0.3, Math.PI, 0).map(({ x, y }) => [x, y] as const),
      [0.3, -0.4],
    ]),
  // An hourglass.
  slow: (square, color) => [
    polygon(
      about(square, [
        [-0.3, -0.42],
        [0.3, -0.42],
        [0, 0],
      ]),
      color,
    ),
    polygon(
      about(square, [
        [0, 0],
        [0.3, 0.42],
        [-0.3, 0.42],
      ]),
      color,
    ),
  ],
  nova: (square, color, width) =>
    rays(square, thickness(square, width), color, 8, 0.16, 0.46),
  fire: (square, color, width) => {
    const thick = thickness(square, width);
    return [
      rim(square, 0.3, thick, color),
      ...rays(square, thick, color, 4, 0.18, 0.5),
    ];
  },
  dash: (square, color, width) => {
    const thick = thickness(square, width);
    return [
      ...lineAbout(square, thick, color, [
        [-0.38, -0.32],
        [-0.04, 0],
        [-0.38, 0.32],
      ]),
      ...lineAbout(square, thick, color, [
        [0.04, -0.32],
        [0.38, 0],
        [0.04, 0.32],
      ]),
    ];
  },
} as const satisfies Readonly<Record<PickupId | DeckButton, DrawSymbol>>;
