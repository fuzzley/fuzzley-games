// Every frame the atlas holds, as the art draws it in a palette at a scale,
// which the scene bakes: each kind of brick's, then the fuzzball's.
// The field's own frames join them in `wallAtlasFrames()`.

import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { type Brick, KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import type { WallPalette } from "../colors/palette";
import type { KindArt, KindLook } from "./art";
import type { FrameName } from "./frames";
import { effectFrames } from "./effect_frames";
import { fieldFrames, springFrames } from "./field_frames";
import { fuzzballFrames } from "./fuzzball_art";
import { guideFrames } from "./guide_frames";
import { PLAIN_ART } from "./kinds/brick";
import { GEM_ART } from "./kinds/gem";
import { HATCH_ART } from "./kinds/hatch";
import { LOCK_ART } from "./kinds/lock";
import { MOSS_ART } from "./kinds/moss";
import { PLATED_ART } from "./kinds/plated";
import { PORTAL_ART } from "./kinds/portal";
import { RAMP_ART } from "./kinds/ramp";
import { SPRING_ART } from "./kinds/spring";
import { STEEL_ART } from "./kinds/steel";
import { TOUGH_ART } from "./kinds/tough";
import { rallyFrames } from "./rally_art";

/** Each kind of brick's art, by its id, so a kind cataloged without art fails to compile. */
const BRICK_ART = {
  brick: PLAIN_ART,
  tough: TOUGH_ART,
  steel: STEEL_ART,
  ramp: RAMP_ART,
  hatch: HATCH_ART,
  spring: SPRING_ART,
  gem: GEM_ART,
  portal: PORTAL_ART,
  plated: PLATED_ART,
  moss: MOSS_ART,
  lock: LOCK_ART,
} as const satisfies Readonly<Record<KindId, KindArt>>;

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * kind of brick's, in the catalog's order, then the fuzzball's.
 *
 * The field's own frames join them in {@link wallAtlasFrames}, which the
 * scene bakes.
 */
export function atlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...KIND_IDS.flatMap((kind) => BRICK_ART[kind].frames(palette, scale)),
    ...fuzzballFrames(palette, scale),
  ];
}

/**
 * Returns every frame the field's atlas holds, drawn in a palette at a
 * scale, which the scene's `WallAtlas` bakes: the bricks' and the
 * fuzzball's, then the field's own dots and warning frame, the floor
 * bounces' springs, the rally's digits, the guide's dot, ring and band
 * round a brick it strikes, and the flourishes'.
 */
export function wallAtlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...atlasFrames(palette, scale),
    ...fieldFrames(palette, scale),
    ...springFrames(palette, scale),
    ...rallyFrames(palette, scale),
    ...guideFrames(palette, scale),
    ...effectFrames(palette, scale),
  ];
}

/**
 * Returns the frames a brick shows as it stands, stacked in its cell from
 * the bottom up, as its kind's art says.
 *
 * @throws {RangeError} for a look its kind's art shows no frame for.
 */
export function brickLayers(
  brick: KindLook & Pick<Brick, "kind">,
): readonly FrameName[] {
  return BRICK_ART[brick.kind].layersOf(brick);
}
