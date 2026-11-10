import { atlasFrameOf, bakeAtlas } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";
import { atlasFrames } from "../view/art/atlas_frames";
import type { WallPalette } from "../view/colors/palette";
import { fieldFrames } from "./field_art";
import { pictureFrames } from "./pictures";

/** The atlas's texture key, which every image on the field shows a frame of. */
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
 * Bakes every frame the field shows into the atlas, at a scale and in a
 * palette: the art's, the scene's own dots, and a picture of each kind of
 * brick for the page.
 */
export function bakeWallAtlas(
  scene: Scene,
  palette: WallPalette,
  scale: ArtScale,
): void {
  const art = atlasFrames(palette, scale);
  bakeAtlas(
    scene,
    ATLAS,
    [...art, ...fieldFrames(palette, scale), ...pictureFrames(art, scale)].map(
      atlasFrameOf,
    ),
  );
}
