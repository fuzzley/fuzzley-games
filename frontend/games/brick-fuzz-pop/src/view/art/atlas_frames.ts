import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { BRICK_KIND_IDS } from "../../rules/catalog/bricks";
import type { WallPalette } from "../colors/palette";
import { BRICK_ART } from "./art";

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * kind of brick's, in the catalog's order.
 */
export function atlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return BRICK_KIND_IDS.flatMap((kind) =>
    BRICK_ART[kind].frames(palette, scale),
  );
}
