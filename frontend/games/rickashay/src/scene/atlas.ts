// What Rickashay's field shows of the one atlas, `@fz/brick-wall`'s
// `WallAtlas`, which bakes the art's `wallAtlasFrames()`: the frames each of
// the library's painters draws the game's field and wall with.

import type { EffectsArt } from "@fz/brick-wall/scene/effects";
import type { FieldArt } from "@fz/brick-wall/scene/field_painter";
import type { GuideArt } from "@fz/brick-wall/scene/guide";
import type { WallArt } from "@fz/brick-wall/scene/wall_painter";
import type { KindId } from "../rules/catalog/kinds";
import { brickLayers } from "../view/art/atlas_frames";
import { EFFECT_FRAMES } from "../view/art/effect_frames";
import { COUNT_DOT, FIELD_FRAMES } from "../view/art/field_frames";
import { FRAMES } from "../view/art/frames";
import { GUIDE_FRAMES } from "../view/art/guide_frames";
import { MOST_GUIDE_DOTS, MOST_GUIDE_RINGS } from "../view/field/guide";

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

/**
 * The frames `@fz/brick-wall/scene/guide`'s `GuidePainter` shows of
 * Rickashay's guide: a dot, the most it shows; the ring at a turn, the most
 * turns it rings; and the band round a brick the shot strikes.
 */
export const GUIDE_ART: GuideArt = {
  dot: FRAMES.guideDot,
  mostDots: MOST_GUIDE_DOTS,
  struck: GUIDE_FRAMES.struck,
  turns: { ring: FRAMES.guideRing, most: MOST_GUIDE_RINGS },
};

/**
 * The frames `@fz/brick-wall/scene/effects`' `EffectsPainter` shows of
 * Rickashay's flourishes: a broken brick's shard and the ring a fuzzball
 * leaves as its fur lifts. It plays no streak of its own, as the streak
 * behind a fuzzball dashing home follows it, drawn with it, so a burst's
 * streak would fade at once.
 */
export const EFFECTS_ART: EffectsArt = {
  shard: EFFECT_FRAMES.shard,
  streak: EFFECT_FRAMES.streak,
  ring: EFFECT_FRAMES.ring,
  streakMs: 0,
};
