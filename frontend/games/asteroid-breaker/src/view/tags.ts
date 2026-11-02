import { clamp } from "@fz/core/math";
import { type PickupId, pickup } from "../rules/catalog/pickups";
import { type InEffect, lasts } from "../rules/pickups";
import { stepsIn } from "../rules/stepper";

/** How far in from the field's left and bottom edges the first tag's middle lies, in field units. */
export const TAG_INSET = 1.9;

/** How far apart the middles of two tags side by side are, in field units. */
export const TAG_SPACING = 2.7;

/** How far a tag's ring, which empties as its effect's time runs out, reaches from its middle, in field units. */
export const TAG_RADIUS = 1.1;

/** Returns how far across the field a tag's middle lies, by its place in the row, from the field's left edge, in field units. */
export function tagX(index: number): number {
  return TAG_INSET + index * TAG_SPACING;
}

/** Returns how far down a field of a height the tags' middles lie, near its bottom edge, in field units. */
export function tagY(height: number): number {
  return height - TAG_INSET;
}

/**
 * Returns how much of an effect's time is left, from 1 as it starts to 0 as
 * it ends; 1 for one that lasts until it is used, as the Shield does.
 */
export function timeLeft(effect: Readonly<InEffect>, steps: number): number {
  if (effect.pickup === null) return 1;
  const started = pickup(effect.pickup).effect;
  // An effect that lasts until it is used has no time to run out.
  if (!("ms" in started)) return 1;
  return clamp((effect.endsAt - steps) / stepsIn(started.ms), 0, 1);
}

/** Returns whether a pickup shows a tag while its effect is in play: one whose effect lasts, rather than being over as it starts. */
export function isTagged(id: PickupId): boolean {
  return lasts(pickup(id).effect.kind);
}
