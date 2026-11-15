import { lerp } from "@fz/core/math";
import { type Place, type Torus, across } from "../../rules/torus";
import { STEP_S } from "../../rules/tuning";
import type { Flicker } from "./marks";

// What of a place moves, from what the field hands it: the nearer stars,
// against the pod's travel, and a flicker, by the field's steps, so it holds
// still as the field does and needs no clock.

/** How far the nearer stars slide for each unit the pod flies, against its travel. */
export const NEAR_SLIDE = 0.03;

/** How much more of its limit a mark takes at the height of its flicker, as a share of what it takes at rest. */
export const FLICKER_LIFT = 1.2;

/** How long a flicker takes: two quick blinks, then a fade, in seconds from its start. */
const BLINKS = { up: 0.05, dip: 0.11, again: 0.16, out: 0.36 } as const;

/** How strongly a flicker shows at the bottom of its dip. */
const DIP = 0.25;

/** How strongly a flicker shows at the top of its second blink. */
const AGAIN = 0.85;

/**
 * Returns how far into its flicker a mark is, from 0, at rest, to 1, at its
 * brightest, a number of the field's steps after its first: two quick blinks
 * and a fade, a third of a second in all, every so often. Before the field's
 * first step, its still form, nothing flickers.
 */
export function flickerAt(flicker: Flicker, steps: number): number {
  const time = steps * STEP_S;
  if (time <= 0) return 0;
  const since =
    (((time - flicker.after) % flicker.every) + flicker.every) % flicker.every;
  if (since < BLINKS.up) return since / BLINKS.up;
  if (since < BLINKS.dip) {
    return lerp(1, DIP, (since - BLINKS.up) / (BLINKS.dip - BLINKS.up));
  }
  if (since < BLINKS.again) {
    return lerp(DIP, AGAIN, (since - BLINKS.dip) / (BLINKS.again - BLINKS.dip));
  }
  if (since < BLINKS.out) {
    return lerp(AGAIN, 0, (since - BLINKS.again) / (BLINKS.out - BLINKS.again));
  }
  return 0;
}

/**
 * Keeps how far the pod has flown on a field, unwrapped, in field units,
 * from each place it is drawn at to the next, the shortest way across the
 * wrap, so the nearer stars slide against its travel, never by its jump
 * from one edge to the other.
 */
export class Travel {
  /** How far it has flown across, in field units. */
  x = 0;
  /** How far it has flown down, in field units. */
  y = 0;
  private lastX = 0;
  private lastY = 0;
  private following = false;

  /**
   * Adds the way from where the pod was last drawn to where it is now, on a
   * field of a size; or, for no pod, as between one ship and the next, lets
   * go of it, so the next is followed from where it first shows.
   */
  follow(at: Readonly<Place> | null, torus: Torus): void {
    if (!at) {
      this.lose();
      return;
    }
    if (this.following) {
      this.x += across(this.lastX, at.x, torus.width);
      this.y += across(this.lastY, at.y, torus.height);
    }
    this.lastX = at.x;
    this.lastY = at.y;
    this.following = true;
  }

  /** Lets go of the pod, keeping how far it has flown, so it is followed afresh from where it next shows. */
  lose(): void {
    this.following = false;
  }

  /** Starts again from nothing, as a new field does. */
  reset(): void {
    this.x = 0;
    this.y = 0;
    this.lose();
  }
}

/**
 * Returns how far the nearer stars lie slid along an axis, in device pixels,
 * against a travel along it, wrapped to the field's span, from 0 up to it.
 */
export function nearSlide(travel: number, unit: number, span: number): number {
  const slid = -travel * NEAR_SLIDE * unit;
  return ((slid % span) + span) % span;
}
