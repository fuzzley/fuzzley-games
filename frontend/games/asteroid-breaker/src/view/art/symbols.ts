import {
  type Area,
  type DrawCommand,
  type LineStyle,
  type Point,
  line,
  polygon,
  rimIn,
  stroke,
  symbolLineStyle,
} from "@fz/phaser/shapes";
import type { PickupId } from "../../rules/catalog/pickups";
import type { DeckButton } from "../steering/deck";
import { turnedBy } from "./rocks/space";
import { outward } from "./shapes";

/**
 * Says what a symbol is drawn in: its color and the least its lines are
 * wide, in device pixels, and, where it lies on something, that thing's
 * color and the least a cut through it in that color is wide.
 */
export interface SymbolStyle extends LineStyle {
  readonly ground?: { readonly color: number; readonly width: number };
}

/** Draws a symbol in a square, in a style, its lines its width or wider. */
export type DrawSymbol = (
  square: Area,
  style: SymbolStyle,
) => readonly DrawCommand[];

/** A point written as a pair, across and down, in shares of a symbol's square about its middle. */
type Share = readonly [number, number];

/** Points written as pairs, as {@link Share}s are. */
type Shares = readonly Share[];

/** Returns a point given about a square's middle, in shares of its side, as device pixels. */
function pointAbout(square: Area, [x, y]: Share): Point {
  return {
    x: square.x + square.width / 2 + x * square.width,
    y: square.y + square.height / 2 + y * square.width,
  };
}

/** Returns points given about a square's middle, in shares of its side, as device pixels. */
function about(square: Area, shares: Shares): readonly Point[] {
  return shares.map((share) => pointAbout(square, share));
}

/** Returns a line through points given about a square's middle, in shares of its side, round at its ends and corners. */
function lineAbout(
  square: Area,
  shares: Shares,
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

/** Describes a line of a symbol: its points and how wide it is, a share of its square. */
interface SymbolLine {
  readonly points: Shares;
  readonly width: number;
}

/** Describes a cut through a symbol: its ends and how wide it is, a share of its square. */
interface SymbolCut {
  readonly from: Share;
  readonly to: Share;
  readonly width: number;
}

/**
 * Describes a pickup's symbol as the kit cuts it (`makeSymbol()` in
 * `art/lib/things.mjs`), in shares of its square about its middle.
 */
interface SymbolShape {
  /** Lines drawn round at their ends and corners. */
  readonly lines: readonly SymbolLine[];
  /** Shapes filled, their edges a little grown, as the kit strokes them thinly. */
  readonly fills: readonly Shares[];
  /** Lines cut through it in the color under it, square at their ends. */
  readonly cuts: readonly SymbolCut[];
}

/** How far a symbol's fills are grown past their edges, a share of its square, as the kit strokes them. */
const FILL_GROWTH = 0.015;

/** Returns a pair turned about the origin by an angle, in radians. */
function tilted([x, y]: Share, angle: number): Share {
  const turned = turnedBy({ x, y }, angle);
  return [turned.x, turned.y];
}

/** Returns a symbol cut as the kit cuts it drawn in a square: its fills, its lines, then its cuts where it lies on something. */
function drawnSymbol(shape: SymbolShape): DrawSymbol {
  return (square, style) => {
    const side = square.width;
    const fills = shape.fills.map((points) =>
      polygon(outward(about(square, points), FILL_GROWTH * side), style),
    );
    const lines = shape.lines.flatMap(({ points, width }) =>
      lineAbout(square, points, {
        color: style.color,
        width: Math.max(style.width, width * side),
      }),
    );
    const { ground } = style;
    const cuts = ground
      ? shape.cuts.map(({ from, to, width }) =>
          line(pointAbout(square, from), pointAbout(square, to), {
            color: ground.color,
            width: Math.max(ground.width, width * side),
          }),
        )
      : [];
    return [...fills, ...lines, ...cuts];
  };
}

/** A magnet's shoe, from its left end round to its right, before it is tilted. */
const SHOE: Shares = [
  [-0.27, -0.36],
  ...Array.from({ length: 9 }, (_, i) => {
    const angle = Math.PI - (i / 8) * Math.PI;
    return [0.27 * Math.cos(angle), 0.08 + 0.27 * Math.sin(angle)] as const;
  }),
  [0.27, -0.36],
];

/** How far a magnet's shoe is tilted, in radians. */
const SHOE_TILT = 0.62;

/**
 * Each pickup's symbol, as the kit cuts it, a silhouette of its own that
 * holds at nine pixels, which its orb, its tag and How to play show: three
 * bolts fanning apart, two roofs, a crest, a slanted arrow through a bar, a
 * tilted horseshoe and an hourglass; and each button's on the deck.
 */
export const SYMBOLS = {
  spread: drawnSymbol({
    lines: [
      {
        points: [
          [-0.1, 0.36],
          [-0.4, -0.2],
        ],
        width: 0.1,
      },
      {
        points: [
          [0, 0.38],
          [0, -0.36],
        ],
        width: 0.1,
      },
      {
        points: [
          [0.1, 0.36],
          [0.4, -0.2],
        ],
        width: 0.1,
      },
      {
        points: [
          [-0.33, -0.08],
          [-0.42, -0.25],
        ],
        width: 0.24,
      },
      {
        points: [
          [0, -0.22],
          [0, -0.41],
        ],
        width: 0.24,
      },
      {
        points: [
          [0.33, -0.08],
          [0.42, -0.25],
        ],
        width: 0.24,
      },
    ],
    fills: [],
    cuts: [],
  }),
  rapid: drawnSymbol({
    lines: [
      {
        points: [
          [-0.36, -0.02],
          [0, -0.38],
          [0.36, -0.02],
        ],
        width: 0.17,
      },
      {
        points: [
          [-0.36, 0.4],
          [0, 0.04],
          [0.36, 0.4],
        ],
        width: 0.17,
      },
    ],
    fills: [],
    cuts: [],
  }),
  shield: drawnSymbol({
    lines: [],
    fills: [
      [
        [-0.4, -0.42],
        [0.4, -0.42],
        [0.4, 0],
        [0.35, 0.19],
        [0.21, 0.35],
        [0, 0.47],
        [-0.21, 0.35],
        [-0.35, 0.19],
        [-0.4, 0],
      ],
    ],
    cuts: [],
  }),
  lance: drawnSymbol({
    lines: [
      {
        points: [
          [-0.42, 0.42],
          [0.2, -0.2],
        ],
        width: 0.16,
      },
      {
        points: [
          [-0.36, -0.04],
          [0.04, 0.36],
        ],
        width: 0.15,
      },
    ],
    fills: [
      [
        [0.48, -0.48],
        [0, -0.36],
        [0.36, 0],
      ],
    ],
    cuts: [],
  }),
  magnet: drawnSymbol({
    lines: [
      { points: SHOE.map((share) => tilted(share, SHOE_TILT)), width: 0.21 },
    ],
    fills: [],
    cuts: [
      {
        from: tilted([-0.42, -0.2], SHOE_TILT),
        to: tilted([-0.12, -0.2], SHOE_TILT),
        width: 0.065,
      },
      {
        from: tilted([0.12, -0.2], SHOE_TILT),
        to: tilted([0.42, -0.2], SHOE_TILT),
        width: 0.065,
      },
    ],
  }),
  slow: drawnSymbol({
    lines: [
      {
        points: [
          [-0.34, -0.43],
          [0.34, -0.43],
        ],
        width: 0.13,
      },
      {
        points: [
          [-0.34, 0.43],
          [0.34, 0.43],
        ],
        width: 0.13,
      },
    ],
    fills: [
      [
        [-0.3, -0.36],
        [0.3, -0.36],
        [0.03, 0.02],
        [-0.03, 0.02],
      ],
      [
        [-0.03, -0.02],
        [0.03, -0.02],
        [0.3, 0.36],
        [-0.3, 0.36],
      ],
    ],
    cuts: [],
  }),
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
