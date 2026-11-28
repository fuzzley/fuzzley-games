import type { Scene } from "phaser";
import type { ArtFrame, ArtScale } from "../shapes";
import { bakeAtlas } from "./bake_atlas";
import { retakeFrames } from "./retake_frames";
import { atlasFrameOf } from "./shapes_frame";

/** Returns a game's frames, drawn in a palette at a scale. */
export type AtlasFrames<P> = (
  palette: P,
  scale: ArtScale,
) => readonly ArtFrame[];

/** Says how a game's atlas is baked: under which key, from which frames, and at what scale for a layout's. */
export interface AtlasBaking<P> {
  /** The atlas's texture key, which every image on it shows a frame of. */
  readonly key: string;
  /** Returns the atlas's frames, drawn in a palette at a scale. */
  readonly framesOf: AtlasFrames<P>;
  /** Returns the scale the atlas is baked at for a layout's, such as the layout's own, no larger than the game bakes. */
  readonly scaleOf: (layout: ArtScale) => ArtScale;
}

/**
 * Bakes a game's frames into its atlas as it is made, in its palette and at
 * the scale its layout bakes at, and again once either changes, every image
 * and sprite on the atlas taking up its frame anew.
 */
export class BakedAtlas<P> {
  private bakedScale: ArtScale;
  private bakedPalette: P;

  /** Bakes the atlas in a palette, for a layout at a scale. */
  constructor(
    private readonly scene: Scene,
    private readonly baking: AtlasBaking<P>,
    palette: P,
    layout: ArtScale,
  ) {
    this.bakedScale = this.scaleFor(layout);
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
   * Bakes the atlas again in a palette and for a layout at a scale, where
   * either asks for another than the last bake's, has every image and
   * sprite on it take up its frame anew, and returns whether it baked.
   */
  bakeFor(palette: P, layout: ArtScale): boolean {
    const scale = this.scaleFor(layout);
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
    retakeFrames(this.scene, this.baking.key);
    return true;
  }

  /** Returns the scale the atlas is baked at for a layout's, as a record of its own. */
  private scaleFor(layout: ArtScale): ArtScale {
    const { unit, pixelRatio } = this.baking.scaleOf(layout);
    return { unit, pixelRatio };
  }

  /** Bakes the game's frames at the scale and in the palette last asked for. */
  private bake(): void {
    const { key, framesOf } = this.baking;
    const frames = framesOf(this.bakedPalette, this.bakedScale);
    bakeAtlas(this.scene, key, frames.map(atlasFrameOf));
  }
}
