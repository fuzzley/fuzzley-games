// Every frame the atlas holds, as the art draws it in a palette at a scale,
// which the scene bakes: each drawn kind of brick's, then the fuzzball's.

import type { ArtFrame, ArtScale } from "@fz/phaser/shapes";
import { type Brick, KIND_IDS, type KindId } from "../../rules/catalog/kinds";
import type { WallPalette } from "../colors/palette";
import type { KindArt, KindLook } from "./art";
import type { FrameName } from "./frames";
import { fuzzballFrames } from "./fuzzball_art";
import { PLAIN_ART } from "./kinds/brick";
import { STEEL_ART } from "./kinds/steel";
import { TOUGH_ART } from "./kinds/tough";

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
};

/**
 * Returns every frame the atlas holds, drawn in a palette at a scale: each
 * drawn kind of brick's, in the catalog's order, then the fuzzball's.
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
