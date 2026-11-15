import { atlasFrameOf, bakeAtlas } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";
import { atlasFrames, deckFrames } from "../view/art/art";
import { rockFrames } from "../view/art/rock_art";
import type { BeltPalette } from "../view/colors/palette";

/** The field's atlas's texture key, which every image on the field shows a frame of. */
export const ATLAS = "belt-atlas";

/** The deck's atlas's texture key, its parts white for the scene to tint. */
export const DECK_ATLAS = "belt-deck-atlas";

/** The rocks' atlas's texture key, in their inks, lit through its normal map. */
export const ROCK_ATLAS = "belt-rock-atlas";

/**
 * The rocks' normal map's texture key: the same frames, packed alike, each
 * in the color of the way it faces, which the rocks' atlas reads as its
 * normal map. Nothing shows it.
 */
export const ROCK_NORMALS = "belt-rock-normals";

/**
 * Bakes every frame the field shows into the field's atlas and the rocks'
 * into theirs, with their normal map, at a scale and in a palette, the
 * rocks with their fine marks or without, as the field keeps them.
 *
 * The rocks' atlas reads its normal map from the normal map's canvas, set
 * again at each bake, so a bake at a new size keeps the two in step. Phaser
 * destroys a texture's normal map with it, handing the canvas back to its
 * pool, so the two keys are removed together, if ever, never one alone.
 */
export function bakeBeltAtlas(
  scene: Scene,
  palette: BeltPalette,
  scale: ArtScale,
  fine: boolean,
): void {
  bakeAtlas(scene, ATLAS, atlasFrames(palette, scale).map(atlasFrameOf));
  const rocks = rockFrames(palette, scale, fine);
  bakeAtlas(
    scene,
    ROCK_ATLAS,
    rocks.map(({ ink }) => atlasFrameOf(ink)),
  );
  bakeAtlas(
    scene,
    ROCK_NORMALS,
    rocks.map(({ normal }) => atlasFrameOf(normal)),
  );
  const normals = scene.textures.get(ROCK_NORMALS).getSourceImage();
  if (!(normals instanceof HTMLCanvasElement)) {
    throw new TypeError("The rocks' normal map was baked into no canvas.");
  }
  scene.textures.get(ROCK_ATLAS).setDataSource(normals);
}

/** Bakes the deck's parts into the deck's atlas, at a pixel ratio. */
export function bakeDeckAtlas(scene: Scene, pixelRatio: number): void {
  bakeAtlas(scene, DECK_ATLAS, deckFrames(pixelRatio).map(atlasFrameOf));
}
