import { clamp } from "@fz/core/math";
import type { InEffect } from "../rules/capsules";
import { capsule } from "../rules/catalog/capsules";
import { paddleTopOf } from "../rules/paddle";
import { stepsIn } from "../rules/stepper";
import { FIELD_WIDTH, NET_DEPTH } from "../rules/tuning";

/** How far apart the middles of two tags side by side are, in field units. */
export const TAG_SPACING = 1.3;

/** How far a tag's ring reaches from its middle, in field units. */
export const TAG_RADIUS = 0.55;

/**
 * Returns where the tags' middles lie down a field of a height: halfway from
 * the net to the field's foot, so their rings cross neither.
 */
export function tagY(height: number): number {
  return (paddleTopOf(height) + NET_DEPTH + height) / 2;
}

/**
 * Returns how much of an effect's time is left, from 1 as it starts to 0 as
 * it ends; 1 for one that lasts until it is used.
 */
export function timeLeft(effect: Readonly<InEffect>, steps: number): number {
  if (effect.capsule === null) return 1;
  const { effect: started } = capsule(effect.capsule);
  // Only an effect that lasts a time ends at a step; any other lasts until it is used.
  if (effect.endsAt === 0 || !("ms" in started)) return 1;
  const left = (effect.endsAt - steps) / stepsIn(started.ms);
  return clamp(left, 0, 1);
}

/**
 * Returns where the first of a row of tags lies across, the row centered
 * under the paddle's middle and kept inside the walls.
 */
export function firstTagX(paddleX: number, count: number): number {
  const half = ((count - 1) * TAG_SPACING) / 2;
  const least = TAG_RADIUS + half;
  const most = FIELD_WIDTH - TAG_RADIUS - half;
  return clamp(paddleX, least, most) - half;
}
