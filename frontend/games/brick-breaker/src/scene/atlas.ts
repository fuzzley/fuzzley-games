import { atlasFrameOf, bakeAtlas } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";
import { atlasFrames } from "../view/art/art";
import type { BricksPalette } from "../view/colors/palette";

/** The atlas's texture key, which every image on the field shows a frame of. */
export const ATLAS = "bricks-atlas";

/** Bakes every frame the field shows into the atlas, at a scale and in a palette. */
export function bakeBricksAtlas(
  scene: Scene,
  palette: BricksPalette,
  scale: ArtScale,
): void {
  bakeAtlas(scene, ATLAS, atlasFrames(palette, scale).map(atlasFrameOf));
}
