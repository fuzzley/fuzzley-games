// A portal, which sends a fuzzball out of its twin: not solid, a thick ring
// round a dark middle, three arms spiralling out of it, and a badge on its ring
// telling its pair from the other, a dot on the first pair's and a diamond on
// the second's, `portal()` in `docs/archive/brick-fuzz-pop/art/make-art.mjs`,
// as `@fz/phaser/bricks`' `portalMark()` draws it. Each pair's badge is the
// one the legend's `PORTAL_BADGES` names, which R reads a portal by. The
// diamond is hollow and larger than the art's, which at the least units reads
// as a dot, on a disc a little larger, so the two pairs differ in shape, not
// in color alone.

import { portalMark } from "@fz/phaser/bricks";
import { PORTAL_BADGES } from "../../../rules/levels/legend";
import type { KindArt } from "../art";
import { FRAMES, type FrameName, type PortalMark } from "../frames";
import { itemAt } from "../../items";
import { cellFrame } from "../symbols";

/** The marks, in order, each drawn in its pair's inks with its pair's badge. */
const MARKS = [1, 2] as const satisfies readonly PortalMark[];

/** A portal's layers, by its tint, its pair's place: the first pair's, then the second's. */
const PORTAL_LAYERS: readonly (readonly FrameName[])[] = MARKS.map((mark) => [
  FRAMES.portal(mark),
]);

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
      cellFrame(FRAMES.portal(mark), scale, (cell) => {
        const { body, face, glyph } = itemAt(palette.portals, i);
        return portalMark(
          cell,
          itemAt(PORTAL_BADGES, i),
          { middle: face, ring: body, glyph, disc: palette.mark },
          scale.pixelRatio,
        );
      }),
    ),
};
