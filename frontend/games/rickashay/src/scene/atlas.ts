// What Rickashay's field shows of the one atlas, `@fz/brick-wall`'s
// `WallAtlas`: every frame it bakes, and the frames each of the library's
// painters draws the game's field and wall with.

import type { FieldArt } from "@fz/brick-wall/scene/field_painter";
import type { WallArt } from "@fz/brick-wall/scene/wall_painter";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { KindId } from "../rules/catalog/kinds";
import { atlasFrames, brickLayers } from "../view/art/atlas_frames";
import {
  COUNT_DOT,
  FIELD_FRAMES,
  fieldFrames,
  springFrames,
} from "../view/art/field_frames";
import { pillFrames } from "../view/art/pill_art";
import type { WallPalette } from "../view/colors/palette";

/**
 * Returns every frame the field shows, drawn in a palette at a scale, which
 * `WallAtlas` bakes: the bricks' and the fuzzball's, then the field's own
 * dots and warning frame, the floor bounces' springs, and the rally's pill
 * and its digits.
 */
export function wallAtlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...atlasFrames(palette, scale),
    ...fieldFrames(palette, scale),
    ...springFrames(palette, scale),
    ...pillFrames(palette, scale),
  ];
}

/**
 * The frames `@fz/brick-wall/scene/field_painter`'s `FieldPainter` shows,
 * the grid's dot and the count's, and how wide the count's dot is drawn.
 */
export const FIELD_ART: FieldArt = {
  gridDot: FIELD_FRAMES.gridDot,
  countDot: FIELD_FRAMES.countDot,
  countDotWidth: COUNT_DOT,
};

/** The most frames a brick shows stacked in its cell: a tough brick's tile, pips and cracks. */
export const MOST_LAYERS = 3;

/**
 * How `@fz/brick-wall/scene/wall_painter`'s `WallPainter` draws
 * Rickashay's bricks: the art's frames for each, stacked, and the warning
 * frame over a brick one step from losing the level.
 */
export const WALL_ART: WallArt<KindId> = {
  layersOf: brickLayers,
  mostLayers: MOST_LAYERS,
  warning: FIELD_FRAMES.warning,
};
