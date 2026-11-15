// How brightly a light falls on a facet, as the art kit lights its rocks and
// as WebGL's lighting lights an image with a normal map, and the way a facet
// faces as a normal map holds it.

import { clamp } from "@fz/core/math";
import type { Facing } from "./space";
import { turnedBy } from "./space";

/** Describes a light far off: the way to it, and how much of it reaches a facet. */
export interface RockLight {
  /** The way to the light, of length 1, its y down the field and its z toward the viewer. */
  readonly way: Facing;
  /** How much light reaches a facet turned away from it. */
  readonly ambient: number;
  /** How much the light adds to a facet turned straight at it. */
  readonly intensity: number;
}

/**
 * Returns how brightly a light falls on a facet facing a way, once its rock
 * has turned by an angle in radians: the ambient on one turned away, up to
 * the ambient and the intensity on one turned straight at it. A facet's
 * color is its ink times this, each channel clamped, as the shader draws it.
 */
export function litBy(facing: Facing, turn: number, light: RockLight): number {
  const { x, y } = turnedBy(facing, turn);
  const { way } = light;
  const toward = x * way.x + y * way.y + facing.z * way.z;
  return light.ambient + light.intensity * Math.max(0, toward);
}

/** Returns a share from -1 to 1 as a channel of a normal map, from 0 to 255. */
function channelOf(share: number): number {
  return Math.round(clamp(share * 0.5 + 0.5, 0, 1) * 255);
}

/**
 * Returns the color a normal map holds for the way a facet faces, turned by
 * an angle in radians: red for right, green for up, blue for toward the
 * viewer, as WebGL's lighting reads it.
 */
export function normalColor(facing: Facing, turn = 0): number {
  const { x, y } = turnedBy(facing, turn);
  return (channelOf(x) << 16) | (channelOf(-y) << 8) | channelOf(facing.z);
}
