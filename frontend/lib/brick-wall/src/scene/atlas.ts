// The one atlas every image on a wall game's field shows a frame of, baked
// from the game's frames at its field's scale and in its palette.

import { type AtlasFrames, BakedAtlas } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";

/** The atlas's texture key, which every image on a wall game's field shows a frame of. */
export const ATLAS = "wall-atlas";

/** The largest unit the atlas is baked at, in device pixels; a field's larger unit shows its frames scaled up. */
export const MOST_BAKED_UNIT = 128;

/**
 * Returns the scale the atlas is baked at for a field's: its unit, but no
 * more than {@link MOST_BAKED_UNIT}, at its pixel ratio.
 */
export function bakedScaleOf(scale: ArtScale): ArtScale {
  return {
    unit: Math.min(scale.unit, MOST_BAKED_UNIT),
    pixelRatio: scale.pixelRatio,
  };
}

/**
 * Bakes a wall game's frames into the {@link ATLAS} as it is made, at the
 * scale the atlas is baked at for its field's and in its palette, and again
 * once either changes, every image on the atlas taking up its frame anew.
 */
export class WallAtlas<P> extends BakedAtlas<P> {
  /** Bakes a game's frames in a palette, for a field laid out at a scale. */
  constructor(
    scene: Scene,
    framesOf: AtlasFrames<P>,
    palette: P,
    layout: ArtScale,
  ) {
    super(
      scene,
      { key: ATLAS, framesOf, scaleOf: bakedScaleOf },
      palette,
      layout,
    );
  }
}
