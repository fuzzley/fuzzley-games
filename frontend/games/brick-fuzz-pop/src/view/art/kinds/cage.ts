// A cage: a steel tile, its inside darker, a friend behind four bars, and, once
// it has taken a hit, a bar broken and a crack in its frame, `cage()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`. Each cage holds a friend in
// an ink of its own, which its tint picks, so a cage is two layers: its tile
// and inside with its friend, a frame for each ink, under its bars, whole or
// hit, drawn with `@fz/phaser/bricks`' `cagedFriend()` and `cageBars()`.

import { type CageBars, cageBars, cagedFriend } from "@fz/phaser/bricks";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  polygon,
  roundRect,
  widthOf,
  within,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import { type CageLook, FRAMES, type FrameName, INKS } from "../frames";
import { itemAt } from "../../items";
import {
  ACROSS,
  CRACK_WIDTH,
  bandAlong,
  cellFrame,
  detailed,
  pointAt,
} from "../symbols";
import { tileBody, tileCommands } from "./brick";

/** How far in its inside lies from each side of its cell, across and down, as shares of it. */
const INSIDE = { across: 0.11, down: 0.2 } as const;

/** How round its inside's corners are, as a share of its cell. */
const INSIDE_CORNER = 0.03;

/**
 * The friend in a cage, about its body's middle, as shares of its cell:
 * where it sits, and how much of the cell a unit of the fuzzball's grid is,
 * 1.5 of the design's 100 units, as its `cage()` scales it: 0.6 of the
 * fuzzball in play.
 */
const FRIEND = { across: 0.5, down: 0.505, grid: 0.015 } as const;

/**
 * How its bars stand in its cell: the middles of its two left bars across
 * it, which the two right ones mirror; how far down it their tops lie, a
 * little past its inside, their feet as far up from its bottom; and the two
 * ends of the bar a hit breaks, the third from its left, each from where the
 * whole bar would end, bent aside: how far down it each bends, and where it
 * ends, how far aside of the bar and how far down, as shares of the cell.
 */
const BARS: CageBars = {
  lefts: [0.215, 0.38],
  top: 0.19,
  broken: [
    { from: "top", bend: 0.3, aside: 0.08, down: 0.385 },
    { from: "foot", bend: 0.72, aside: -0.07, down: 0.64 },
  ],
};

/** How wide a bar is, in field units. */
const BAR_WIDTH = 0.056;

/**
 * The crack a hit leaves in its frame, down from the top edge of its tile
 * to its inside, as shares of its tile's body, its first end cut along the
 * edge, so it paints nothing outside the tile.
 */
const CRACK = [
  [0.75, 0],
  [0.696, 0.054],
  [0.772, 0.098],
  [0.728, 0.174],
] as const;

/** Returns a cage's inside in its cell, its edges on whole pixels, as far in from the cell's right and bottom as from its left and top. */
function insideOf(cell: Area): Area {
  const across = Math.round(INSIDE.across * cell.width);
  const down = Math.round(INSIDE.down * cell.height);
  return {
    x: cell.x + across,
    y: cell.y + down,
    width: cell.width - 2 * across,
    height: cell.height - 2 * down,
  };
}

/**
 * Returns a cage's tile and inside drawn in its cell, and the friend it
 * holds in one of the friends' inks: its tile in its body's color, its
 * inside in its face's.
 */
function cagedCommands(
  cell: Area,
  palette: WallPalette,
  ink: number,
): readonly DrawCommand[] {
  const { body, face } = palette.kinds.cage;
  return [
    ...tileCommands(cell, body),
    roundRect(insideOf(cell), INSIDE_CORNER * cell.width, { color: face }),
    ...cagedFriend(
      pointAt(cell, FRIEND.across, FRIEND.down),
      FRIEND.grid * cell.width,
      { body: itemAt(palette.friends, ink), eyes: palette.mark },
    ),
  ];
}

/**
 * Returns a cage's bars drawn in its cell, whole or hit, in its glyph's
 * color, and, once hit, the crack in its frame, cut out in the mark, where
 * a scale is detailed.
 */
function barsOverCommands(
  cell: Area,
  look: CageLook,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  return [
    ...cageBars(cell, BARS, look, {
      color: palette.kinds.cage.glyph,
      width: widthOf(BAR_WIDTH, scale),
    }),
    ...(look === "hit" && detailed(scale)
      ? [
          polygon(
            bandAlong(
              within(tileBody(cell), CRACK),
              widthOf(CRACK_WIDTH, scale),
              ACROSS,
            ),
            { color: palette.mark },
          ),
        ]
      : []),
  ];
}

/** A cage's layers, by its tint, whole and hit, made once. */
const CAGE_LAYERS: readonly Readonly<Record<CageLook, readonly FrameName[]>>[] =
  INKS.map((ink) => ({
    whole: [FRAMES.caged(ink), FRAMES.cage("whole")],
    hit: [FRAMES.caged(ink), FRAMES.cage("hit")],
  }));

/**
 * How a cage is drawn: its tile and inside with the friend it holds, in the
 * friends' ink its tint picks, under its bars, whole, then with one broken
 * once it has taken a hit.
 *
 * It finds no layers for a tint no friend's ink has, throwing a
 * `RangeError`.
 */
export const CAGE_ART: KindArt = {
  layersOf: ({ tint, hits, full }) =>
    itemAt(CAGE_LAYERS, tint)[hits < full ? "hit" : "whole"],
  frames: (palette, scale) => [
    ...INKS.map((ink) =>
      cellFrame(FRAMES.caged(ink), scale, (cell) =>
        cagedCommands(cell, palette, ink),
      ),
    ),
    ...(["whole", "hit"] as const).map((look) =>
      cellFrame(FRAMES.cage(look), scale, (cell) =>
        barsOverCommands(cell, look, palette, scale),
      ),
    ),
  ],
};
