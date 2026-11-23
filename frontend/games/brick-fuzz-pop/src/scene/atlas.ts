import type { FieldArt } from "@fz/brick-wall/scene/field_painter";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { atlasFrames } from "../view/art/atlas_frames";
import type { WallPalette } from "../view/colors/palette";
import {
  COUNT_DOT,
  FIELD_FRAMES,
  fieldFrames,
  flightFrames,
} from "./field_art";
import { pictureFrames } from "./pictures";

/**
 * Returns every frame the field shows, at a scale and in a palette, which
 * `@fz/brick-wall/scene/atlas`'s `WallAtlas` bakes: the art's, the scene's
 * own dots, warning frame and frames of a round in play, and a picture of
 * each kind of brick for the page.
 */
export function wallAtlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  const art = atlasFrames(palette, scale);
  return [
    ...art,
    ...fieldFrames(palette, scale),
    ...flightFrames(palette, scale),
    ...pictureFrames(art, scale),
  ];
}

/**
 * The frames `@fz/brick-wall/scene/field_painter`'s `FieldPainter` shows of
 * the atlas, the grid's dot and the count's, and how wide the count's dot
 * is drawn.
 */
export const FIELD_ART: FieldArt = {
  gridDot: FIELD_FRAMES.gridDot,
  countDot: FIELD_FRAMES.countDot,
  countDotWidth: COUNT_DOT,
};
