import type { EffectsArt } from "@fz/brick-wall/scene/effects";
import type { FieldArt } from "@fz/brick-wall/scene/field_painter";
import type { GuideArt } from "@fz/brick-wall/scene/guide";
import type { WallArt } from "@fz/brick-wall/scene/wall_painter";
import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import type { BrickKindId } from "../rules/catalog/bricks";
import { brickLayers } from "../view/art/art";
import { atlasFrames } from "../view/art/atlas_frames";
import { FRAMES } from "../view/art/frames";
import type { WallPalette } from "../view/colors/palette";
import { STREAK_MS } from "../view/effects/timing";
import {
  COUNT_DOT,
  FIELD_FRAMES,
  FLIGHT_FRAMES,
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

/** The most frames a brick shows stacked in its cell: a tough brick's tile, pips and cracks. */
export const MOST_LAYERS = 3;

/**
 * How `@fz/brick-wall/scene/wall_painter`'s `WallPainter` draws Brick Fuzz
 * Pop's bricks: the art's frames for each, stacked, and the warning frame
 * over a brick one step from losing the level.
 */
export const WALL_ART: WallArt<BrickKindId> = {
  layersOf: brickLayers,
  mostLayers: MOST_LAYERS,
  warning: FIELD_FRAMES.warning,
};

/**
 * The frames `@fz/brick-wall/scene/effects`' `EffectsPainter` bursts from
 * the wall: a broken brick's shards, a punch's streak and a blast's ring,
 * and how long a streak takes to fade.
 */
export const EFFECTS_ART: EffectsArt = {
  shard: FLIGHT_FRAMES.shard,
  streak: FLIGHT_FRAMES.streak,
  ring: FLIGHT_FRAMES.ring,
  streakMs: STREAK_MS,
};

/**
 * The most dots the guide shows, `GUIDE_DOT_GAP` apart: about 72, along the
 * longest first segment a field has, from the floor to a far corner of the
 * deepest, about 24 units, and the most the debug menu runs the guide past
 * its first turn, 12, with room to spare.
 */
export const MOST_GUIDE_DOTS = 128;

/**
 * The frames `@fz/brick-wall/scene/guide`'s `GuidePainter` shows of Brick
 * Fuzz Pop's guide: a dot, the most it shows, and the outline over a brick
 * the shot would punch through. It rings no turn.
 */
export const GUIDE_ART: GuideArt = {
  dot: FRAMES.guideDot,
  mostDots: MOST_GUIDE_DOTS,
  struck: FRAMES.guidePunch,
};
