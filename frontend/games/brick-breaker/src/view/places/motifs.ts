// Each place's motifs, as the uplift's places sheet draws them
// (`docs/archive/brick-breaker-uplift/art/scene.mjs`, `motif()`): a few
// shapes about a middle, sized and turned by the tile that lays them out,
// in shares of their size, stroked round at their ends and corners, as the
// sheet strokes them, but for a cog's outline, or filled.

import {
  type Area,
  type DrawCommand,
  type LineStyle,
  ORIGIN,
  type Point,
  circle,
  ellipsePoints,
  extentOf,
  placed,
  polygon,
  polyline,
  ring,
  star,
  stroke,
  turned,
} from "@fz/phaser/shapes";

/**
 * Draws one of a place's motifs about a middle, `size` device pixels across
 * as the sheet sizes it, in an ink: which of its motifs, and how far it is
 * turned, as `pick`, from 0 to 1, chooses.
 */
export type Motif = (
  middle: Point,
  size: number,
  pick: number,
  ink: number,
) => readonly DrawCommand[];

/** How wide a motif's strokes are, as a share of its size. */
const STROKE = 0.13;

/** Returns which of a place's motifs a pick chooses, of three. */
function choiceOf(pick: number): number {
  return Math.floor(pick * 3);
}

/** Returns how far a pick turns a motif, in degrees: a twelfth of a turn at a time. */
function turnOf(pick: number): number {
  return Math.floor(pick * 12) * 30;
}

/** Returns the line a motif of a size is stroked in. */
function lineOf(size: number, ink: number): LineStyle {
  return { color: ink, width: size * STROKE };
}

/** Returns points given in shares of a motif's size about its middle, turned, then sized and placed about the middle. */
function shaped(
  points: readonly Point[],
  middle: Point,
  size: number,
  degrees: number,
): readonly Point[] {
  return placed(
    points.map((point) => turned(point, degrees)),
    size,
    middle,
  );
}

/** Returns a closed outline through points, round at its corners: a line along each side, and a dot at each corner. */
function outlined(
  points: readonly Point[],
  style: LineStyle,
): readonly DrawCommand[] {
  const sides = stroke([...points, ...points.slice(0, 1)], style).filter(
    ({ kind }) => kind === "line",
  );
  return [
    ...sides,
    ...points.map((point) => circle(point, style.width / 2, style)),
  ];
}

/** Returns the point a distance from a middle at an angle, in degrees clockwise from the right. */
function polar(middle: Point, distance: number, degrees: number): Point {
  const { x, y } = turned({ x: distance, y: 0 }, degrees);
  return { x: middle.x + x, y: middle.y + y };
}

/** A toy block, square. */
const BLOCK: readonly Point[] = [
  { x: -0.4, y: -0.4 },
  { x: 0.4, y: -0.4 },
  { x: 0.4, y: 0.4 },
  { x: -0.4, y: 0.4 },
];

/** A toy wedge, a triangle on its foot. */
const WEDGE: readonly Point[] = [
  { x: 0, y: -0.46 },
  { x: 0.44, y: 0.34 },
  { x: -0.44, y: 0.34 },
];

/** The playroom's: rings, blocks and wedges. */
export const playroomMotif: Motif = (middle, size, pick, ink) => {
  const style = lineOf(size, ink);
  switch (choiceOf(pick)) {
    case 0:
      return [ring(middle, 0.42 * size, style)];
    case 1:
      return outlined(shaped(BLOCK, middle, size, turnOf(pick)), style);
    default:
      return outlined(shaped(WEDGE, middle, size, turnOf(pick)), style);
  }
};

/** How many teeth a cog has. */
const TEETH = 8;

/** How far the middle of a cog's tooth's top lies from the cog's, as a share of its size. */
const TOOTH_TOP = 0.5 * Math.cos((8 * Math.PI) / 180);

/**
 * The workshop's: a drawing board's crosses, and cogs.
 *
 * A cog's outline is one polyline, from the middle of a tooth's top round to
 * it again, mitred at its corners where the sheet rounds them, as a stroke
 * of a line and a dot for each of its 32 corners would weigh down the page's
 * mask, which writes every command out; its corners are no sharper than
 * {@link SHARPEST} for {@link coverOf}.
 */
export const workshopMotif: Motif = (middle, size, pick, ink) => {
  const style = lineOf(size, ink);
  if (choiceOf(pick) === 2) {
    const reach = 0.4 * size;
    return [
      ...stroke(
        [
          { x: middle.x - reach, y: middle.y },
          { x: middle.x + reach, y: middle.y },
        ],
        style,
      ),
      ...stroke(
        [
          { x: middle.x, y: middle.y - reach },
          { x: middle.x, y: middle.y + reach },
        ],
        style,
      ),
    ];
  }
  const turn = turnOf(pick);
  const corners = Array.from({ length: TEETH }, (_, tooth) => {
    const degrees = (360 / TEETH) * tooth + turn;
    const next = degrees + 360 / TEETH;
    return [
      polar(middle, 0.5 * size, degrees + 8),
      polar(middle, 0.36 * size, degrees + 13),
      polar(middle, 0.36 * size, next - 13),
      polar(middle, 0.5 * size, next - 8),
    ];
  }).flat();
  const top = polar(middle, TOOTH_TOP * size, turn);
  return [
    polyline([top, ...corners, top], style),
    ring(middle, 0.13 * size, style),
  ];
};

/** A pennant of bunting, hanging from its top edge. */
const PENNANT: readonly Point[] = [
  { x: -0.34, y: -0.3 },
  { x: 0.34, y: -0.3 },
  { x: 0, y: 0.4 },
];

/** The fun fair's: bunting, and stars large and small. */
export const funfairMotif: Motif = (middle, size, pick, ink) => {
  const choice = choiceOf(pick);
  if (choice === 0) {
    return outlined(
      shaped(PENNANT, middle, size, turnOf(pick)),
      lineOf(size, ink),
    );
  }
  const outer = (choice === 1 ? 0.56 : 0.36) * size;
  return [polygon(star(middle, outer, 0.14 * size, 4), { color: ink })];
};

/** A leaf, in shares of a motif's size, left of its stem's top and tilted up 32°. */
const LEAF: readonly Point[] = placed(
  ellipsePoints(ORIGIN, 0.26, 0.13).map((point) => turned(point, 32)),
  1,
  { x: -0.26, y: -0.24 },
);

/** The leaf right of the stem, the first mirrored across it. */
const RIGHT_LEAF: readonly Point[] = LEAF.map(({ x, y }) => ({ x: -x, y }));

/** The stem the leaves grow from. */
const STEM: readonly Point[] = [
  { x: 0, y: 0.5 },
  { x: 0, y: -0.1 },
];

/** The garden's: two leaves on a stem. */
export const gardenMotif: Motif = (middle, size, pick, ink) => {
  const degrees = turnOf(pick);
  return [
    ...stroke(shaped(STEM, middle, size, degrees), lineOf(size, ink)),
    polygon(shaped(LEAF, middle, size, degrees), { color: ink }),
    polygon(shaped(RIGHT_LEAF, middle, size, degrees), { color: ink }),
  ];
};

/** An arrow of a pinball table's lane, pointing up, and the one under it. */
const ARROWS: readonly (readonly Point[])[] = [
  [
    { x: -0.3, y: 0.16 },
    { x: 0, y: -0.14 },
    { x: 0.3, y: 0.16 },
  ],
  [
    { x: -0.3, y: 0.46 },
    { x: 0, y: 0.16 },
    { x: 0.3, y: 0.46 },
  ],
];

/** The arcade's: a pinball table's rings and arrows. */
export const arcadeMotif: Motif = (middle, size, pick, ink) => {
  const style = lineOf(size, ink);
  if (choiceOf(pick) === 0) {
    return [ring(middle, 0.42 * size, style), ring(middle, 0.16 * size, style)];
  }
  return ARROWS.flatMap((arrow) =>
    stroke(shaped(arrow, middle, size, turnOf(pick)), style),
  );
};

/**
 * The sharpest a motif's polyline turns at a corner, in degrees, where a
 * canvas mitres it: so sharp, the mitre reaches as far past the corner as
 * the line is wide.
 */
export const SHARPEST = 60;

/**
 * Returns the area a motif's command may cover, as `extentOf()` does, but
 * for a polyline's mitres: half its width more each way, as far as they
 * reach at corners no sharper than {@link SHARPEST}.
 */
export function coverOf(command: DrawCommand): Area {
  const { x, y, width, height } = extentOf(command);
  if (command.kind !== "polyline") return { x, y, width, height };
  const more = command.width / 2;
  return {
    x: x - more,
    y: y - more,
    width: width + 2 * more,
    height: height + 2 * more,
  };
}
