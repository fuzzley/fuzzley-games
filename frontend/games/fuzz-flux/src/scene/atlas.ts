// The one atlas every image on the board shows a frame of: the art's
// frames, baked at whole device pixels for the board's square, as
// `bakedScale()` caps it, in the board's palette, and again once either
// changes. `bakeAtlas()` draws it again after a lost context.

import { atlasFrameOf, bakeAtlas, retakeFrames } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";
import { atlasFrames, bakedScale } from "../view/art/frames";
import type { BoardPalette } from "../view/colors/palette";

/** The atlas's texture key, which every image on the board shows a frame of. */
export const ATLAS = "fuzz-flux-atlas";

/**
 * Bakes the art's frames into the {@link ATLAS} as it is made, at the scale
 * a board's square bakes at and in the board's palette, and again once
 * either changes, every image on the atlas taking up its frame anew.
 */
export class BoardAtlas {
  private bakedAt: ArtScale;
  private bakedIn: BoardPalette;

  /** Bakes the atlas in a palette, for a board's square at a scale, its unit the square's device pixels. */
  constructor(
    private readonly scene: Scene,
    palette: BoardPalette,
    square: ArtScale,
  ) {
    this.bakedAt = bakedScale(square);
    this.bakedIn = palette;
    this.bake();
  }

  /** The scale the atlas was last baked at, a new record at each bake. */
  get scale(): ArtScale {
    return this.bakedAt;
  }

  /** The palette the atlas was last baked in. */
  get palette(): BoardPalette {
    return this.bakedIn;
  }

  /**
   * Bakes the atlas again in a palette and for a board's square, where
   * either asks for another than the last bake's, has every image on it
   * take up its frame anew, and returns whether it baked.
   */
  bakeFor(palette: BoardPalette, square: ArtScale): boolean {
    const scale = bakedScale(square);
    if (
      palette === this.bakedIn &&
      scale.unit === this.bakedAt.unit &&
      scale.pixelRatio === this.bakedAt.pixelRatio
    ) {
      return false;
    }
    this.bakedAt = scale;
    this.bakedIn = palette;
    this.bake();
    retakeFrames(this.scene, ATLAS);
    return true;
  }

  /** Bakes the art's frames at the scale and in the palette last asked for. */
  private bake(): void {
    bakeAtlas(
      this.scene,
      ATLAS,
      atlasFrames(this.bakedIn, this.bakedAt).map(atlasFrameOf),
    );
  }
}
