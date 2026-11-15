// The light the field's energy gives off: a soft halo in each glowing
// thing's own color under it, under plain alpha, never an additive blend,
// as the art kit's `glow()` draws one
// (`docs/asteroid-breaker-uplift/art/lib/fx.mjs`), which the scene shows
// as an image of one soft disc, tinted, turned, scaled and faded.

import { clamp } from "@fz/core/math";
import { ROCK_KIND_IDS } from "../../rules/catalog/rocks";
import { ROCK_OUTLINES, type Rock } from "../../rules/rocks/rocks";
import { ROCK_RADIUS } from "../../rules/tuning";
import type { BeltPalette } from "../colors/palette";
import { rockShape, sizesOf } from "./rock_art";
import type { RockGlow, RockShape } from "./rocks/rock_shape";

/**
 * Describes a soft halo a thing gives off, about the thing's middle as it
 * points along x, in field units: an ellipse fading to nothing, as long as
 * twice its reach along its way and as wide as twice its reach across it.
 */
export interface Halo {
  /** How far it reaches along its way, from its own middle. */
  readonly along: number;
  /** How far it reaches across its way. */
  readonly across: number;
  /** How far its middle lies from the thing's, along its way. */
  readonly ahead: number;
  /** How far its way is turned from the way the thing points, in radians. */
  readonly turn: number;
  /** How strongly it shows at its middle, from 0 to 1, before the palette's {@link BeltPalette.haloStrength}. */
  readonly strength: number;
}

/** Returns a round halo of a reach and a strength, about a thing's middle. */
export function roundHalo(reach: number, strength: number): Halo {
  return { along: reach, across: reach, ahead: 0, turn: 0, strength };
}

/**
 * Returns how opaque a halo of a strength shows in a palette: its own
 * strength times the palette's, as much as an image shows at most.
 */
export function haloAlpha(strength: number, palette: BeltPalette): number {
  return clamp(strength * palette.haloStrength, 0, 1);
}

/** Describes a halo a rock gives off, and whose light it is. */
export interface RockHalo extends Halo {
  /** Whose light it is, which the palette colors (`rockGlows`): a volatile rock's core or a crystal's gems. */
  readonly tone: RockGlow["tone"];
}

/** Returns a rock's glow as a halo, about its middle as it lies unturned, in field units. */
function haloOfGlow(glow: RockGlow, radius: number): RockHalo {
  return {
    tone: glow.tone,
    along: glow.r * radius,
    across: glow.r * radius,
    ahead: Math.hypot(glow.at.x, glow.at.y) * radius,
    turn: Math.atan2(glow.at.y, glow.at.x),
    strength: glow.strength,
  };
}

/** Each outline of each kind and size of rock's halos, by its shape, made once. */
const ROCK_HALOS: ReadonlyMap<RockShape, readonly RockHalo[]> = new Map(
  ROCK_KIND_IDS.flatMap((kind) =>
    sizesOf(kind).flatMap((size) =>
      Array.from({ length: ROCK_OUTLINES }, (_, outline) => {
        const shape = rockShape({ kind, size, outline });
        const radius = ROCK_RADIUS[size];
        return [
          shape,
          shape.glows.map((glow) => haloOfGlow(glow, radius)),
        ] as const;
      }),
    ),
  ),
);

/**
 * Returns the halos a rock gives off, a crystal's gems' and a volatile
 * rock's core's, each about the rock's middle as it lies unturned, so they
 * turn with it; none for a rock that doesn't glow.
 */
export function rockHalos(
  rock: Pick<Rock, "kind" | "size" | "outline">,
): readonly RockHalo[] {
  return ROCK_HALOS.get(rockShape(rock)) ?? [];
}

/** The most halos any rock gives off, which the scene makes as many images for in each rock's slot. */
export const MOST_ROCK_HALOS = Math.max(
  ...[...ROCK_HALOS.values()].map((halos) => halos.length),
);
