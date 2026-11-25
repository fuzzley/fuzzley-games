// A lock: `lock()` in `docs/rickashay/art/make-art.mjs`, a violet tile with
// a slot across it for each of its bolts, 1, 2 or 3, the bolt in it while
// it is shut, and the slot standing empty once it has slid back, the top
// bolt first, as the design's Look table has it, where the art leaves a dim
// stub of the bolt at the slot's right, which reads as a bolt part-way in.
// The tile is the violet ink's, which a brick in a violet row shows too,
// and its slots and bolts a frame over it for each look.
//
// A lock's look is its own and the flight's: the rules give it its bolts as
// its tint, and the view writes the bolts the flight has drawn back into
// the wall it draws, `lockTint()` in `../lock_tint.ts`, so the bolts slide
// back as the turns draw them, and a wall the rules make shows every lock
// shut.
//
// The slots are cut out in the marks' color, the field's, as a tough
// brick's pips are, where the art darkens the violet, which keeps under 3:1
// against the tile; the bolts are steel, where the art's are lighter, which
// keeps under 3:1 against the light palettes' field.

import { cellFrame, detailed } from "@fz/brick-wall/view/art";
import { TINT } from "@fz/brick-wall/view/inks";
import { itemAt } from "@fz/core/records";
import {
  type Area,
  type ArtScale,
  type DrawCommand,
  circle,
  roundRect,
} from "@fz/phaser/shapes";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import {
  BOLTS,
  type Bolts,
  FRAMES,
  type FrameName,
  LOCK_LOOKS,
} from "../frames";
import { boltsBack, lockBolts } from "../lock_tint";

/**
 * Says how a slot lies across its cell, as shares of it, the art's: from
 * its left end to its right, and half its height either side of its middle.
 */
const SLOT = { left: 0.15, right: 0.85, half: 0.08 } as const;

/** Where each slot's middle lies down its cell, by the lock's bolts, as shares of it, the art's, the top slot first. */
const SLOT_ROWS = {
  1: [0.48],
  2: [0.35, 0.61],
  3: [0.26, 0.48, 0.7],
} as const satisfies Readonly<Record<Bolts, readonly number[]>>;

/** How far a bolt lies in from its slot's edge, the slot's rim showing round it, as a share of the cell: a device pixel at least at every unit the art is drawn at, 24 CSS pixels and up. */
const RIM = 0.03;

/** Where a shut bolt's keyhole lies across its cell and how round it is, as shares of the cell, the art's. */
const KEYHOLE = { across: 0.3, radius: 0.026 } as const;

/**
 * A lock's layers, by its bolts from 1, then by how many of them are drawn
 * back, from none: the violet tile and the frame of its look. Made once,
 * so finding a lock's makes nothing.
 */
const LOCK_LAYERS: readonly (readonly (readonly FrameName[])[])[] = BOLTS.map(
  (bolts) =>
    [...LOCK_LOOKS[bolts]]
      .reverse()
      .map((look) => [FRAMES.tile(TINT.violet), FRAMES.lock(look)]),
);

/**
 * Returns a slot in its cell, its middle a share down it, cut out in the
 * marks' color, with its bolt shut in it in steel, or empty once its bolt
 * is drawn back, each round at its ends, their edges on whole device
 * pixels; and a shut bolt's keyhole, cut out of it, at a scale that shows
 * the finest detail.
 */
function slotCommands(
  cell: Area,
  middle: number,
  shut: boolean,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  const left = cell.x + Math.round(SLOT.left * cell.width);
  const right = cell.x + Math.round(SLOT.right * cell.width);
  const top = cell.y + Math.round((middle - SLOT.half) * cell.height);
  const foot = cell.y + Math.round((middle + SLOT.half) * cell.height);
  const slot = roundRect(
    { x: left, y: top, width: right - left, height: foot - top },
    (foot - top) / 2,
    { color: palette.mark },
  );
  if (!shut) return [slot];
  const rim = Math.round(RIM * cell.width);
  const bolt = {
    x: left + rim,
    y: top + rim,
    width: right - left - 2 * rim,
    height: foot - top - 2 * rim,
  };
  return [
    slot,
    roundRect(bolt, bolt.height / 2, { color: palette.steel }),
    ...(detailed(scale)
      ? [
          circle(
            {
              x: cell.x + KEYHOLE.across * cell.width,
              y: bolt.y + bolt.height / 2,
            },
            KEYHOLE.radius * cell.width,
            { color: palette.mark },
          ),
        ]
      : []),
  ];
}

/**
 * Returns a look's slots and bolts in its cell: a slot for each of its
 * bolts, the top ones drawn back first, the rest shut in theirs.
 */
function lookCommands(
  cell: Area,
  bolts: Bolts,
  shut: number,
  palette: WallPalette,
  scale: ArtScale,
): readonly DrawCommand[] {
  return SLOT_ROWS[bolts].flatMap((middle, slot) =>
    slotCommands(cell, middle, slot >= bolts - shut, palette, scale),
  );
}

/**
 * How a lock is drawn: the violet tile, whatever its row, under a slot for
 * each of its bolts, each with its bolt shut in it or empty once it is
 * drawn back, by its tint, as the rules give it and the view writes it. It brings every look
 * of a lock of 1, 2 and 3 bolts to the atlas, the keyholes drawn only at a
 * scale that shows the finest detail.
 *
 * It finds no layers for a tint that gives a lock no bolts, more than 3, or
 * more drawn back than it has, throwing a `RangeError`.
 */
export const LOCK_ART = {
  layersOf: ({ tint }) =>
    itemAt(itemAt(LOCK_LAYERS, lockBolts(tint) - 1), boltsBack(tint)),
  frames: (palette, scale) =>
    BOLTS.flatMap((bolts) =>
      // A lock's looks run from none of its bolts shut to all of them.
      LOCK_LOOKS[bolts].map((look, shut) =>
        cellFrame(FRAMES.lock(look), scale, (cell) =>
          lookCommands(cell, bolts, shut, palette, scale),
        ),
      ),
    ),
} as const satisfies KindArt;
