// A portal, which sends a fuzzball out of its twin: not solid, a thick ring
// round a dark middle, three arms spiralling out of it, and a badge on its
// ring telling its pair from the other, a dot on the first pair's and a
// diamond on the second's, `portal()` in
// `docs/brick-fuzz-pop/art/make-art.mjs`. Each pair's badge is the one the
// legend's `PORTAL_BADGES` names, which R reads a portal by.

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
 * cell's top right corner: its disc's radius, and how far its mark reaches
 * from its middle, a dot's radius or a diamond's points, as shares of its
 * cell.
 */
const BADGE = { disc: 0.135, dot: 0.084, diamond: 0.104 } as const;

/** A badge a pair's portals carry, as the legend names it. */
type PortalBadge = (typeof PORTAL_BADGES)[number];

/** Each badge's mark, drawn about the badge's middle in its cell, in a style: a dot, or a diamond. */
const BADGE_MARKS: Readonly<
  Record<
    PortalBadge,
    (middle: Point, cell: Area, style: FillStyle) => DrawCommand
  >
> = {
  dot: (middle, cell, style) => circle(middle, BADGE.dot * cell.width, style),
  diamond: (middle, cell, style) =>
    polygon(diamond(middle, BADGE.diamond * cell.width), style),
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
  return [
    circle(middle, MIDDLE * cell.width, { color: inks.face }),
    ...ARMS.starts.flatMap((start) =>
      stroke(armOf(middle, start, cell.width), arm),
    ),
    ring(middle, RING.radius * cell.width, {
      color: inks.body,
      width: widthOf(RING.width, scale),
    }),
    circle(onRing, BADGE.disc * cell.width, { color: palette.mark }),
    BADGE_MARKS[badge](onRing, cell, { color: inks.glyph }),
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
