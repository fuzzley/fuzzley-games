import { atlasFrameOf, bakeAtlas } from "@fz/phaser/scene";
import type { ArtScale } from "@fz/phaser/shapes";
import type { Scene } from "phaser";
import { atlasFrames, deckFrames } from "../view/art/art";
import type { BeltPalette } from "../view/colors/palette";

/** The field's atlas's texture key, which every image on the field shows a frame of. */
export const ATLAS = "belt-atlas";

/** The deck's atlas's texture key, its parts white for the scene to tint. */
export const DECK_ATLAS = "belt-deck-atlas";

/** Bakes every frame the field shows into the field's atlas, at a scale and in a palette. */
export function bakeBeltAtlas(
  scene: Scene,
  palette: BeltPalette,
  scale: ArtScale,
): void {
  bakeAtlas(scene, ATLAS, atlasFrames(palette, scale).map(atlasFrameOf));
}

/** Bakes the deck's parts into the deck's atlas, at a pixel ratio. */
export function bakeDeckAtlas(scene: Scene, pixelRatio: number): void {
  bakeAtlas(scene, DECK_ATLAS, deckFrames(pixelRatio).map(atlasFrameOf));
}
