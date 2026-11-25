// A portal, which sends a fuzzball out of its twin: no tile, a thick ring in
// its pair's ink round an eye in the page's color, three arms spiralling out of it, and a
// badge on its ring telling its pair from the other, a dot on the first
// pair's and a diamond on the second's, `kit.portal()` in
// `docs/rickashay/art/make-art.mjs`, as `@fz/phaser/bricks`' `portalMark()`
// draws it. The two pairs differ in shape, not in their inks alone.

import { cellFrame } from "@fz/brick-wall/view/art";
import { itemAt } from "@fz/core/records";
import { mixColors } from "@fz/phaser/color";
import {
  type PortalBadge,
  type PortalInks,
  portalMark,
} from "@fz/phaser/bricks";
import { brickColor } from "../../colors/brick_colors";
import type { WallPalette } from "../../colors/palette";
import type { KindArt } from "../art";
import {
  FRAMES,
  type FrameName,
  PORTAL_MARKS,
  type PortalMark,
} from "../frames";

/** How much of the field's text a portal's arms and badge take over its ring's ink, the art's. */
export const PORTAL_GLOW = 0.34;

/** Each pair's badge, by its mark: the first pair's dot, the second's diamond. */
const BADGES = {
  1: "dot",
  2: "diamond",
} as const satisfies Readonly<Record<PortalMark, PortalBadge>>;

/** A portal's layers, by its tint: its pair's frame. Made once, so finding a portal's makes nothing. */
const PORTAL_LAYERS: readonly (readonly FrameName[])[] = PORTAL_MARKS.map(
  (mark) => [FRAMES.portal(mark)],
);

/**
 * Returns the inks a pair of portals is drawn in, by its tint: its ring in
 * its pair's ink, its eye in the page's color, its arms and badge its
 * ring's ink lit with the field's text, and its badge's disc cut out of the
 * ring in the marks' color.
 *
 * @throws {RangeError} for a tint no pair has.
 */
export function portalInks(tint: number, palette: WallPalette): PortalInks {
  const ring = brickColor({ kind: "portal", tint }, palette);
  return {
    middle: palette.portalEye,
    ring,
    glyph: mixColors(palette.text, ring, PORTAL_GLOW),
    disc: palette.mark,
  };
}

/**
 * How a portal is drawn: one frame for each pair, in that pair's inks and
 * with its badge, which a portal shows by its tint.
 */
export const PORTAL_ART = {
  layersOf: ({ tint }) => itemAt(PORTAL_LAYERS, tint),
  frames: (palette, scale) =>
    PORTAL_MARKS.map((mark, tint) =>
      cellFrame(FRAMES.portal(mark), scale, (cell) =>
        portalMark(
          cell,
          BADGES[mark],
          portalInks(tint, palette),
          scale.pixelRatio,
        ),
      ),
    ),
} as const satisfies KindArt;
