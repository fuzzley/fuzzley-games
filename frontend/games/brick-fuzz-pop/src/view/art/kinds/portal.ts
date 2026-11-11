// A portal, which sends a fuzzball out of its twin: not solid, a thick ring
// round a dark middle, three arms spiralling out of it, and a badge on its ring
// telling its pair from the other, a dot on the first pair's and a diamond on
// the second's, `portal()` in `docs/archive/brick-fuzz-pop/art/make-art.mjs`.
// Each pair's badge is the one the legend's `PORTAL_BADGES` names, which R
// reads a portal by. The diamond is hollow and larger than the art's, which at
// the least units reads as a dot, on a disc a little larger, so the two pairs
// differ in shape, not in color alone.

import {
  type Area,
  type ArtScale,
  type DrawCommand,
  type FillStyle,
  type Point,
  circle,
  polygon,
  ring,
  stroke,
  widthOf,
} from "@fz/phaser/shapes";
import { PORTAL_BADGES } from "../../../rules/levels/legend";
import type { KindInks, WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, type PortalMark } from "../frames";
import { itemAt } from "../../items";
import { EIGHTH, cellFrame, diamond, pointAt, turned } from "../symbols";

/** Its dark middle's radius, as a share of its cell. */
const MIDDLE = 0.33;

/** Its ring: its radius, the middle of its band, as a share of its cell, and how wide its band is, in field units. */
const RING = { radius: 0.36, width: 0.1 } as const;

/**
 * Its arms, each spiralling out from where it starts, in degrees clockwise
 * from its cell's right: how far from the middle each runs, from and to, as
 * shares of its cell; how far round it turns as it does, in degrees; how
 * many points it is drawn through; and how wide it is, in field units.
 */
const ARMS = {
  starts: [0, 120, 240],
  from: 0.075,
  to: 0.27,
  turn: 215,
  points: 15,
  width: 0.044,
} as const;

/**
 * Its badge, on its ring up and to the right of its middle, toward its
 * cell's top right corner: its disc's radius; a dot's radius; and how far a
 * diamond's points reach from its middle, as shares of its cell, and how
 * wide its band is round the hole cut in it, in field units.
 */
const BADGE = { disc: 0.145, dot: 0.084, diamond: 0.13, band: 0.035 } as const;

/** A badge a pair's portals carry, as the legend names it. */
type PortalBadge = (typeof PORTAL_BADGES)[number];

/** Says where a badge's mark is drawn and in what: about the badge's middle in a cell at a scale, in its pair's glyph's color, on its disc's. */
interface BadgeDrawing {
  readonly middle: Point;
  readonly cell: Area;
  readonly scale: ArtScale;
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
  dot: ({ middle, cell, glyph }) => [
    circle(middle, BADGE.dot * cell.width, glyph),
  ],
  diamond: ({ middle, cell, scale, glyph, disc }) => {
    const reach = BADGE.diamond * cell.width;
    const band = widthOf(BADGE.band, scale);
    // A diamond's sides lie its reach over √2 from its middle, so a band
    // as wide takes √2 times as much off its reach.
    return [
      polygon(diamond(middle, reach), glyph),
      polygon(diamond(middle, Math.max(0, reach - Math.SQRT2 * band)), disc),
    ];
  },
};

/** The marks, in order, each drawn in its pair's inks with its pair's badge. */
const MARKS = [1, 2] as const satisfies readonly PortalMark[];

/** A portal's layers, by its tint, its pair's place: the first pair's, then the second's. */
const PORTAL_LAYERS: readonly (readonly FrameName[])[] = MARKS.map((mark) => [
  FRAMES.portal(mark),
]);

/** Returns an arm drawn from its middle, where it starts, as points out along it. */
function armOf(middle: Point, start: number, side: number): readonly Point[] {
  return Array.from({ length: ARMS.points }, (_, i) => {
    const along = i / (ARMS.points - 1);
    const reach = (ARMS.from + (ARMS.to - ARMS.from) * along) * side;
    const way = turned({ x: reach, y: 0 }, start + ARMS.turn * along);
    return { x: middle.x + way.x, y: middle.y + way.y };
  });
}

/**
 * Returns a portal drawn in its cell in its pair's inks: its middle in its
 * face's color, its arms in its glyph's, round at their ends and bends, its
 * ring in its body's, and its badge cut out of the ring, in the marks'
 * color, with its pair's badge's mark on it in its glyph's.
 */
function portalCommands(
  cell: Area,
  palette: WallPalette,
  inks: KindInks,
  badge: PortalBadge,
  scale: ArtScale,
): readonly DrawCommand[] {
  const middle = pointAt(cell, 0.5, 0.5);
  const arm = { color: inks.glyph, width: widthOf(ARMS.width, scale) };
  const onRing = {
    x: middle.x + EIGHTH * RING.radius * cell.width,
    y: middle.y - EIGHTH * RING.radius * cell.height,
  };
  const disc = { color: palette.mark };
  return [
    circle(middle, MIDDLE * cell.width, { color: inks.face }),
    ...ARMS.starts.flatMap((start) =>
      stroke(armOf(middle, start, cell.width), arm),
    ),
    ring(middle, RING.radius * cell.width, {
      color: inks.body,
      width: widthOf(RING.width, scale),
    }),
    circle(onRing, BADGE.disc * cell.width, disc),
    ...BADGE_MARKS[badge]({
      middle: onRing,
      cell,
      scale,
      glyph: { color: inks.glyph },
      disc,
    }),
  ];
}

/**
 * How a portal is drawn: one frame, by its pair, in that pair's inks and
 * with its badge, as its tint says, the first pair's 0 and the second's 1.
 *
 * It finds no layers for a tint no pair has, throwing a `RangeError`.
 */
export const PORTAL_ART: KindArt = {
  layersOf: ({ tint }) => itemAt(PORTAL_LAYERS, tint),
  frames: (palette, scale) =>
    MARKS.map((mark, i) =>
      cellFrame(FRAMES.portal(mark), scale, (cell) =>
        portalCommands(
          cell,
          palette,
          itemAt(palette.portals, i),
          itemAt(PORTAL_BADGES, i),
          scale,
        ),
      ),
    ),
};
