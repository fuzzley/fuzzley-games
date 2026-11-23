// The one atlas every image on a wall game's field shows a frame of, baked
// from the game's frames at its field's scale and in its palette.

import { atlasFrameOf, bakeAtlas, retakeFrames } from "@fz/phaser/scene";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";

/** The atlas's texture key, which every image on a wall game's field shows a frame of. */
export const ATLAS = "wall-atlas";

/** The largest unit the atlas is baked at, in device pixels; a field's larger unit shows its frames scaled up. */
export const MOST_BAKED_UNIT = 128;

/** Returns a game's frames, drawn in a palette at a scale. */
export type WallFrames<P> = (
  palette: P,
  scale: ArtScale,
) => readonly ArtFrame[];

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
export class WallAtlas<P> {
  private bakedScale: ArtScale;
  private bakedPalette: P;

  constructor(
    private readonly scene: Scene,
    private readonly framesOf: WallFrames<P>,
    palette: P,
    layout: ArtScale,
  ) {
    this.bakedScale = bakedScaleOf(layout);
    this.bakedPalette = palette;
    this.bake();
  }

  /** The scale the atlas was last baked at, a new record at each bake. */
  get scale(): ArtScale {
    return this.bakedScale;
  }

  /** The palette the atlas was last baked in. */
  get palette(): P {
    return this.bakedPalette;
  }

  /**
   * Bakes the atlas again in a palette and for a field laid out at a scale,
   * where either asks for another than the last bake's, has every image and
   * sprite on it take up its frame anew, and returns whether it baked.
   */
  bakeFor(palette: P, layout: ArtScale): boolean {
    const scale = bakedScaleOf(layout);
    const { bakedScale } = this;
    if (
      palette === this.bakedPalette &&
      scale.unit === bakedScale.unit &&
      scale.pixelRatio === bakedScale.pixelRatio
    ) {
      return false;
    }
    this.bakedScale = scale;
    this.bakedPalette = palette;
    this.bake();
    retakeFrames(this.scene, ATLAS);
    return true;
  }

  /** Bakes the game's frames at the scale and in the palette last asked for. */
  private bake(): void {
    const frames = this.framesOf(this.bakedPalette, this.bakedScale);
    bakeAtlas(this.scene, ATLAS, frames.map(atlasFrameOf));
  }
}
