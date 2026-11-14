// Each kind of brick, in each tint and state, on `@fz/phaser/bricks`' slab
// (`BRICK_SLAB`), as `docs/brick-breaker-uplift/art/bricks.svg` draws it:
// a plain brick's lip and strip, a tough brick's pips cut out and a crack
// for each hit taken, steel's frame, rivets and sheen, the blast brick's
// bomb and a dot toward each brick it reaches, the gift's parcel and bow, a
// hidden ghost's round dashes and faint eyes or a shown one's body under a
// scalloped hem, and earth under a cap of moss. Every number is the art
// kit's (`art/kit.mjs`), in its box of 200 by 100, drawn at the brick's
// height over 100, but where a constant's comment here says otherwise. A brick
// under 30 CSS px wide leaves out its cracks, rivets and sheen
// (`showsDetail()`).

import {
  BRICK_SLAB,
  bombMark,
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
  polygon,
  rect,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import type { Brick } from "../../rules/bricks/bricks";
import { BRICK_KINDS, type BrickKindId } from "../../rules/catalog/bricks";
import { TINTS } from "../../rules/levels/level";
import { BRICK_HEIGHT, BRICK_WIDTH } from "../../rules/tuning";
import {
  type BricksPalette,
  type UntintedKind,
  tintAt,
} from "../colors/palette";

/** Describes what a brick's frame shows of it. */
export type BrickLook = Pick<
  Brick,
  "kind" | "tint" | "whole" | "hits" | "shown"
>;

/** Says how a kind of brick is drawn. */
export interface BrickArt {
  /** Returns the name of the frame a brick of the kind shows, as it stands. */
  readonly frameOf: (brick: BrickLook) => string;
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

/** Describes how a tough brick stands: the hits it takes whole, and those it has left. */
interface ToughLook {
  readonly whole: number;
  readonly hits: number;
}

/** Every way a tough brick a level lays can stand, with a hit or more left. */
const TOUGH_LOOKS: readonly ToughLook[] = Array.from(
  { length: BRICK_KINDS.tough.mostHits - BRICK_KINDS.tough.hits + 1 },
  (_, i) => BRICK_KINDS.tough.hits + i,
).flatMap((whole) =>
  Array.from({ length: whole }, (_, i) => ({ whole, hits: i + 1 })),
);

/** Returns the number a tough brick's frames are kept under, for how it stands. */
function toughKey(whole: number, hits: number): number {
  return whole * (BRICK_KINDS.tough.mostHits + 1) + hits;
}

/** A tough brick's frames, in each tint, for each way it can stand, and for no other. */
const TOUGH_FRAMES: ReadonlyMap<number, readonly string[]> = new Map(
  TOUGH_LOOKS.map(({ whole, hits }) => [
    toughKey(whole, hits),
    tinted(`tough-${String(whole)}-${String(hits)}`),
  ]),
);

/** Returns the name at a place in a list of names, which holds one for every brick a level can lay. */
function nameAt(names: readonly string[] | undefined, at: number): string {
  const name = names?.[at];
  if (name === undefined) throw new Error(`No frame at ${String(at)}.`);
  return name;
}

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

/** Returns a tough brick's pips, one for each hit it has left, and a crack for each it took, where it is drawn large enough. */
function toughMarks(
  cell: Area,
  look: ToughLook,
  palette: BricksPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const style = { color: palette.mark };
  const width = kitWidth(scale, CRACK_WIDTH);
  return [
    ...pipRow(
      look.hits,
      kitPoint(cell, PIPS.middle),
      kitLength(cell, PIPS.step),
      dotRadius(cell, scale, PIPS.radius),
      style,
    ),
    ...(showsDetail(scale, BRICK_WIDTH)
      ? CRACKS.slice(0, look.whole - look.hits).map((crack) =>
          polygon(
            bandAlong(
              crack.map((point) => kitPoint(cell, point)),
              width,
              ALONG_EDGE,
            ),
            style,
          ),
        )
      : []),
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
 * Returns how a kind is drawn until it has art of its own: as a plain brick
 * in one tint, whatever the level tints it, in every state.
 */
function placeholderArt(kind: BrickKindId, tint: number): BrickArt {
  return {
    frameOf: () => kind,
    colorOf: (_, palette) => tintAt(palette.tints, tint),
    frames: (palette, scale) => [
      drawBrick(kind, scale, (cell) => slab(cell, tintAt(palette.tints, tint))),
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
    frameOf: (brick) =>
      nameAt(TOUGH_FRAMES.get(toughKey(brick.whole, brick.hits)), brick.tint),
    colorOf: (brick, palette) => tintAt(palette.toughTints, brick.tint),
    frames: (palette, scale) =>
      TOUGH_LOOKS.flatMap((look) => {
        const names = TOUGH_FRAMES.get(toughKey(look.whole, look.hits));
        return palette.toughTints.map((tint, i) =>
          drawBrick(nameAt(names, i), scale, (cell) => [
            ...slab(cell, tint),
            ...toughMarks(cell, look, palette, scale),
          ]),
        );
      }),
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
  regrow: untintedArt("regrow", regrowMarks),
  cage: placeholderArt("cage", 4),
  plated: placeholderArt("plated", 5),
  key: placeholderArt("key", 2),
  gate: placeholderArt("gate", 6),
} as const satisfies Readonly<Record<BrickKindId, BrickArt>>;

/** Returns the name of the frame a brick shows, as it stands; it throws for a brick no level can lay. */
export function brickFrame(brick: BrickLook): string {
  return BRICK_ART[brick.kind].frameOf(brick);
}

/** Returns the color a brick is drawn in, which its shards take. */
export function brickColor(brick: BrickLook, palette: BricksPalette): number {
  return BRICK_ART[brick.kind].colorOf(brick, palette);
}
