// A bumper, which kicks a fuzzball off it: round, not square, a disc on a
// darker shadow, a ring cut out of it, a lighter cap in its middle, and four
// ticks kicking out toward its cell's corners, `bumper()` in
// `docs/archive/brick-fuzz-pop/art/make-art.mjs`, as `@fz/phaser/bricks`'
// `bumperMark()` draws it.

import { cellFrame } from "@fz/brick-wall/view/art";
import { bumperMark } from "@fz/phaser/bricks";
import type { KindArt } from "../art";
import { FRAMES } from "../frames";

/** A bumper's layers, made once. */
const BUMPER_LAYERS = [FRAMES.bumper] as const;

/** How a bumper is drawn: one frame, as it never breaks. */
export const BUMPER_ART: KindArt = {
  layersOf: () => BUMPER_LAYERS,
  frames: (palette, scale) => {
    const { body, face, glyph } = palette.kinds.bumper;
    return [
      cellFrame(FRAMES.bumper, scale, (cell) =>
        bumperMark(
          cell,
          { ticks: body, disc: face, ring: glyph },
          scale.pixelRatio,
        ),
      ),
    ];
  },
};
