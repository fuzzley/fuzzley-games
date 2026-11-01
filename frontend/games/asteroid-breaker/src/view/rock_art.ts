// The rocks: each kind in each size it comes in, in each of its outlines,
// with its kind's marks, and over it, once it has taken hits and held, a
// frame for how many, which every outline of its kind and size shares.

import { createRandom } from "@fz/core/random";
import { recordOf } from "@fz/core/records";
import {
  ROCK_KIND_IDS,
  ROCK_SIZES,
  type RockKindId,
  type RockSize,
  rockKind,
} from "../rules/catalog/rocks";
import { ROCK_OUTLINES, type Rock } from "../rules/rocks";
import { ROCK_RADIUS } from "../rules/tuning";
import type { BeltPalette } from "./palette";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  centered,
  circle,
  lineWidth,
  outlineWidth,
  outward,
  placed,
  polygon,
  quadraticPoints,
  scaledBy,
  stroke,
} from "./shapes";

/** Says how a kind of rock's outlines are drawn from their seeds. */
interface OutlineStyle {
  /** The fewest points an outline has. */
  readonly fewest: number;
  /** The most points an outline has. */
  readonly most: number;
  /** The least share of the radius a point lies at; each lies from there to the whole radius. */
  readonly inner: number;
  /** Whether its corners are sharp, rather than rounded through its sides' middles. */
  readonly sharp: boolean;
}

/** Describes one of a rock's outlines, in shares of its radius about its middle, and its frame's name. */
interface Outline {
  readonly name: string;
  readonly body: readonly Point[];
  /** Where its points were drawn, before any rounding, which an ice rock's facets run toward. */
  readonly corners: readonly Point[];
  /** The seed its kind's marks are placed by, drawn from afresh at each bake, so each bake places them alike. */
  readonly marks: number;
}

/** Describes a kind and size of rock as the atlas draws it: its outlines, and the names of its frames with hits taken, from one. */
interface RockSet {
  readonly kind: RockKindId;
  readonly size: RockSize;
  readonly outlines: readonly Outline[];
  readonly taken: readonly string[];
}

/** Says how a crack or a dent runs: each point's distance from a rock's middle, in shares of its radius, and its turn off the mark's angle, in radians. */
type Steps = readonly (readonly [number, number])[];

/**
 * Draws a kind of rock's marks on an outline, placed by numbers from 0 up
 * to 1 drawn from its marks' seed, in shares of its radius about its
 * middle, its lines a width in the same.
 */
type DrawMarks = (
  outline: Outline,
  random: () => number,
  palette: BeltPalette,
  line: number,
) => readonly DrawCommand[];

/** Describes how a kind of rock is drawn: its outlines, its marks, and how it shows the hits it has taken. */
interface RockArt {
  readonly style: OutlineStyle;
  readonly marks: DrawMarks;
  /**
   * How each hit it has taken and held shows, a crack or a dent, within
   * {@link MARK_REACH}, so every outline of its kind and size holds it; a
   * kind that takes one hit at every size never shows one.
   */
  readonly hit: Steps;
}

/**
 * How far from a rock's middle its marks reach, as a share of its radius,
 * so they lie on its body in every outline, whose sides come in no nearer.
 */
export const MARK_REACH = 0.6;

/** How far a point's angle may stray from its even place, as a share of the angle between two. */
const ANGLE_STRAY = 0.55;

/** How far each crack or dent a rock shows turns from the last, in radians, near the golden angle, so none lies on another. */
const HIT_TURN = 2.4;

/**
 * How far a lodestone's bands lie above and below its middle, how wide each
 * is, and how far in from its sides each ends, in shares of its radius, so
 * its ink closes each band's ends and the field's color of the band never
 * meets its outline's.
 */
const BANDS = { apart: 0.28, width: 0.14, inset: 0.1 } as const;

/** An iron rock's rivets' radius, in shares of its radius. */
const RIVET = 0.085;

/** How far a volatile rock's core reaches, in shares of its radius. */
const CORE = 0.38;

/** A rounded, uneven outline, the most rocks'. */
const ROUNDED: OutlineStyle = {
  fewest: 9,
  most: 12,
  inner: 0.78,
  sharp: false,
};

/** A smoother, rounder outline, an iron or volatile rock's. */
const SMOOTH: OutlineStyle = { fewest: 9, most: 12, inner: 0.9, sharp: false };

/** An angular outline of fewer points, sharp-cornered, ice's. */
const ANGULAR: OutlineStyle = { fewest: 7, most: 9, inner: 0.74, sharp: true };

/** Where an ice rock's facets meet, a little off its middle, in shares of its radius. */
const ICE_HEART: Point = { x: -0.08, y: -0.12 };

/** A crystal's gem, set in its stone body, in shares of its radius. */
const GEM: readonly Point[] = [
  { x: 0.05, y: -0.5 },
  { x: 0.42, y: -0.02 },
  { x: 0.05, y: 0.46 },
  { x: -0.32, y: -0.02 },
];

/** A crack's steps out from a rock's middle. */
const CRACK: Steps = [
  [0.1, 0],
  [0.32, 0.22],
  [0.47, -0.04],
  [MARK_REACH, 0.14],
];

/** A dent's steps in from a rock's side, as a hammer leaves one. */
const DENT: Steps = [
  [MARK_REACH, 0],
  [0.44, 0.2],
  [0.3, 0.5],
];

/** A volatile rock's crack's steps, out from its core. */
const CORE_CRACK: Steps = [
  [CORE + 0.08, 0],
  [0.5, 0.25],
  [MARK_REACH, 0.1],
];

/** How each kind of rock is drawn: its outlines' style, its marks, and the hits it shows taken. */
const ROCK_ART = {
  stone: {
    style: ROUNDED,
    // Two or three craters, as its first draw says.
    marks: (_, random, palette, line) =>
      craters(random, random() < 0.5 ? 2 : 3, palette.mark, line),
    hit: CRACK,
  },
  crystal: {
    style: ROUNDED,
    marks: (_, __, palette, line) => [
      polygon(outward(GEM, line), palette.mark),
      polygon(GEM, palette.rocks.crystal),
    ],
    hit: CRACK,
  },
  ice: {
    style: ANGULAR,
    // Facets from near its middle toward every other corner.
    marks: ({ corners }, _, palette, line) =>
      corners
        .filter((__, i) => i % 2 === 0)
        .map((corner) => {
          const out = MARK_REACH / Math.hypot(corner.x, corner.y);
          return stroke(
            [ICE_HEART, { x: corner.x * out, y: corner.y * out }],
            line,
            palette.mark,
          );
        })
        .flat(),
    hit: CRACK,
  },
  boulder: {
    style: ROUNDED,
    marks: (_, random, palette, line) => craters(random, 5, palette.mark, line),
    hit: CRACK,
  },
  iron: {
    style: SMOOTH,
    // Four rivets, turned as its first draw says, their edges at the marks' reach.
    marks: (_, random, palette, line) => {
      const turn = random();
      const radius = Math.max(line, RIVET);
      return Array.from({ length: 4 }, (__, i) => {
        const angle = (turn + i / 4) * 2 * Math.PI;
        return circle(
          Math.cos(angle) * (MARK_REACH - radius),
          Math.sin(angle) * (MARK_REACH - radius),
          radius,
          palette.mark,
        );
      });
    },
    hit: DENT,
  },
  volatile: {
    style: SMOOTH,
    // A glowing core, and three cracks out from it on its body, each in its own third of a turn.
    marks: (_, random, palette, line) => [
      circle(0, 0, CORE, palette.core),
      ...[0, 1, 2].flatMap((third) =>
        stroke(
          zigzag((random() + third) * ((2 * Math.PI) / 3), CORE_CRACK),
          line,
          palette.mark,
        ),
      ),
    ],
    hit: CRACK,
  },
  lodestone: {
    style: ROUNDED,
    // Two bands across it, ending short of its sides.
    marks: ({ body }, _, palette, line) =>
      [-BANDS.apart, BANDS.apart].map((middle) =>
        polygon(
          band(
            body,
            middle - BANDS.width / 2,
            middle + BANDS.width / 2,
            Math.max(line, BANDS.inset),
          ),
          palette.mark,
        ),
      ),
    hit: CRACK,
  },
} as const satisfies Readonly<Record<RockKindId, RockArt>>;

/** Holds a value for each kind of rock in each size it comes in. */
type BySize<T> = Readonly<
  Record<RockKindId, Readonly<Partial<Record<RockSize, T>>>>
>;

/** Returns a value for each kind of rock in each size it comes in. */
function bySize<T>(make: (kind: RockKindId, size: RockSize) => T): BySize<T> {
  return recordOf(ROCK_KIND_IDS, (kind) =>
    recordOf(sizesOf(kind), (size) => make(kind, size)),
  );
}

// Made once, so finding a frame's name makes nothing.
const ROCK_FRAMES = bySize(outlineNames);
/** The names of the frames over each kind and size of rock, by the hits it has taken and held, from one. */
const TAKEN_FRAMES = bySize(takenNames);

/** Every kind and size of rock, its outlines drawn once from their seeds. */
const ROCK_SETS: readonly RockSet[] = ROCK_KIND_IDS.flatMap((kind) =>
  sizesOf(kind).map((size) => ({
    kind,
    size,
    outlines: outlineNames(kind, size).map((name, outline) =>
      outlineOf(name, ROCK_ART[kind].style, seedOf(kind, size, outline)),
    ),
    taken: takenNames(kind, size),
  })),
);

/** Returns the sizes a kind of rock comes in, largest first. */
export function sizesOf(kind: RockKindId): readonly RockSize[] {
  return ROCK_SIZES.filter((size) => rockKind(kind).hits[size] !== undefined);
}

/** Returns the largest size a kind of rock comes in, which How to play pictures it at. */
export function largestOf(kind: RockKindId): RockSize {
  return (
    ROCK_SIZES.find((size) => rockKind(kind).hits[size] !== undefined) ??
    "small"
  );
}

/** Returns the hits a rock of a kind takes at a size, whole, or none at a size it doesn't come in. */
function hitsOf(kind: RockKindId, size: RockSize): number {
  return rockKind(kind).hits[size] ?? 0;
}

/** Returns the names of a kind and size of rock's frames, one for each outline. */
function outlineNames(kind: RockKindId, size: RockSize): readonly string[] {
  return Array.from(
    { length: ROCK_OUTLINES },
    (_, outline) => `rock-${kind}-${size}-${String(outline)}`,
  );
}

/** Returns the names of the frames over a kind and size of rock, one for each count of hits it can take and hold, from one. */
function takenNames(kind: RockKindId, size: RockSize): readonly string[] {
  return Array.from(
    { length: hitsOf(kind, size) - 1 },
    (_, i) => `rock-${kind}-${size}-taken-${String(i + 1)}`,
  );
}

/** Returns the name of the frame a rock is drawn in, by its kind, size and outline. */
export function rockFrame(
  rock: Pick<Rock, "kind" | "size" | "outline">,
): string {
  const name = ROCK_FRAMES[rock.kind][rock.size]?.[rock.outline];
  if (name === undefined) {
    throw new RangeError(
      `No ${rock.size} ${rock.kind} rock has outline ${String(rock.outline)}.`,
    );
  }
  return name;
}

/** Returns the name of the frame over a rock that shows the hits it has taken, or null for one that has taken none. */
export function takenFrame(
  rock: Pick<Rock, "kind" | "size" | "hits">,
): string | null {
  const taken = hitsOf(rock.kind, rock.size) - rock.hits;
  if (taken === 0) return null;
  const name = TAKEN_FRAMES[rock.kind][rock.size]?.[taken - 1];
  if (name === undefined) {
    throw new RangeError(
      `A ${rock.size} ${rock.kind} rock can't have ${String(rock.hits)} hits left.`,
    );
  }
  return name;
}

/** Returns the color a kind of rock's body is drawn in, which its shards take: a crystal's is a stone's, its gem set in it. */
export function rockColor(kind: RockKindId, palette: BeltPalette): number {
  return palette.rocks[kind === "crystal" ? "stone" : kind];
}

/** Returns every rock's frames: each kind in each size and outline, and the hits each shows taken. */
export function rockFrames(
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return ROCK_SETS.flatMap((set) => [
    ...set.outlines.map((outline) => bodyArt(set, outline, palette, scale)),
    ...takenArt(set, palette, scale),
  ]);
}

/** Returns the seed one of a kind and size of rock's outlines is drawn from. */
function seedOf(kind: RockKindId, size: RockSize, outline: number): number {
  const at =
    (ROCK_KIND_IDS.indexOf(kind) * ROCK_SIZES.length +
      ROCK_SIZES.indexOf(size)) *
      ROCK_OUTLINES +
    outline;
  return 0x5eed + at * 977;
}

/** Returns an outline drawn from a seed in a style, its farthest point at the whole radius. */
function outlineOf(name: string, style: OutlineStyle, seed: number): Outline {
  const random = createRandom(seed);
  const count =
    style.fewest + Math.floor(random() * (style.most - style.fewest + 1));
  const corners = Array.from({ length: count }, (_, i) => {
    const angle = ((i + (random() - 0.5) * ANGLE_STRAY) / count) * 2 * Math.PI;
    const out = style.inner + (1 - style.inner) * random();
    return { x: Math.cos(angle) * out, y: Math.sin(angle) * out };
  });
  const body = style.sharp ? corners : rounded(corners);
  const farthest = Math.max(
    ...body.map((point) => Math.hypot(point.x, point.y)),
  );
  return {
    name,
    body: placed(body, 1 / farthest),
    corners: placed(corners, 1 / farthest),
    marks: Math.floor(random() * 2 ** 32),
  };
}

/** Returns a closed outline rounded through its sides' middles, each corner a curve toward it. */
function rounded(corners: readonly Point[]): readonly Point[] {
  const middles = corners.map((corner, i) => {
    const next = corners[(i + 1) % corners.length] ?? corner;
    return { x: (corner.x + next.x) / 2, y: (corner.y + next.y) / 2 };
  });
  return corners.flatMap((corner, i) =>
    quadraticPoints(middles.at(i - 1) ?? corner, corner, middles[i] ?? corner),
  );
}

/** Returns a rock's craters: dots of a size, at a distance and an angle, each as it draws them, within {@link MARK_REACH}. */
function craters(
  random: () => number,
  count: number,
  color: number,
  line: number,
): readonly DrawCommand[] {
  return Array.from({ length: count }, () => {
    const radius = Math.max(line, 0.1 + 0.08 * random());
    const reach = 0.15 + random() * (MARK_REACH - 0.15 - radius);
    const turn = random() * 2 * Math.PI;
    return circle(
      Math.cos(turn) * reach,
      Math.sin(turn) * reach,
      radius,
      color,
    );
  });
}

/** Returns a zigzag from a rock's middle at an angle, through its steps. */
function zigzag(angle: number, steps: Steps): readonly Point[] {
  return steps.map(([out, turn]) => ({
    x: Math.cos(angle + turn) * out,
    y: Math.sin(angle + turn) * out,
  }));
}

/** Returns where a level line through a rock's body leaves it, left and right of its middle, nearest it. */
function chord(body: readonly Point[], y: number): readonly [number, number] {
  let left = -Infinity;
  let right = Infinity;
  body.forEach((point, i) => {
    const next = body[(i + 1) % body.length] ?? point;
    if ((point.y - y) * (next.y - y) > 0 || point.y === next.y) return;
    const x =
      point.x + ((y - point.y) * (next.x - point.x)) / (next.y - point.y);
    if (x < 0) left = Math.max(left, x);
    else right = Math.min(right, x);
  });
  return [left, right];
}

/** Returns a band across a rock's body, between two level lines, ending an inset short of its sides. */
function band(
  body: readonly Point[],
  top: number,
  bottom: number,
  inset: number,
): readonly Point[] {
  const [topLeft, topRight] = chord(body, top);
  const [bottomLeft, bottomRight] = chord(body, bottom);
  return [
    { x: topLeft + inset, y: top },
    { x: topRight - inset, y: top },
    { x: bottomRight - inset, y: bottom },
    { x: bottomLeft + inset, y: bottom },
  ];
}

/** Returns a rock's frame in one outline: outlined in the palette's outline, in its ink, with its kind's marks. */
function bodyArt(
  { kind, size }: RockSet,
  outline: Outline,
  palette: BeltPalette,
  scale: ArtScale,
): ArtFrame {
  const radius = ROCK_RADIUS[size] * scale.unit;
  const body = placed(outline.body, radius);
  return centered(outline.name, [
    polygon(outward(body, outlineWidth(scale)), palette.outline),
    polygon(body, rockColor(kind, palette)),
    ...ROCK_ART[kind]
      .marks(
        outline,
        createRandom(outline.marks),
        palette,
        lineWidth(scale) / radius,
      )
      .map((mark) => scaledBy(mark, radius)),
  ]);
}

/** Returns the frames over a kind and size of rock for each count of hits it can take and still hold, a crack or dent for each. */
function takenArt(
  { kind, size, taken }: RockSet,
  palette: BeltPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const radius = ROCK_RADIUS[size] * scale.unit;
  const line = lineWidth(scale);
  return taken.map((name, i) =>
    centered(
      name,
      Array.from({ length: i + 1 }, (_, hit) =>
        stroke(
          placed(zigzag(hit * HIT_TURN, ROCK_ART[kind].hit), radius),
          line,
          palette.mark,
        ),
      ).flat(),
    ),
  );
}
