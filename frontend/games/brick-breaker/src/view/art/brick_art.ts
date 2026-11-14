// Each kind of brick, in each tint and state, on `@fz/phaser/bricks`' slab
// (`BRICK_SLAB`), as `docs/brick-breaker-uplift/art/bricks.svg` draws it:
// a plain brick's lip and strip, a tough brick's pips cut out and a crack
// for each hit taken, steel's frame, rivets and sheen, the blast brick's
// bomb and a dot toward each brick it reaches, the gift's parcel and bow, a
// hidden ghost's round dashes and faint eyes or a shown one's body under a
// scalloped hem, and earth under a cap of moss, and the ring a broken one
// fills as it grows back (`regrowing()`); and Friends' kinds, as its section
// C draws them: a plated brick's pips over a plate of steel along its foot,
// the brick cut away round it, with teeth pointing down, a cage's bars, one
// bent once it is hit, over the friend it frees next, a key on gold, and a
// gate's keyhole between gold ends. Every number is the art kit's (`art/kit.mjs`), in its
// box of 200 by 100, drawn at the brick's height over 100, but where a
// constant's comment here says otherwise. A brick under 30 CSS px wide
// leaves out its cracks, rivets and sheen, a plate's shine and a caged
// friend's fur (`showsDetail()`).

import { clamp } from "@fz/core/math";
import {
  BRICK_SLAB,
  type CageBars,
  type CageLook,
  bombMark,
  cageBars,
  cagedFriend,
  plateTeeth,
  rivets,
  scallopedCap,
  sheen,
  showsDetail,
  slabBody,
  slabCommands,
  slabFace,
  slabRadius,
  sproutMark,
  topCap,
} from "@fz/phaser/bricks";
import { FUZZBALL_STRANDS } from "@fz/phaser/fuzzball";
import {
  type Area,
  type ArtFrame,
  type ArtScale,
  type DrawCommand,
  type Point,
  arcPoints,
  bandAlong,
  circle,
  crispOutline,
  dashes,
  ellipsePoints,
  pipRow,
  pointAt,
  polygon,
  rect,
  ring,
  roundRect,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { Brick } from "../../rules/bricks/bricks";
import {
  BRICK_KINDS,
  type BrickKindId,
  brickKind,
} from "../../rules/catalog/bricks";
import { TINTS } from "../../rules/levels/level";
import { stepsIn } from "../../rules/stepper";
import {
  BRICK_HEIGHT,
  BRICK_WIDTH,
  BUMPER_RADIUS,
  FRIEND_INKS,
  PORTAL_RADIUS,
} from "../../rules/tuning";
import {
  type BricksPalette,
  type UntintedKind,
  tintAt,
} from "../colors/palette";
import type { FieldView } from "../field/frame";

/** Describes what a brick's frame shows of it. */
export type BrickLook = Pick<
  Brick,
  "kind" | "tint" | "whole" | "hits" | "shown"
>;

/**
 * Describes what a cell's frame reads of the field beside its brick: its
 * step, by which a broken brick grows back, and the friends it has freed,
 * by which a cage shows the friend it frees next.
 */
export type CellField = Pick<FieldView, "steps" | "friendsFreed">;

/** The field a brick is pictured in on its own, as How to play's pictures are: at its first step, no friend yet freed. */
export const PICTURED_FIELD: CellField = { steps: 0, friendsFreed: 0 };

/** Says how a kind of brick is drawn. */
export interface BrickArt {
  /** Returns the name of the frame a brick of the kind shows, as it and the field beside it stand. */
  readonly frameOf: (brick: BrickLook, field: CellField) => string;
  /** Returns the color a brick of the kind is drawn in, which its shards take. */
  readonly colorOf: (brick: BrickLook, palette: BricksPalette) => number;
  /** Returns every frame a brick of the kind may show. */
  readonly frames: (
    palette: BricksPalette,
    scale: ArtScale,
  ) => readonly ArtFrame[];
}

/** A point of the art kit's box, across and down. */
type KitPoint = readonly [number, number];

/** A triangle's three corners. */
type Triangle<T> = readonly [T, T, T];

/** Says where a square of the kit's lies in its box: its top left corner and its side. */
interface KitSquare {
  readonly x: number;
  readonly y: number;
  readonly side: number;
}

/** The art kit's box a brick is drawn in. */
const KIT = { width: 200, height: 100 } as const;

/** A tough brick's row of pips: the middle of the row, how far apart, and each pip's radius. */
const PIPS = { middle: [100, 48.5], step: 30, radius: 9 } as const;

/** Each crack a tough brick shows for a hit it took, a zigzag in from an edge, clear of its pips. */
const CRACKS: readonly (readonly KitPoint[])[] = [
  [
    [30, 3],
    [37, 17],
    [27, 27],
    [36, 41],
  ],
  [
    [172, 88],
    [164, 73],
    [175, 62],
    [166, 50],
  ],
  [
    [150, 3],
    [144, 15],
    [153, 24],
  ],
];

/** How wide a crack is. */
const CRACK_WIDTH = 4;

/** The way a crack's first end is cut, along the edge it starts on. */
const ALONG_EDGE: Point = { x: 1, y: 0 };

/** A steel brick's bevelled frame: its edge, its corners' radius and its line's width. */
const STEEL_FRAME = {
  x: 14,
  y: 13,
  width: 172,
  height: 65,
  radius: 8,
  line: 3.6,
} as const;

/** A steel brick's rivets, one in each corner of its frame: across and down, as shares of the brick, and their radius. */
const STEEL_RIVETS = {
  across: [0.13, 0.87],
  down: [0.24, 0.67],
  radius: 4.4,
} as const;

/**
 * The square `sheen()` draws a steel brick's sheen in, chosen so its first
 * stroke runs as the kit's, from (84, 58) to (106, 36).
 *
 * Its second stroke lies 4.4 of the kit's units on along itself from the
 * kit's, under a CSS pixel at the sizes the game draws.
 */
const SHEEN_SQUARE: KitSquare = { x: 37.6, y: -11.7, side: 122.2 };

/**
 * The square `bombMark()` draws a blast brick's bomb in, a little smaller
 * than the kit's so its spark stays inside the brick.
 *
 * Its body lies at (96, 52), 21 round, rather than the kit's (96, 50), 23
 * round.
 */
const BOMB_SQUARE: KitSquare = { x: 46.3, y: -8.7, side: 108 };

/** The dots toward the bricks a blast reaches, at each place across on each place down, and their radius. */
const BLAST_DOTS = {
  across: [22, 178],
  down: [22, 46, 70],
  radius: 4,
} as const;

/** A gift's ribbon down its middle, from the body's top to its lip: from where across and how wide. */
const RIBBON = { x: 89, width: 22 } as const;

/** A gift's bow: its knot's middle and radius, and how wide the line is that outlines it and its loops. */
const BOW = { knot: [100, 22], radius: 8, line: 3 } as const;

/** Each loop of a gift's bow, from its knot, to the right. */
const LOOP: Triangle<KitPoint> = [
  [100, 22],
  [134, 6],
  [140, 30],
];

/** A hidden ghost's round dashes along its body's edge: each dash's length, the gap between and its width. */
const GHOST_DASH = { length: 16, gap: 12, width: 4 } as const;

/** Describes an eye, an ellipse about its middle, as far across and down as given. */
interface Eye {
  readonly middle: KitPoint;
  readonly across: number;
  readonly down: number;
}

/** A hidden ghost's faint eyes. */
const FAINT_EYES: readonly Eye[] = [
  { middle: [86, 44], across: 6, down: 9 },
  { middle: [114, 44], across: 6, down: 9 },
];

/** A shown ghost's eyes. */
const GHOST_EYES: readonly Eye[] = [
  { middle: [84, 42], across: 8, down: 12 },
  { middle: [116, 42], across: 8, down: 12 },
];

/** A shown ghost's hem: how far down its scallops' middles lie, and how many there are, side by side across its body. */
const GHOST_HEM = { foot: 72, scallops: 6 } as const;

/** How much narrower than its share of the body each scallop of a ghost's hem is, so they part a little. */
const SCALLOP_GAP = 1;

/** A regrowing brick's cap of moss: how far down its scallops' middles lie, how many there are, how round, and how far under each its shadow lies. */
const MOSS_CAP = { foot: 30, count: 9, radius: 12, drop: 4 } as const;

/** The square `sproutMark()` draws a regrowing brick's sprout in, its foot in the cap at the kit's (100, 34). */
const SPROUT_SQUARE: KitSquare = { x: 40, y: -2, side: 120 };

/**
 * The ring a broken regrowing brick fills as it grows back, after the kit's
 * `regrowing()`: its middle, its radius and its line's width.
 */
const REGROW_RING = { middle: [100, 50], radius: 30, width: 6 } as const;

/** The square `sproutMark()` draws the sprout in the ring in, its foot at the kit's (100, 66), 1.1 times a cap's. */
const REGROWING_SPROUT: KitSquare = { x: 34, y: 26.4, side: 132 };

/** A plated brick's row of pips: the middle of the row, and each pip's radius, as far apart as a tough brick's. */
const PLATED_PIPS = { middle: [100, 38], radius: 8.5 } as const;

/**
 * A plated brick's plate along its foot: its edge, a little wider than the
 * slab, how round its corners are, and how tall the shine along its top is.
 */
const PLATE = {
  x: 2,
  y: 66,
  width: 196,
  height: 22,
  radius: 6,
  shine: 7,
} as const;

/**
 * How far above a plate the brick is cut away in the marks' color, down to
 * its foot, so the steel, which keeps no contrast with a brick's tint,
 * stands apart from every tint; the kit draws the plate on the brick.
 */
const PLATE_SEAM = 3;

/** A plate's rivets, near each end: across the brick and down it, and their radius. */
const PLATE_RIVETS = { across: [22, 178], down: 79, radius: 4.4 } as const;

/** The teeth a plate points down, which turn a ball from below: from where across, over how wide, how many, and where their feet, under the plate, and their tips lie. */
const PLATE_TEETH = {
  from: 12,
  span: 176,
  count: 9,
  foot: 86,
  tip: 97,
} as const;

/**
 * A cage's inside, behind its bars, cut out in the marks' color, where the
 * kit tints it a little toward the steel, so the bars and the friend keep
 * their contrast against it in a light palette: its edge and how round its
 * corners are.
 */
const CAGE_INSIDE = {
  x: 14,
  y: 14,
  width: 172,
  height: 64,
  radius: 5,
} as const;

/** The middles of a cage's bars left of its middle, which those right of it mirror, and how wide each is. */
const CAGE_BARS = { lefts: [34, 60, 87], width: 7 } as const;

/**
 * The two ends of the bar a hit breaks, the first right of the cage's
 * middle: from which end of the bar each runs, how far down the brick it
 * bends, and where it ends, how far aside of the bar and how far down.
 */
const BENT_BAR = [
  { from: "top", bend: 26, aside: 12, down: 38 },
  { from: "foot", bend: 68, aside: -10, down: 58 },
] as const;

/** Returns where a place across the kit's box lies across a cage's inside, as a share of it. */
function acrossInside(x: number): number {
  return (x - CAGE_INSIDE.x) / CAGE_INSIDE.width;
}

/** Returns where a place down the kit's box lies down a cage's inside, as a share of it. */
function downInside(y: number): number {
  return (y - CAGE_INSIDE.y) / CAGE_INSIDE.height;
}

/** How a cage's bars stand in its inside, as `cageBars()` takes them, from the top of it to its foot. */
const CAGE_BARS_IN: CageBars = {
  lefts: CAGE_BARS.lefts.map(acrossInside),
  top: 0,
  broken: BENT_BAR.map(({ from, bend, aside, down }) => ({
    from,
    bend: downInside(bend),
    aside: aside / CAGE_INSIDE.width,
    down: downInside(down),
  })),
};

/** The crack a hit leaves in a cage's frame, down from its top edge to its inside. */
const CAGE_CRACK: readonly KitPoint[] = [
  [150, 3],
  [144, 9],
  [153, 13],
];

/** The friend a cage holds: its body's middle, and how many of the kit's units a unit of the fuzzball's grid is. */
const CAGED_FRIEND = { middle: [100, 47], grid: 2.35 } as const;

/**
 * A key brick's key: its bow, a ring about a middle and its radius; how
 * wide the ring, its shaft and its teeth are; its shaft, from where to where
 * across; and its two teeth hanging from it, each from where across and how
 * long.
 */
const KEY = {
  bow: { middle: [64, 46], radius: 17 },
  line: 9,
  shaft: { from: 82, to: 146 },
  teeth: [
    { x: 118, length: 17 },
    { x: 137, length: 22 },
  ],
} as const;

/**
 * A gate's gold ends: how wide each is from the slab's side, how round its
 * outer corners are, and from how far in from that side the steel covers
 * it again, so its inner edge is straight.
 */
const GATE_ENDS = { width: 30, radius: 12, steelFrom: 18 } as const;

/** A gate's keyhole: its round top, a middle and a radius, and the slot below it, narrow at its top. */
const KEYHOLE = {
  middle: [100, 40],
  radius: 13,
  slot: [
    [94, 46],
    [106, 46],
    [111, 68],
    [89, 68],
  ],
} as const;

/** How many steps of its own a regrowing brick's ring fills in as it grows back, each a frame. */
export const REGROW_RING_STEPS = 24;

/** Each frame a broken regrowing brick shows as it grows back, its ring empty, then filled a step more, then full. */
const REGROWING_FRAMES: readonly string[] = Array.from(
  { length: REGROW_RING_STEPS + 1 },
  (_, step) => `regrowing-${String(step)}`,
);

/** Returns a length of the kit's in a brick's cell. */
function kitLength(cell: Area, length: number): number {
  return (length * cell.height) / KIT.height;
}

/** Returns a point of the kit's in a brick's cell. */
function kitPoint(cell: Area, [x, y]: KitPoint): Point {
  return {
    x: cell.x + kitLength(cell, x),
    y: cell.y + kitLength(cell, y),
  };
}

/** Returns a square of the kit's, its top left corner and its side, in a brick's cell. */
function kitSquare(cell: Area, square: KitSquare): Area {
  const side = kitLength(cell, square.side);
  return { ...kitPoint(cell, [square.x, square.y]), width: side, height: side };
}

/** Returns a line's width of the kit's in whole device pixels, a CSS pixel at least. */
function kitWidth(scale: ArtScale, length: number): number {
  return widthOf((length * BRICK_HEIGHT) / KIT.height, scale);
}

/** Returns a dot's radius of the kit's in a brick's cell, a CSS pixel across at least. */
function dotRadius(cell: Area, scale: ArtScale, radius: number): number {
  return Math.max(scale.pixelRatio / 2, kitLength(cell, radius));
}

/** Returns the names of the frames of a look drawn in each tint. */
function tinted(look: string): readonly string[] {
  return Array.from({ length: TINTS }, (_, tint) => `${look}-${String(tint)}`);
}

const PLAIN_FRAMES = tinted("plain");
const GHOST_FRAMES = tinted("ghost");
const SHOWN_GHOST_FRAMES = tinted("ghost-shown");

/** The kinds drawn in a tint that wear as they take hits, a pip for each left and a crack for each taken. */
type WornKind = Extract<BrickKindId, "tough" | "plated">;

/** Describes how a brick that wears stands: the hits it takes whole, and those it has left. */
interface WornLook {
  readonly whole: number;
  readonly hits: number;
}

/** Says how a kind that wears is drawn: every way a level lays one can stand, and its frames for each, in each tint. */
interface WornArt {
  readonly kind: WornKind;
  readonly looks: readonly WornLook[];
  readonly frames: ReadonlyMap<number, readonly string[]>;
}

/** Returns the number a brick that wears keeps its frames under, for how it stands. */
function wornKey(kind: WornKind, whole: number, hits: number): number {
  return whole * (BRICK_KINDS[kind].mostHits + 1) + hits;
}

/** Returns every way a brick of a kind that wears can stand, with a hit or more left, and its frames, in each tint, for each and for no other. */
function wornArt(kind: WornKind): WornArt {
  const { hits, mostHits } = BRICK_KINDS[kind];
  const looks = Array.from(
    { length: mostHits - hits + 1 },
    (_, i) => hits + i,
  ).flatMap((whole) =>
    Array.from({ length: whole }, (_, i) => ({ whole, hits: i + 1 })),
  );
  return {
    kind,
    looks,
    frames: new Map(
      looks.map(({ whole, hits: left }) => [
        wornKey(kind, whole, left),
        tinted(`${kind}-${String(whole)}-${String(left)}`),
      ]),
    ),
  };
}

const TOUGH = wornArt("tough");
const PLATED = wornArt("plated");

/** Returns the name of the frame a brick that wears shows, as it stands; it throws for one no level can lay. */
function wornFrame(art: WornArt, brick: BrickLook): string {
  return nameAt(
    art.frames.get(wornKey(art.kind, brick.whole, brick.hits)),
    brick.tint,
  );
}

/** Returns every frame a kind that wears shows, its slab in each of a tough brick's tints, under its marks for how it stands. */
function wornFrames(
  art: WornArt,
  palette: BricksPalette,
  scale: ArtScale,
  marks: (
    cell: Area,
    look: WornLook,
    palette: BricksPalette,
    scale: ArtScale,
  ) => readonly DrawCommand[],
): readonly ArtFrame[] {
  return art.looks.flatMap((look) => {
    const names = art.frames.get(wornKey(art.kind, look.whole, look.hits));
    return palette.toughTints.map((tint, i) =>
      drawBrick(nameAt(names, i), scale, (cell) => [
        ...slab(cell, tint),
        ...marks(cell, look, palette, scale),
      ]),
    );
  });
}

/** Returns the name at a place in a list of names, which holds one for every brick a level can lay. */
function nameAt(names: readonly string[] | undefined, at: number): string {
  const name = names?.[at];
  if (name === undefined) throw new Error(`No frame at ${String(at)}.`);
  return name;
}

/** Returns the ink of the friend a cage shows, the one a field that has freed so many frees next, as the rules dress it. */
export function nextFriend(friendsFreed: number): number {
  return friendsFreed % FRIEND_INKS;
}

/** A cage's frames, as it stands, for each friend's ink it may hold. */
const CAGE_FRAMES: Readonly<Record<CageLook, readonly string[]>> = {
  whole: Array.from({ length: FRIEND_INKS }, (_, ink) => `cage-${String(ink)}`),
  hit: Array.from(
    { length: FRIEND_INKS },
    (_, ink) => `cage-hit-${String(ink)}`,
  ),
};

/** Returns a brick's frame, drawn in its cell, which is the whole frame. */
function drawBrick(
  name: string,
  scale: ArtScale,
  draw: (cell: Area) => readonly DrawCommand[],
): ArtFrame {
  const width = BRICK_WIDTH * scale.unit;
  const height = BRICK_HEIGHT * scale.unit;
  return { name, width, height, commands: draw({ x: 0, y: 0, width, height }) };
}

/** Returns a brick's slab in its cell, in an ink. */
function slab(cell: Area, ink: number): readonly DrawCommand[] {
  return slabCommands(cell, ink, BRICK_SLAB);
}

/** Returns a crack in from an edge, its first end cut along that edge, in the marks' color. */
function crackOf(
  cell: Area,
  crack: readonly KitPoint[],
  palette: BricksPalette,
  scale: ArtScale,
): DrawCommand {
  return polygon(
    bandAlong(
      crack.map((point) => kitPoint(cell, point)),
      kitWidth(scale, CRACK_WIDTH),
      ALONG_EDGE,
    ),
    { color: palette.mark },
  );
}

/** Returns a crack for each hit a brick that wears has taken, where it is drawn large enough. */
function cracksOf(
  cell: Area,
  look: WornLook,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  return showsDetail(scale, BRICK_WIDTH)
    ? CRACKS.slice(0, look.whole - look.hits).map((crack) =>
        crackOf(cell, crack, palette, scale),
      )
    : [];
}

/** Returns a tough brick's pips, one for each hit it has left, and a crack for each it took, where it is drawn large enough. */
function toughMarks(
  cell: Area,
  look: WornLook,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  return [
    ...pipRow(
      look.hits,
      kitPoint(cell, PIPS.middle),
      kitLength(cell, PIPS.step),
      dotRadius(cell, scale, PIPS.radius),
      { color: palette.mark },
    ),
    ...cracksOf(cell, look, palette, scale),
  ];
}

/**
 * Returns a plated brick's marks: a pip for each hit it has left, higher
 * and smaller than a tough brick's, and a crack for each it took, where it
 * is drawn large enough; and its plate along its foot, cut out of the brick
 * in the marks' color from a seam above it down to the brick's foot, with
 * its teeth pointing down into that cut, its shine and its two rivets.
 */
function platedMarks(
  cell: Area,
  look: WornLook,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const detail = showsDetail(scale, BRICK_WIDTH);
  const plate = plateArea(cell);
  const { plate: steel, plateShine, steelLine } = palette.kindInks;
  return [
    ...pipRow(
      look.hits,
      kitPoint(cell, PLATED_PIPS.middle),
      kitLength(cell, PIPS.step),
      dotRadius(cell, scale, PLATED_PIPS.radius),
      { color: palette.mark },
    ),
    ...cracksOf(cell, look, palette, scale),
    ...plateCut(cell, plate.y - kitWidth(scale, PLATE_SEAM), palette),
    ...plateTeeth({
      from: cell.x + kitLength(cell, PLATE_TEETH.from),
      span: kitLength(cell, PLATE_TEETH.span),
      count: PLATE_TEETH.count,
      gap: 0,
      foot: cell.y + kitLength(cell, PLATE_TEETH.foot),
      tip: cell.y + kitLength(cell, PLATE_TEETH.tip),
    }).map((tooth) => polygon(tooth, { color: steel })),
    roundRect(plate, kitLength(cell, PLATE.radius), { color: steel }),
    ...(detail
      ? [
          roundRect(
            { ...plate, height: Math.round(kitLength(cell, PLATE.shine)) },
            kitLength(cell, PLATE.shine) / 2,
            { color: plateShine },
          ),
          ...rivets(
            cell,
            PLATE_RIVETS.across.map((x) => x / KIT.width),
            [PLATE_RIVETS.down / KIT.height],
            kitLength(cell, PLATE_RIVETS.radius),
            { color: steelLine },
          ),
        ]
      : []),
  ];
}

/** Returns a plated brick's plate in its cell, its top and its foot on whole pixels. */
function plateArea(cell: Area): Area {
  const top = Math.round(kitLength(cell, PLATE.y));
  return {
    x: cell.x + kitLength(cell, PLATE.x),
    y: cell.y + top,
    width: kitLength(cell, PLATE.width),
    height: Math.round(kitLength(cell, PLATE.y + PLATE.height)) - top,
  };
}

/**
 * Returns what a plated brick cuts away for its plate, in the marks' color:
 * its body from a line across it down to its foot, square at the top and
 * round at the foot's corners, as the slab is.
 */
function plateCut(
  cell: Area,
  top: number,
  palette: BricksPalette,
): readonly DrawCommand[] {
  const body = slabBody(cell, BRICK_SLAB);
  const radius = slabRadius(cell, BRICK_SLAB);
  const foot = body.y + body.height;
  const style = { color: palette.mark };
  return [
    rect({ ...body, y: top, height: foot - radius - top }, style),
    roundRect(
      { ...body, y: foot - 2 * radius, height: 2 * radius },
      radius,
      style,
    ),
  ];
}

/**
 * Returns a cage's marks over its slab: its inside, cut out in the marks'
 * color; the friend it holds, in that friend's ink; its bars, whole or with
 * one broken once it is hit; and, hit, a crack in its frame, where it is
 * drawn large enough.
 */
function cageMarks(
  cell: Area,
  look: CageLook,
  friend: number,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const detail = showsDetail(scale, BRICK_WIDTH);
  const inside = cageInside(cell);
  return [
    roundRect(inside, kitLength(cell, CAGE_INSIDE.radius), {
      color: palette.mark,
    }),
    ...cagedFriend(
      kitPoint(cell, CAGED_FRIEND.middle),
      kitLength(cell, CAGED_FRIEND.grid),
      { body: friend, eyes: palette.mark },
      detail ? FUZZBALL_STRANDS : [],
    ),
    ...cageBars(inside, CAGE_BARS_IN, look, {
      color: palette.bricks.cage,
      width: kitWidth(scale, CAGE_BARS.width),
    }),
    ...(look === "hit" && detail
      ? [crackOf(cell, CAGE_CRACK, palette, scale)]
      : []),
  ];
}

/** Returns a cage's inside in its cell, its edges on whole pixels. */
function cageInside(cell: Area): Area {
  const left = Math.round(kitLength(cell, CAGE_INSIDE.x));
  const top = Math.round(kitLength(cell, CAGE_INSIDE.y));
  const right = Math.round(kitLength(cell, CAGE_INSIDE.x + CAGE_INSIDE.width));
  const foot = Math.round(kitLength(cell, CAGE_INSIDE.y + CAGE_INSIDE.height));
  return {
    x: cell.x + left,
    y: cell.y + top,
    width: right - left,
    height: foot - top,
  };
}

/** Returns a key brick's key, cut out in the marks' color: its bow, a ring, its shaft and its two teeth hanging from the shaft. */
function keyMarks(
  cell: Area,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const style = { color: palette.mark };
  const width = kitWidth(scale, KEY.line);
  const middle = kitPoint(cell, KEY.bow.middle);
  const shaft = middle.y - width / 2;
  const from = cell.x + kitLength(cell, KEY.shaft.from);
  const to = cell.x + kitLength(cell, KEY.shaft.to);
  return [
    ring(middle, kitLength(cell, KEY.bow.radius), { ...style, width }),
    rect({ x: from, y: shaft, width: to - from, height: width }, style),
    ...KEY.teeth.map(({ x, length }) =>
      rect(
        {
          x: cell.x + kitLength(cell, x),
          y: middle.y,
          width,
          height: kitLength(cell, length),
        },
        style,
      ),
    ),
  ];
}

/**
 * Returns a gate's marks over its steel slab: a gold end at each side, in
 * the key's color, round at its outer corners and square inside, and a
 * keyhole in the steel's dark line, so it reads as shut until a key opens
 * it.
 */
function gateMarks(cell: Area, palette: BricksPalette): readonly DrawCommand[] {
  const face = slabFace(cell, BRICK_SLAB);
  const end = kitLength(cell, GATE_ENDS.width);
  const steelFrom = kitLength(cell, GATE_ENDS.steelFrom);
  const ends = [face.x, face.x + face.width - end];
  const covers = [face.x + steelFrom, face.x + face.width - end];
  const hole = { color: palette.kindInks.steelLine };
  return [
    ...ends.map((x) =>
      roundRect({ ...face, x, width: end }, kitLength(cell, GATE_ENDS.radius), {
        color: palette.bricks.key,
      }),
    ),
    ...covers.map((x) =>
      rect(
        { ...face, x, width: end - steelFrom },
        { color: palette.bricks.gate },
      ),
    ),
    circle(
      kitPoint(cell, KEYHOLE.middle),
      kitLength(cell, KEYHOLE.radius),
      hole,
    ),
    polygon(
      KEYHOLE.slot.map((point) => kitPoint(cell, point)),
      hole,
    ),
  ];
}

/** Returns a steel brick's marks: its bevelled frame, and, where it is drawn large enough, a rivet in each of the frame's corners and its sheen. */
function steelMarks(
  cell: Area,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const line = { color: palette.kindInks.steelLine };
  const frame = crispOutline(
    {
      ...kitPoint(cell, [STEEL_FRAME.x, STEEL_FRAME.y]),
      width: kitLength(cell, STEEL_FRAME.width),
      height: kitLength(cell, STEEL_FRAME.height),
    },
    kitLength(cell, STEEL_FRAME.radius),
    { ...line, width: kitWidth(scale, STEEL_FRAME.line) },
  );
  if (!showsDetail(scale, BRICK_WIDTH)) return [frame];
  return [
    frame,
    ...rivets(
      cell,
      STEEL_RIVETS.across,
      STEEL_RIVETS.down,
      kitLength(cell, STEEL_RIVETS.radius),
      line,
    ),
    ...sheen(
      kitSquare(cell, SHEEN_SQUARE),
      palette.bricks.steel,
      scale.pixelRatio,
    ),
  ];
}

/** Returns a blast brick's marks: a dot toward each brick around it that it reaches, and its bomb, lit. */
function blastMarks(
  cell: Area,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const radius = dotRadius(cell, scale, BLAST_DOTS.radius);
  return [
    ...BLAST_DOTS.across.flatMap((x) =>
      BLAST_DOTS.down.map((y) =>
        circle(kitPoint(cell, [x, y]), radius, { color: palette.mark }),
      ),
    ),
    ...bombMark(
      kitSquare(cell, BOMB_SQUARE),
      {
        cut: palette.mark,
        shine: palette.bricks.blast,
        spark: palette.kindInks.spark,
      },
      scale.pixelRatio,
    ),
  ];
}

/** Returns how far apart two points are. */
function distance(from: Point, to: Point): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * Returns a triangle with each side moved in by a distance, toward the
 * middle of the circle inside it, to that middle at the most.
 */
function shrunk([a, b, c]: Triangle<Point>, by: number): Triangle<Point> {
  // The circle inside a triangle has its middle at the corners, each
  // weighted by the side across from it, and its radius twice the
  // triangle's area over its sides.
  const across = { a: distance(b, c), b: distance(c, a), c: distance(a, b) };
  const around = across.a + across.b + across.c;
  const area =
    Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  const middle = {
    x: (a.x * across.a + b.x * across.b + c.x * across.c) / around,
    y: (a.y * across.a + b.y * across.b + c.y * across.c) / around,
  };
  const kept = Math.max(0, 1 - (by * around) / (2 * area));
  const toward = ({ x, y }: Point): Point => ({
    x: middle.x + (x - middle.x) * kept,
    y: middle.y + (y - middle.y) * kept,
  });
  return [toward(a), toward(b), toward(c)];
}

/** Returns a gift brick's marks: a ribbon down its middle, and a bow of two loops and a knot, each outlined inside its edge in the marks' color. */
function giftMarks(
  cell: Area,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const ribbon = { color: palette.kindInks.ribbon };
  const mark = { color: palette.mark };
  const line = kitWidth(scale, BOW.line);
  const face = slabFace(cell, BRICK_SLAB);
  const left = Math.round(kitLength(cell, RIBBON.x));
  const right = Math.round(kitLength(cell, RIBBON.x + RIBBON.width));
  const knot = kitPoint(cell, BOW.knot);
  const radius = kitLength(cell, BOW.radius);
  const loops = [1, -1].map((side): Triangle<Point> => {
    const at = ([x, y]: KitPoint): Point =>
      kitPoint(cell, [BOW.knot[0] + side * (x - BOW.knot[0]), y]);
    return [at(LOOP[0]), at(LOOP[1]), at(LOOP[2])];
  });
  return [
    rect(
      { x: cell.x + left, y: face.y, width: right - left, height: face.height },
      ribbon,
    ),
    ...loops.flatMap((loop) => [
      polygon(loop, mark),
      polygon(shrunk(loop, line), ribbon),
    ]),
    circle(knot, radius, mark),
    circle(knot, radius - line, ribbon),
  ];
}

/** Returns the eyes of a ghost, each an ellipse in a color. */
function eyes(
  cell: Area,
  each: readonly Eye[],
  color: number,
): readonly DrawCommand[] {
  return each.map(({ middle, across, down }) =>
    polygon(
      ellipsePoints(
        kitPoint(cell, middle),
        kitLength(cell, across),
        kitLength(cell, down),
      ),
      { color },
    ),
  );
}

/**
 * Returns a hidden ghost: round dashes along its body's edge above its lip,
 * their outer edge on it, a dash in each corner and the rest along each
 * side, and two faint eyes, all in its faded tint.
 */
function hiddenGhost(
  cell: Area,
  color: number,
  scale: ArtScale,
): readonly DrawCommand[] {
  const style = { color, width: kitWidth(scale, GHOST_DASH.width) };
  const half = style.width / 2;
  const face = slabFace(cell, BRICK_SLAB);
  const edge = {
    left: face.x + half,
    top: face.y + half,
    right: face.x + face.width - half,
    bottom: face.y + face.height - half,
  };
  const radius = Math.max(0, slabRadius(cell, BRICK_SLAB) - half);
  const dash = kitLength(cell, GHOST_DASH.length);
  const gap = kitLength(cell, GHOST_DASH.gap);
  // Each corner's middle, a radius in from its two sides, and the angle
  // halfway round its arc, clockwise from the right.
  const corners = [
    { x: edge.left + radius, y: edge.top + radius, angle: 1.25 * Math.PI },
    { x: edge.right - radius, y: edge.top + radius, angle: 1.75 * Math.PI },
    { x: edge.right - radius, y: edge.bottom - radius, angle: 0.25 * Math.PI },
    { x: edge.left + radius, y: edge.bottom - radius, angle: 0.75 * Math.PI },
  ];
  const turn = radius > 0 ? Math.min(Math.PI / 2, dash / radius) / 2 : 0;
  const sides: readonly (readonly [Point, Point])[] = [
    [
      { x: edge.left + radius, y: edge.top },
      { x: edge.right - radius, y: edge.top },
    ],
    [
      { x: edge.right, y: edge.top + radius },
      { x: edge.right, y: edge.bottom - radius },
    ],
    [
      { x: edge.right - radius, y: edge.bottom },
      { x: edge.left + radius, y: edge.bottom },
    ],
    [
      { x: edge.left, y: edge.bottom - radius },
      { x: edge.left, y: edge.top + radius },
    ],
  ];
  return [
    ...corners.flatMap(({ angle, ...middle }) =>
      stroke(arcPoints(middle, radius, angle - turn, angle + turn), style),
    ),
    ...sides.flatMap(([from, to]) =>
      dashes(from, to, dash, gap).flatMap((each) =>
        stroke([each.from, each.to], style),
      ),
    ),
    ...eyes(cell, FAINT_EYES, color),
  ];
}

/** Returns a shown ghost: its body over its top, round its corners, down to a hem of scallops side by side, and its eyes cut out of it. */
function shownGhost(
  cell: Area,
  color: number,
  palette: BricksPalette,
): readonly DrawCommand[] {
  const body = slabBody(cell, BRICK_SLAB);
  const foot = cell.y + kitLength(cell, GHOST_HEM.foot);
  const step = body.width / GHOST_HEM.scallops;
  const radius = Math.max(0, step / 2 - kitLength(cell, SCALLOP_GAP) / 2);
  return [
    polygon(topCap(body, slabRadius(cell, BRICK_SLAB), foot), { color }),
    ...Array.from({ length: GHOST_HEM.scallops }, (_, i) =>
      circle({ x: body.x + step * (i + 0.5), y: foot }, radius, { color }),
    ),
    ...eyes(cell, GHOST_EYES, palette.mark),
  ];
}

/** Returns a regrowing brick's marks over its earth: a cap of moss down to a scalloped foot, and a sprout cut out of it. */
function regrowMarks(
  cell: Area,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  return [
    ...scallopedCap(
      slabBody(cell, BRICK_SLAB),
      slabRadius(cell, BRICK_SLAB),
      cell.y + kitLength(cell, MOSS_CAP.foot),
      {
        count: MOSS_CAP.count,
        radius: kitLength(cell, MOSS_CAP.radius),
        drop: kitLength(cell, MOSS_CAP.drop),
      },
      { cap: palette.kindInks.moss, shadow: palette.kindInks.mossShadow },
    ),
    ...sproutMark(
      kitSquare(cell, SPROUT_SQUARE),
      palette.mark,
      scale.pixelRatio,
    ),
  ];
}

/**
 * Returns the place a regrowing brick has left, as it grows back, its ring
 * filled a share of the way round from its top, clockwise: the ring's track
 * and what of it is filled, and, where a brick shows its finest detail, a
 * sprout in the ring.
 */
function regrowing(
  cell: Area,
  share: number,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const middle = kitPoint(cell, REGROW_RING.middle);
  const radius = kitLength(cell, REGROW_RING.radius);
  const style = {
    color: palette.kindInks.regrowRing,
    width: kitWidth(scale, REGROW_RING.width),
  };
  const top = -Math.PI / 2;
  return [
    ring(middle, radius, { ...style, color: palette.kindInks.regrowTrack }),
    ...(share > 0
      ? stroke(arcPoints(middle, radius, top, top + 2 * Math.PI * share), style)
      : []),
    ...(showsDetail(scale, BRICK_WIDTH)
      ? sproutMark(
          kitSquare(cell, REGROWING_SPROUT),
          palette.kindInks.regrowRing,
          scale.pixelRatio,
        )
      : []),
  ];
}

/** Returns the frames a broken regrowing brick shows as it grows back, one for each step of its ring. */
function regrowingFrames(
  palette: BricksPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return REGROWING_FRAMES.map((name, step) =>
    drawBrick(name, scale, (cell) =>
      regrowing(cell, step / REGROW_RING_STEPS, palette, scale),
    ),
  );
}

/**
 * Returns how a round kind is drawn until it has art of its own: as a disc
 * in one tint, of the radius a ball meets it at, in field units, at its
 * cell's middle, in every state.
 */
function roundPlaceholderArt(
  kind: BrickKindId,
  tint: number,
  radius: number,
): BrickArt {
  return {
    frameOf: () => kind,
    colorOf: (_, palette) => tintAt(palette.tints, tint),
    frames: (palette, scale) => [
      drawBrick(kind, scale, (cell) => [
        circle(pointAt(cell, 0.5, 0.5), radius * scale.unit, {
          color: tintAt(palette.tints, tint),
        }),
      ]),
    ],
  };
}

/** Returns how a kind drawn in a color of its own, in one look whatever its state, is drawn. */
function untintedArt(
  kind: UntintedKind,
  marks: (
    cell: Area,
    palette: BricksPalette,
    scale: ArtScale,
  ) => readonly DrawCommand[],
): BrickArt {
  return {
    frameOf: () => kind,
    colorOf: (_, palette) => palette.bricks[kind],
    frames: (palette, scale) => [
      drawBrick(kind, scale, (cell) => [
        ...slab(cell, palette.bricks[kind]),
        ...marks(cell, palette, scale),
      ]),
    ],
  };
}

/** How a regrowing brick is drawn whole; broken, it shows its ring as it grows back besides. */
const REGROW_ART = untintedArt("regrow", regrowMarks);

/** How each kind of brick is drawn: its frames, and which one a brick shows. */
export const BRICK_ART = {
  plain: {
    frameOf: (brick) => nameAt(PLAIN_FRAMES, brick.tint),
    colorOf: (brick, palette) => tintAt(palette.tints, brick.tint),
    frames: (palette, scale) =>
      palette.tints.map((tint, i) =>
        drawBrick(nameAt(PLAIN_FRAMES, i), scale, (cell) => slab(cell, tint)),
      ),
  },
  tough: {
    frameOf: (brick) => wornFrame(TOUGH, brick),
    colorOf: (brick, palette) => tintAt(palette.toughTints, brick.tint),
    frames: (palette, scale) => wornFrames(TOUGH, palette, scale, toughMarks),
  },
  steel: untintedArt("steel", steelMarks),
  blast: untintedArt("blast", blastMarks),
  gift: untintedArt("gift", giftMarks),
  ghost: {
    frameOf: (brick) =>
      nameAt(brick.shown ? SHOWN_GHOST_FRAMES : GHOST_FRAMES, brick.tint),
    colorOf: (brick, palette) =>
      tintAt(
        brick.shown ? palette.ghostTints.shown : palette.ghostTints.hidden,
        brick.tint,
      ),
    frames: (palette, scale) => [
      ...palette.ghostTints.hidden.map((tint, i) =>
        drawBrick(nameAt(GHOST_FRAMES, i), scale, (cell) =>
          hiddenGhost(cell, tint, scale),
        ),
      ),
      ...palette.ghostTints.shown.map((tint, i) =>
        drawBrick(nameAt(SHOWN_GHOST_FRAMES, i), scale, (cell) =>
          shownGhost(cell, tint, palette),
        ),
      ),
    ],
  },
  regrow: {
    ...REGROW_ART,
    frames: (palette, scale) => [
      ...REGROW_ART.frames(palette, scale),
      ...regrowingFrames(palette, scale),
    ],
  },
  cage: {
    frameOf: (brick, field) =>
      nameAt(
        CAGE_FRAMES[brick.hits < brick.whole ? "hit" : "whole"],
        nextFriend(field.friendsFreed),
      ),
    colorOf: (_, palette) => palette.bricks.cage,
    frames: (palette, scale) =>
      (["whole", "hit"] as const).flatMap((look) =>
        palette.friendInks.map((friend, ink) =>
          drawBrick(nameAt(CAGE_FRAMES[look], ink), scale, (cell) => [
            ...slab(cell, palette.bricks.cage),
            ...cageMarks(cell, look, friend, palette, scale),
          ]),
        ),
      ),
  },
  plated: {
    frameOf: (brick) => wornFrame(PLATED, brick),
    colorOf: (brick, palette) => tintAt(palette.toughTints, brick.tint),
    frames: (palette, scale) => wornFrames(PLATED, palette, scale, platedMarks),
  },
  key: untintedArt("key", keyMarks),
  gate: untintedArt("gate", gateMarks),
  bumper: roundPlaceholderArt("bumper", 7, BUMPER_RADIUS),
  portal: roundPlaceholderArt("portal", 3, PORTAL_RADIUS),
} as const satisfies Readonly<Record<BrickKindId, BrickArt>>;

/**
 * Returns the name of the frame a brick shows, as it and the field beside it
 * stand, or as it is pictured on its own where no field is given; it throws
 * for a brick no level can lay.
 */
export function brickFrame(
  brick: BrickLook,
  field: CellField = PICTURED_FIELD,
): string {
  return BRICK_ART[brick.kind].frameOf(brick, field);
}

/** Returns the color a brick is drawn in, which its shards take. */
export function brickColor(brick: BrickLook, palette: BricksPalette): number {
  return BRICK_ART[brick.kind].colorOf(brick, palette);
}

/**
 * Returns how far a broken brick that regrows has come toward growing back
 * at a step of the field, from 0 as it breaks to 1 once it may, or null for
 * one that is whole or never regrows.
 */
export function regrowShare(
  brick: Pick<Brick, "kind" | "broken" | "regrowsAt">,
  steps: number,
): number | null {
  if (!brick.broken) return null;
  const trait = brickKind(brick.kind).traits.find(
    (each) => each.kind === "regrows",
  );
  if (trait?.kind !== "regrows") return null;
  const growing = stepsIn(trait.afterMs);
  return clamp(1 - (brick.regrowsAt - steps) / growing, 0, 1);
}

/** Returns the name of the frame a broken regrowing brick shows as it grows back, its ring filled a share of the way. */
export function regrowingFrame(share: number): string {
  return nameAt(
    REGROWING_FRAMES,
    Math.floor(clamp(share, 0, 1) * REGROW_RING_STEPS),
  );
}

/**
 * Returns the frame a cell shows of its brick as the field stands: the
 * brick's own while it stands, a cage's holding the friend the field frees
 * next, its ring while a broken one grows back, and none for one broken for
 * good, an open gate among them.
 */
export function cellFrame(
  brick: Readonly<Brick>,
  field: CellField,
): string | null {
  if (!brick.broken) return brickFrame(brick, field);
  const share = regrowShare(brick, field.steps);
  return share === null ? null : regrowingFrame(share);
}
