// Every frame the atlas holds, as the art draws it in a palette at a scale,
// which the scene bakes: each drawn kind of brick's, then the fuzzball's.
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
import { RAMP_ART } from "./kinds/ramp";
import { STEEL_ART } from "./kinds/steel";
import { TOUGH_ART } from "./kinds/tough";
import { pillFrames } from "./pill_art";

/**
 * Each kind of brick's art, by its id, for those the art draws: a kind
 * whose art is written adds a line, and once every kind has one, the
 * record is a whole one, `as const satisfies` a `Record`, so a kind
 * cataloged without art fails to compile.
 */
const BRICK_ART: Partial<Readonly<Record<KindId, KindArt>>> = {
  brick: PLAIN_ART,
  tough: TOUGH_ART,
  steel: STEEL_ART,
  ramp: RAMP_ART,
  gem: GEM_ART,
};

/** The kinds of brick the art draws, in the catalog's order: those a picture shows. */
export const DRAWN_KINDS: readonly KindId[] = KIND_IDS.filter(
  (kind) => BRICK_ART[kind] !== undefined,
);

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * drawn kind of brick's, in the catalog's order, then the fuzzball's.
 *
 * The field's own frames join them in {@link wallAtlasFrames}, which the
 * scene bakes.
 */
export function atlasFrames(
  palette: WallPalette,
  scale: ArtScale,
): readonly ArtFrame[] {
  return [
    ...KIND_IDS.flatMap(
      (kind) => BRICK_ART[kind]?.frames(palette, scale) ?? [],
    ),
    ...fuzzballFrames(palette, scale),
  ];
}

/**
 * Returns every frame the field's atlas holds, drawn in a palette at a
 * scale, which the scene's `WallAtlas` bakes: the bricks' and the
 * fuzzball's, then the field's own dots and warning frame, the floor
 * bounces' springs, the rally's pill and its digits, the guide's dot, ring
 * and band round a brick it strikes, and the flourishes'.
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
    ...guideFrames(palette, scale),
    ...effectFrames(palette, scale),
  ];
}

/** The frames of a brick whose kind's art isn't drawn yet: none. */
const UNDRAWN: readonly FrameName[] = [];

/**
 * Returns the frames a brick shows as it stands, stacked in its cell from
 * the bottom up, as its kind's art says: none for a kind whose art isn't
 * drawn yet, which shows nothing until its art is.
 *
 * @throws {RangeError} for a look its kind's art shows no frame for.
 */
export function brickLayers(
  brick: KindLook & Pick<Brick, "kind">,
): readonly FrameName[] {
  return BRICK_ART[brick.kind]?.layersOf(brick) ?? UNDRAWN;
}
