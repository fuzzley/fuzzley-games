// The marks a brick game draws over a slab, in the shapes' commands, their
// inks handed in. A mark that is round or stands in a square, such as a
// bomb, a portal or a bumper, is laid out at shares of a square it is handed,
// its lines' widths too, each a CSS pixel at least at the pixel ratio it is
// handed, as Brick Fuzz Pop's 100-unit tile has it: a square tile hands it
// its cell, and a wider brick a square of its own, as large as the mark,
// which may reach past the brick's top and foot, whose size and place set
// the mark's. A mark laid out across a brick, such as a cap of moss, a
// cage's bars, rivets or a plate's teeth, takes its places and sizes from
// its caller, as a square tile's and a wide brick's differ.

import { mixColors } from "../color";
import {
  FUZZBALL_STRANDS,
  type Strand,
  eyesCommands,
  fuzzballCommands,
} from "../fuzzball";
import {
  type Area,
  type CircleCommand,
  type DrawCommand,
  type FillStyle,
  type LineStyle,
  ORIGIN,
  type Point,
  arcPoints,
  bandAlong,
  circle,
  diamond,
  ellipsePoints,
  placed,
  pointAt,
  polygon,
  rect,
  ring,
  shifted,
  star,
  stroke,
  turned,
  widthOf,
  within,
} from "../shapes";
import { type SlabShares, slabBody, topCap } from "./slab";

const WHITE = 0xffffff;
const BLACK = 0x000000;

/** The cosine and the sine of an eighth of a turn. */
const EIGHTH = Math.SQRT1_2;

/** Says what a bomb is drawn in: what is cut out of its slab, the shine on its body, and its spark. */
export interface BombInks {
  readonly cut: number;
  readonly shine: number;
  readonly spark: number;
}

/** The bomb's round body, its middle and its radius, as shares of its square. */
const BOMB_BODY = { across: 0.46, down: 0.56, radius: 0.195 } as const;

/**
 * The bomb's neck, a block 0.14 of its square long and 0.1 thick turned an
 * eighth of a turn back from lying across it, toward the fuse, about a
 * middle on the bomb's rim: its corners, as shares of its square.
 */
const BOMB_NECK: readonly (readonly [number, number])[] = (
  [
    [-0.07, -0.05],
    [0.07, -0.05],
    [0.07, 0.05],
    [-0.07, 0.05],
  ] as const
).map(
  ([across, down]) =>
    [
      0.612 + (across + down) * EIGHTH,
      0.408 + (down - across) * EIGHTH,
    ] as const,
);

/** The bomb's fuse, from its neck to its spark, as shares of its square. */
const BOMB_FUSE = [
  [0.63, 0.39],
  [0.675, 0.32],
  [0.72, 0.275],
] as const;

/** How wide the bomb's fuse is, as a share of its square. */
const FUSE_WIDTH = 0.036;

/** The shine on the bomb, an arc about its middle: its radius, as a share of its square, and where it runs, in degrees clockwise from the right. */
const BOMB_SHINE = { radius: 0.125, from: 196, to: 248 } as const;

/** How wide the bomb's shine is, as a share of its square. */
const SHINE_WIDTH = 0.034;

/**
 * The spark at the fuse's end, a star of four points about a middle, as
 * shares of its square: cut out of the slab, round a spark lit in its own
 * color.
 */
const BOMB_SPARK = {
  across: 0.765,
  down: 0.235,
  cut: { outer: 0.15, inner: 0.064 },
  lit: { outer: 0.105, inner: 0.036 },
} as const;

/** Returns an angle given in degrees in radians. */
function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns a line's width, given as a share of a square, in whole device
 * pixels, a CSS pixel at least at a pixel ratio, as `widthOf()` gives one
 * in field units, so a mark's lines grow with its square.
 */
function widthIn(square: Area, share: number, pixelRatio: number): number {
  return widthOf(share, { unit: square.width, pixelRatio });
}

/** Throws for an area that isn't square, which a mark that stands in a square would draw stretched. */
function requireSquare(area: Area): void {
  if (area.width !== area.height) {
    throw new RangeError(
      `A mark stands in a square, not in ${String(area.width)} by ${String(area.height)}`,
    );
  }
}

/**
 * Returns a bomb drawn in a square: its round body, its neck and its fuse
 * cut out of its slab, the shine on its body, and the spark at its fuse's
 * end, lit on a larger star cut out round it. The dots toward the bricks a
 * bomb reaches are each game's, as its grid is.
 *
 * @throws {RangeError} for an area that isn't square.
 */
export function bombMark(
  square: Area,
  inks: BombInks,
  pixelRatio: number,
): readonly DrawCommand[] {
  requireSquare(square);
  const cut = { color: inks.cut };
  const middle = pointAt(square, BOMB_BODY.across, BOMB_BODY.down);
  const spark = pointAt(square, BOMB_SPARK.across, BOMB_SPARK.down);
  return [
    circle(middle, BOMB_BODY.radius * square.width, cut),
    polygon(within(square, BOMB_NECK), cut),
    ...stroke(within(square, BOMB_FUSE), {
      color: inks.cut,
      width: widthIn(square, FUSE_WIDTH, pixelRatio),
    }),
    ...stroke(
      arcPoints(
        middle,
        BOMB_SHINE.radius * square.width,
        radians(BOMB_SHINE.from),
        radians(BOMB_SHINE.to),
      ),
      { color: inks.shine, width: widthIn(square, SHINE_WIDTH, pixelRatio) },
    ),
    polygon(
      star(
        spark,
        BOMB_SPARK.cut.outer * square.width,
        BOMB_SPARK.cut.inner * square.width,
        4,
      ),
      cut,
    ),
    polygon(
      star(
        spark,
        BOMB_SPARK.lit.outer * square.width,
        BOMB_SPARK.lit.inner * square.width,
        4,
      ),
      { color: inks.spark },
    ),
  ];
}

/** Says how a cap's foot is scalloped, in device pixels: how many scallops, each how round, and how far under each its shadow lies. */
export interface Scallops {
  readonly count: number;
  readonly radius: number;
  readonly drop: number;
}

/** Says what a cap is drawn in: the cap and its scallops, and the shadow under each scallop. */
export interface CapInks {
  readonly cap: number;
  readonly shadow: number;
}

/**
 * Returns a cap over a slab's body in its cell, as moss grows on a brick:
 * over its top, round and cut across its corners as the slab's shares say,
 * to a foot of scallops, the first and last flush with the body's sides,
 * each over a shadow.
 *
 * @throws {RangeError} for a count of scallops that isn't a whole number,
 *   or is under two, which can't reach from one side to the other.
 */
export function scallopedCap(
  cell: Area,
  shares: SlabShares,
  foot: number,
  scallops: Scallops,
  inks: CapInks,
): readonly DrawCommand[] {
  if (!Number.isInteger(scallops.count) || scallops.count < 2) {
    throw new RangeError(
      `A cap's foot takes two scallops or more, not ${String(scallops.count)}`,
    );
  }
  const body = slabBody(cell, shares);
  const middles = Array.from({ length: scallops.count }, (_, at) => ({
    x:
      body.x +
      scallops.radius +
      ((body.width - 2 * scallops.radius) * at) / (scallops.count - 1),
    y: foot,
  }));
  return [
    ...middles.map((middle) =>
      circle({ x: middle.x, y: middle.y + scallops.drop }, scallops.radius, {
        color: inks.shadow,
      }),
    ),
    polygon(topCap(cell, shares, foot), { color: inks.cap }),
    ...middles.map((middle) =>
      circle(middle, scallops.radius, { color: inks.cap }),
    ),
  ];
}

/** A sprout's stem, from its foot up to its leaves, as shares of its square, its top as much lower than the design's as its leaves. */
const STEM = [
  [0.5, 0.3],
  [0.5, 0.179],
] as const;

/** How wide a sprout's stem is, as a share of its square. */
const STEM_WIDTH = 0.034;

/**
 * A sprout's two leaves, each an ellipse about its middle, as shares of its
 * square, turned from lying flat: a little lower than the design's, so each
 * keeps a device pixel under Brick Fuzz Pop's tile's top at every scale.
 */
const LEAVES = [
  { middle: [0.405, 0.141], degrees: 32 },
  { middle: [0.595, 0.141], degrees: -32 },
] as const;

/** How far a leaf reaches along itself and across, either side of its middle, as shares of its square. */
const LEAF = { along: 0.082, across: 0.044 } as const;

/**
 * Returns a sprout drawn in a square, as a cap of moss carries it: a stem
 * standing at 0.3 of the square down its middle, and two leaves rising away
 * from its top.
 *
 * @throws {RangeError} for an area that isn't square.
 */
export function sproutMark(
  square: Area,
  color: number,
  pixelRatio: number,
): readonly DrawCommand[] {
  requireSquare(square);
  return [
    ...stroke(within(square, STEM), {
      color,
      width: widthIn(square, STEM_WIDTH, pixelRatio),
    }),
    ...LEAVES.map(({ middle: [across, down], degrees }) =>
      polygon(
        placed(
          ellipsePoints(
            ORIGIN,
            LEAF.along * square.width,
            LEAF.across * square.width,
          ).map((point) => turned(point, degrees)),
          1,
          pointAt(square, across, down),
        ),
        { color },
      ),
    ),
  ];
}

/** How wide a stroke of sheen is, as a share of its square. */
const SHEEN_WIDTH = 0.046;

/** How much white the sheen takes over the steel. */
const SHEEN_LIGHT = 0.5;

/** The two strokes of sheen, each from one end to the other, as shares of its square. */
const SHEEN = [
  [
    [0.38, 0.57],
    [0.56, 0.39],
  ],
  [
    [0.5, 0.61],
    [0.63, 0.48],
  ],
] as const;

/**
 * Returns the sheen on steel of an ink drawn in a square: two strokes
 * rising to the right, half white over the steel, round at their ends.
 *
 * @throws {RangeError} for an area that isn't square.
 */
export function sheen(
  square: Area,
  steel: number,
  pixelRatio: number,
): readonly DrawCommand[] {
  requireSquare(square);
  const style = {
    color: mixColors(WHITE, steel, SHEEN_LIGHT),
    width: widthIn(square, SHEEN_WIDTH, pixelRatio),
  };
  return SHEEN.flatMap((points) => stroke(within(square, points), style));
}

/**
 * Returns rivets in an area, a rivet at each share across it on each share
 * down it, row by row from the top: four in the corners of a steel brick's
 * frame, or two along a plate.
 */
export function rivets(
  area: Area,
  across: readonly number[],
  down: readonly number[],
  radius: number,
  style: FillStyle,
): readonly CircleCommand[] {
  return down.flatMap((y) =>
    across.map((x) => circle(pointAt(area, x, y), radius, style)),
  );
}

/** A badge that tells one pair of portals from the other, in shape and not in color alone. */
export type PortalBadge = "dot" | "diamond";

/** Says what a portal is drawn in: its dark middle, its ring, its arms and its badge's mark, and the disc its badge sits on. */
export interface PortalInks {
  readonly middle: number;
  readonly ring: number;
  readonly glyph: number;
  readonly disc: number;
}

/** A portal's dark middle's radius, as a share of its square. */
const PORTAL_MIDDLE = 0.33;

/** A portal's ring: its radius, the middle of its band, and how wide its band is, as shares of its square. */
const PORTAL_RING = { radius: 0.36, width: 0.1 } as const;

/**
 * A portal's arms, each spiralling out from where it starts, in degrees
 * clockwise from the right: how far from the middle each runs, from and to,
 * as shares of its square; how far round it turns as it does, in degrees;
 * how many points it is drawn through; and how wide it is, as a share of its
 * square.
 */
const PORTAL_ARMS = {
  starts: [0, 120, 240],
  from: 0.075,
  to: 0.27,
  turn: 215,
  points: 15,
  width: 0.044,
} as const;

/**
 * A portal's badge, on its ring up and to the right of its middle: its
 * disc's radius; a dot's radius; how far a diamond's points reach from its
 * middle; and how wide its band is round the hole cut in it, as shares of
 * its square.
 */
const PORTAL_BADGE = {
  disc: 0.145,
  dot: 0.084,
  diamond: 0.13,
  band: 0.035,
} as const;

/** Says where a badge's mark is drawn and in what: about its middle in a square at a pixel ratio, in a glyph's color, on its disc's. */
interface BadgeDrawing {
  readonly middle: Point;
  readonly square: Area;
  readonly pixelRatio: number;
  readonly glyph: FillStyle;
  readonly disc: FillStyle;
}

/**
 * Each badge's mark: a solid dot; or a hollow diamond, a band a CSS pixel
 * wide at least round a hole of the disc's color, its points reaching past
 * the dot's edge, so at the least units the two differ in shape, and
 * within the disc.
 */
const BADGE_MARKS: Readonly<
  Record<PortalBadge, (drawing: BadgeDrawing) => readonly DrawCommand[]>
> = {
  dot: ({ middle, square, glyph }) => [
    circle(middle, PORTAL_BADGE.dot * square.width, glyph),
  ],
  diamond: ({ middle, square, pixelRatio, glyph, disc }) => {
    const reach = PORTAL_BADGE.diamond * square.width;
    const band = widthIn(square, PORTAL_BADGE.band, pixelRatio);
    // A diamond's sides lie its reach over √2 from its middle, so a band
    // as wide takes √2 times as much off its reach.
    return [
      polygon(diamond(middle, reach), glyph),
      polygon(diamond(middle, Math.max(0, reach - Math.SQRT2 * band)), disc),
    ];
  },
};

/** Returns a portal's arm about its middle in a square, from where it starts, as points out along it. */
function armOf(middle: Point, start: number, side: number): readonly Point[] {
  return Array.from({ length: PORTAL_ARMS.points }, (_, i) => {
    const along = i / (PORTAL_ARMS.points - 1);
    const reach =
      (PORTAL_ARMS.from + (PORTAL_ARMS.to - PORTAL_ARMS.from) * along) * side;
    const way = turned({ x: reach, y: 0 }, start + PORTAL_ARMS.turn * along);
    return { x: middle.x + way.x, y: middle.y + way.y };
  });
}

/**
 * Returns a portal drawn about the middle of a square: its dark middle,
 * three arms spiralling out of it, round at their ends and bends, a thick
 * ring round it, and on the ring, up and to the right, a disc with its
 * pair's badge on it.
 *
 * @throws {RangeError} for an area that isn't square.
 */
export function portalMark(
  square: Area,
  badge: PortalBadge,
  inks: PortalInks,
  pixelRatio: number,
): readonly DrawCommand[] {
  requireSquare(square);
  const middle = pointAt(square, 0.5, 0.5);
  const arm = {
    color: inks.glyph,
    width: widthIn(square, PORTAL_ARMS.width, pixelRatio),
  };
  const onRing = {
    x: middle.x + EIGHTH * PORTAL_RING.radius * square.width,
    y: middle.y - EIGHTH * PORTAL_RING.radius * square.height,
  };
  const disc = { color: inks.disc };
  return [
    circle(middle, PORTAL_MIDDLE * square.width, { color: inks.middle }),
    ...PORTAL_ARMS.starts.flatMap((start) =>
      stroke(armOf(middle, start, square.width), arm),
    ),
    ring(middle, PORTAL_RING.radius * square.width, {
      color: inks.ring,
      width: widthIn(square, PORTAL_RING.width, pixelRatio),
    }),
    circle(onRing, PORTAL_BADGE.disc * square.width, disc),
    ...BADGE_MARKS[badge]({
      middle: onRing,
      square,
      pixelRatio,
      glyph: { color: inks.glyph },
      disc,
    }),
  ];
}

/** Says what a bumper is drawn in: the ticks kicking out of it, its disc, and the ring cut out of the disc. */
export interface BumperInks {
  readonly ticks: number;
  readonly disc: number;
  readonly ring: number;
}

/** The way a bumper's tick toward its square's bottom right kicks out from its middle unless a game gives another: toward the corner. */
const CORNER_WAY: Point = { x: EIGHTH, y: EIGHTH };

/** How far from its square's middle each tick runs, from and to, and how wide it is, as shares of the square. */
const TICK = { from: 0.435, to: 0.495, width: 0.05 } as const;

/** A bumper's disc: where its middle lies, a little above its square's, and its radius, as shares of its square. */
const DISC = { across: 0.5, down: 0.485, radius: 0.37 } as const;

/** How far below its disc its shadow lies, as a share of its square. */
const DISC_DROP = 0.035;

/** How much black a bumper's shadow takes over its disc's color. */
const DISC_SHADE = 0.28;

/** The ring cut out of a bumper's disc: its radius, the middle of its band, and how wide it is, as shares of its square. */
const DISC_RING = { radius: 0.24, width: 0.075 } as const;

/** The cap in a bumper's middle: its radius, as a share of its square, and how much white it takes over its disc's color. */
const DISC_CAP = { radius: 0.105, light: 0.52 } as const;

/**
 * Returns a bumper drawn about the middle of a square: four ticks kicking
 * out, round at their ends, from the bottom right clockwise, then its disc
 * on a shadow darker, a ring cut out of it, and a cap lighter in its middle.
 *
 * @param tickWay The way the tick toward the bottom right kicks out from
 *   the middle, a point a unit from the origin, which the other three
 *   mirror: toward the corner unless given.
 * @throws {RangeError} for an area that isn't square.
 */
export function bumperMark(
  square: Area,
  inks: BumperInks,
  pixelRatio: number,
  tickWay: Point = CORNER_WAY,
): readonly DrawCommand[] {
  requireSquare(square);
  const tick = {
    color: inks.ticks,
    width: widthIn(square, TICK.width, pixelRatio),
  };
  const ways = [
    tickWay,
    { x: -tickWay.x, y: tickWay.y },
    { x: -tickWay.x, y: -tickWay.y },
    { x: tickWay.x, y: -tickWay.y },
  ];
  const middle = pointAt(square, 0.5, 0.5);
  const disc = pointAt(square, DISC.across, DISC.down);
  const radius = DISC.radius * square.width;
  return [
    ...ways.flatMap((way) =>
      stroke(
        [TICK.from, TICK.to].flatMap((reach) =>
          placed([way], reach * square.width, middle),
        ),
        tick,
      ),
    ),
    circle({ x: disc.x, y: disc.y + DISC_DROP * square.height }, radius, {
      color: mixColors(BLACK, inks.disc, DISC_SHADE),
    }),
    circle(disc, radius, { color: inks.disc }),
    ring(disc, DISC_RING.radius * square.width, {
      color: inks.ring,
      width: widthIn(square, DISC_RING.width, pixelRatio),
    }),
    circle(disc, DISC_CAP.radius * square.width, {
      color: mixColors(WHITE, inks.disc, DISC_CAP.light),
    }),
  ];
}

/** Says what a caged friend is drawn in: its body and fur, and its eyes. */
export interface FriendInks {
  readonly body: number;
  readonly eyes: number;
}

/**
 * Returns the friend a cage holds, the fuzzball, about its body's middle, a
 * number of device pixels to a unit of its grid: its body and fur, then its
 * eyes.
 *
 * Its fur is the fuzzball's own unless given, as none where a cage is drawn
 * too small for strands a CSS pixel wide.
 */
export function cagedFriend(
  middle: Point,
  by: number,
  inks: FriendInks,
  fur: readonly Strand[] = FUZZBALL_STRANDS,
): readonly DrawCommand[] {
  return [
    ...fuzzballCommands(by, { color: inks.body, fur }),
    ...eyesCommands(by, { color: inks.eyes }),
  ].map((command) => shifted(command, middle));
}

/** Whether a cage stands whole or has taken a hit, which breaks a bar. */
export type CageLook = "whole" | "hit";

/**
 * Says how an end of a cage's broken bar is bent aside: from which end of
 * the bar it runs; how far down its area it bends; and where it ends, how
 * far aside of the bar and how far down the area, as shares of the area.
 */
export interface BrokenEnd {
  readonly from: "top" | "foot";
  readonly bend: number;
  readonly aside: number;
  readonly down: number;
}

/**
 * Says how a cage's bars stand in its area: the middles of those left of
 * its middle, as shares across it, which those right of it mirror; how far
 * down it their tops lie, as a share of it, their feet as far up from its
 * bottom; and the two ends of the bar a hit breaks, the first right of its
 * middle.
 */
export interface CageBars {
  readonly lefts: readonly number[];
  readonly top: number;
  readonly broken: readonly BrokenEnd[];
}

/**
 * Returns a cage's bars in an area, in a line's color and width, those
 * right of its middle as far from its right as those left of it from its
 * left: each standing whole, or the first right of the middle, once the
 * cage is hit, as its two ends, each bent aside. Each bar's edges lie on
 * whole pixels where the area's do and the line's width is whole.
 */
export function cageBars(
  area: Area,
  bars: CageBars,
  look: CageLook,
  style: LineStyle,
): readonly DrawCommand[] {
  const { color, width } = style;
  const top = Math.round(bars.top * area.height);
  const ends = { top, foot: area.height - top };
  const lefts = bars.lefts.map((across) =>
    Math.round(across * area.width - width / 2),
  );
  const all = [
    ...lefts,
    ...lefts.map((left) => area.width - left - width).reverse(),
  ];
  return all.flatMap((left, i): readonly DrawCommand[] => {
    const x = area.x + left;
    if (look === "whole" || i !== lefts.length) {
      return [
        rect(
          { x, y: area.y + ends.top, width, height: ends.foot - ends.top },
          { color },
        ),
      ];
    }
    const middle = x + width / 2;
    return bars.broken.map(({ from, bend, aside, down }) => {
      const points: readonly Point[] = [
        { x: middle, y: area.y + ends[from] },
        { x: middle, y: area.y + bend * area.height },
        { x: middle + aside * area.width, y: area.y + down * area.height },
      ];
      return polygon(bandAlong(points, width), { color });
    });
  });
}

/**
 * Says where a row of a plate's teeth stands, in device pixels: from how
 * far across, over how wide a span, how many, how far each is cut back from
 * its share of the span on each side, and how far down their feet and
 * their tips lie.
 */
export interface PlateTeeth {
  readonly from: number;
  readonly span: number;
  readonly count: number;
  readonly gap: number;
  readonly foot: number;
  readonly tip: number;
}

/**
 * Returns the teeth a plate points out of its edge, as a polygon's points
 * each: from its left foot, by its tip, to its right foot, each tooth a
 * like share of the span: pointing down where their tips lie below their
 * feet, as a plate along a brick's foot has them, which a plate on another
 * face turns.
 *
 * @throws {RangeError} for a count of teeth that isn't a whole number from
 *   one.
 */
export function plateTeeth(teeth: PlateTeeth): readonly (readonly Point[])[] {
  if (!Number.isInteger(teeth.count) || teeth.count < 1) {
    throw new RangeError(
      `A plate points out one tooth or more, not ${String(teeth.count)}`,
    );
  }
  const pitch = teeth.span / teeth.count;
  return Array.from({ length: teeth.count }, (_, i) => {
    const left = teeth.from + pitch * i + teeth.gap;
    const right = teeth.from + pitch * (i + 1) - teeth.gap;
    return [
      { x: left, y: teeth.foot },
      { x: (left + right) / 2, y: teeth.tip },
      { x: right, y: teeth.foot },
    ];
  });
}
