// The fuzzballs' art: `@fz/phaser`'s fuzzball, its fur combed by its
// charge, after `fuzzball()`, `flame()` and `hotShot()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`. The player's at each charge,
// sparking at a full one; the hot shot under a crown of flame; a friend in
// each ink; and the eyes they all wear, a frame of their own that the scene
// moves the way a fuzzball looks. A triple shot's mates are the player's
// fuzzball again, in its ink and at its charge, so the triple shot is three
// of the player's frames and has none of its own.

import {
  FUZZBALL_GRID,
  FUZZBALL_STRANDS,
  type Strand,
  eyesCommands,
  fuzzballCommands,
} from "@fz/phaser/fuzzball";
import {
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type LineStyle,
  type Point,
  centered,
  placed,
  polygon,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { Charge } from "../../rules/shot";
import { MOST_CHARGE } from "../../rules/tuning";
import type { WallPalette } from "../colors/palette";
import { CHARGES, FRAMES, INKS } from "./frames";
import { itemAt } from "../items";
import { turned } from "./symbols";

/**
 * How wide the fuzzball's grid is drawn, in field units, as the art draws
 * it, a fortieth of a cell to a unit of the grid: its body 0.26 units
 * round, about a fuzzball's `RADIUS`, and its fur past that.
 */
const FUZZBALL_SIDE = 0.8;

/** How much longer a strand of fur grows at a full charge than at none, as a share of its length. */
const FULL_GROWTH = 0.3;

/**
 * The share of a full charge by which the fur has combed straight, so it
 * is straight from charge 3, as the art's half-charged look is.
 */
const STRAIGHT_BY = 0.5;

/**
 * How wide every fuzzball's outline is, in field units. It is the mark,
 * the field's color, so it shows only where a fuzzball crosses something.
 */
const OUTLINE_WIDTH = 0.03;

/** How wide a spark's line is, in field units: a unit of the fuzzball's grid. */
const SPARK_WIDTH = FUZZBALL_SIDE / FUZZBALL_GRID;

/** Which way each of a full charge's sparks lies from the body's middle, in degrees clockwise from its right. */
const SPARK_TURNS = [-58, 8, 62, 148, 212] as const;

/** How far from the body's middle a spark starts, on the fuzzball's grid, every other one a little further out. */
const SPARK_FROM = [16.4, 17] as const;

/** A spark's zigzag from where it starts, lying to the right, on the fuzzball's grid. */
const ZIGZAG: readonly Point[] = [
  { x: 0, y: -0.4 },
  { x: 1.7, y: -1.5 },
  { x: 1.5, y: 1.1 },
  { x: 3.6, y: 0 },
];

/** Describes a tongue of the hot shot's flame, on the fuzzball's grid. */
interface Flame {
  /** Which way it points from the body's middle, in degrees clockwise from its right. */
  readonly turn: number;
  /** How far its tip is from the body's middle. */
  readonly to: number;
  /** What its width is drawn to: 0.7 of it at its root, swelling to about five sixths of it, then narrowing to its tip. */
  readonly width: number;
  /** How far its tip leans aside, clockwise. */
  readonly lean: number;
}

/** The hot shot's crown of flame, from its left to its right. */
const FLAMES: readonly Flame[] = [
  { turn: -129, to: 20, width: 8.6, lean: 3 },
  { turn: -104, to: 24, width: 9.6, lean: 1.2 },
  { turn: -78, to: 21.6, width: 9, lean: -2.6 },
  { turn: -53, to: 19.2, width: 8.2, lean: -3 },
];

/** How far from the body's middle a tongue of flame rises, from behind the body, on the fuzzball's grid. */
const FLAME_FROM = 11.5;

/** How many steps each side of a tongue of flame takes from its root to its tip. */
const FLAME_STEPS = 8;

/**
 * Returns a strand of the fuzzball's fur combed by a share of a full
 * charge: turned from its own way toward straight out from the body's
 * middle through its root, grown longer, and bent less, so at a full
 * charge it stands on end. Its root stays where it grew.
 */
function combed({ from, control, to }: Strand, share: number): Strand {
  const chord = { x: to.x - from.x, y: to.y - from.y };
  const length = Math.hypot(chord.x, chord.y);
  const root = Math.hypot(from.x, from.y);
  const way = {
    x: (chord.x / length) * (1 - share) + (from.x / root) * share,
    y: (chord.y / length) * (1 - share) + (from.y / root) * share,
  };
  const reach = (length * (1 + FULL_GROWTH * share)) / Math.hypot(way.x, way.y);
  const grown = { x: way.x * reach, y: way.y * reach };
  // The control as shares of the chord, along it and aside it, kept as the
  // chord turns and grows, with the bend it gives eased away.
  const bent = { x: control.x - from.x, y: control.y - from.y };
  const along = (bent.x * chord.x + bent.y * chord.y) / length ** 2;
  const aside = (chord.x * bent.y - chord.y * bent.x) / length ** 2;
  const bend = aside * Math.max(0, 1 - share / STRAIGHT_BY);
  return {
    from,
    control: {
      x: from.x + grown.x * along - grown.y * bend,
      y: from.y + grown.y * along + grown.x * bend,
    },
    to: { x: from.x + grown.x, y: from.y + grown.y },
  };
}

/** The fur at each charge, made once: the fuzzball's own at 0, standing on end at 5. */
const FUR: readonly (readonly Strand[])[] = CHARGES.map((charge) =>
  FUZZBALL_STRANDS.map((strand) => combed(strand, charge / MOST_CHARGE)),
);

/** A full charge's sparks, each a zigzag's points about the body's middle, on the fuzzball's grid. */
const SPARKS: readonly (readonly Point[])[] = SPARK_TURNS.map((degrees, i) => {
  const from = itemAt(SPARK_FROM, i % SPARK_FROM.length);
  return ZIGZAG.map(({ x, y }) => turned({ x: from + x, y }, degrees));
});

/**
 * Returns a tongue of flame as a polygon's points about the body's middle,
 * on the fuzzball's grid: it rises from behind the body, swells, then leans
 * as it narrows to its tip.
 */
function tongue({ turn, to, width, lean }: Flame): readonly Point[] {
  const left: Point[] = [];
  const right: Point[] = [];
  for (let step = 0; step <= FLAME_STEPS; step++) {
    const t = step / FLAME_STEPS;
    const along = FLAME_FROM + (to - FLAME_FROM) * t;
    const half =
      (width / 2) * (1 - t) ** 1.2 * (0.7 + 0.65 * Math.sin(Math.PI * t));
    left.push({ x: along, y: lean * t * t - half });
    right.push({ x: along, y: lean * t * t + half });
  }
  return [...left, ...right.reverse().slice(1)].map((point) =>
    turned(point, turn),
  );
}

/** The hot shot's tongues of flame, made once, on the fuzzball's grid. */
const TONGUES: readonly (readonly Point[])[] = FLAMES.map(tongue);

/**
 * Returns how many device pixels a unit of the fuzzball's grid is drawn
 * at, so a scene moves a fuzzball's eyes by `FUZZBALL_LOOK` times this the
 * way it looks.
 */
export function fuzzballGrid(scale: ArtScale): number {
  return (scale.unit * FUZZBALL_SIDE) / FUZZBALL_GRID;
}

/**
 * Returns the fuzzball's fur at a charge: the fuzzball's own at 0, combed
 * straighter and longer with each charge, and on end at 5.
 *
 * @throws {RangeError} for a charge past the most.
 */
export function furOf(charge: Charge): readonly Strand[] {
  return itemAt(FUR, charge);
}

/** Says what a fuzzball is drawn in: its color, the charge its fur is combed to, and its outline. */
interface FuzzballLook {
  readonly color: number;
  readonly charge: Charge;
  readonly outline: LineStyle;
}

/**
 * Describes what a fuzzball wears: the outlines of its parts, the parts
 * that lie beneath its body and fur, and those that lie over them.
 */
interface Worn {
  readonly outlines: readonly DrawCommand[];
  readonly beneath?: readonly DrawCommand[];
  readonly over?: readonly DrawCommand[];
}

/** What a fuzzball wears that wears nothing. */
const NOTHING_WORN: Worn = { outlines: [] };

/**
 * Returns a fuzzball about its body's middle, `by` device pixels to a unit
 * of its grid, outlined as one with what it wears: its outline, then the
 * outlines of what it wears, then what lies beneath its body, then its
 * body and fur, then what lies over them, so no outline covers any of it.
 */
function outlinedWith(
  by: number,
  { color, charge, outline }: FuzzballLook,
  { outlines, beneath = [], over = [] }: Worn = NOTHING_WORN,
): readonly DrawCommand[] {
  const fur = furOf(charge);
  const body = fuzzballCommands(by, { color, fur });
  const whole = fuzzballCommands(by, { color, outline, fur });
  return [
    // The fuzzball draws its outline first, all of it, then its body.
    ...whole.slice(0, whole.length - body.length),
    ...outlines,
    ...beneath,
    ...body,
    ...over,
  ];
}

/**
 * Returns a line in the outline's color along each of a part's lines, as
 * wide as the part's own line, 0 for a filled part's edge, and the
 * outline's width more either side.
 */
function outlinesOf(
  lines: readonly (readonly Point[])[],
  outline: LineStyle,
  width: number,
): readonly DrawCommand[] {
  return lines.flatMap((points) =>
    stroke(points, { color: outline.color, width: width + 2 * outline.width }),
  );
}

/**
 * Returns the fuzzballs' frames in a palette at a scale, each about its
 * body's middle: the player's at each charge, the hot shot, a friend in
 * each ink, and the eyes. Every fuzzball is outlined in the mark, as one
 * with its sparks or flames.
 */
export function fuzzballFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const by = fuzzballGrid(scale);
  const outline: LineStyle = {
    color: palette.mark,
    width: widthOf(OUTLINE_WIDTH, scale),
  };
  const spark: LineStyle = {
    color: palette.spark,
    width: widthOf(SPARK_WIDTH, scale),
  };
  const zigzags = SPARKS.map((points) => placed(points, by));
  const tongues = TONGUES.map((points) => placed(points, by));
  const sparks: Worn = {
    outlines: outlinesOf(zigzags, outline, spark.width),
    over: zigzags.flatMap((points) => stroke(points, spark)),
  };
  // The hot shot's tongues of flame lie behind it, each tongue's outline a
  // closed line round it.
  const flames: Worn = {
    outlines: outlinesOf(
      tongues.map((points) => [...points, ...points.slice(0, 1)]),
      outline,
      0,
    ),
    beneath: tongues.map((points) => polygon(points, { color: palette.spark })),
  };
  return [
    ...CHARGES.map((charge) =>
      centered(
        FRAMES.fuzzball(charge),
        outlinedWith(
          by,
          { color: palette.fuzzball, charge, outline },
          charge === MOST_CHARGE ? sparks : NOTHING_WORN,
        ),
      ),
    ),
    centered(
      FRAMES.hotShot,
      outlinedWith(
        by,
        { color: palette.hotShot, charge: MOST_CHARGE, outline },
        flames,
      ),
    ),
    ...INKS.map((ink) =>
      centered(
        FRAMES.friend(ink),
        outlinedWith(by, {
          color: itemAt(palette.friends, ink),
          charge: 0,
          outline,
        }),
      ),
    ),
    centered(FRAMES.eyes, eyesCommands(by, { color: palette.mark })),
  ];
}
