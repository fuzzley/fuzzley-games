import type { Place } from "../rules/torus";

/** How far the stick's knob reaches from the middle of its base, the base's radius, in CSS pixels. */
export const STICK_RADIUS_CSS_PX = 48;

/** The radius of the stick's knob, in CSS pixels. */
export const KNOB_RADIUS_CSS_PX = 20;

/** How far out the knob turns the ship from, a share of the stick's reach. */
export const TURN_RING = 0.12;

/** How far out the knob thrusts from, a share of the stick's reach. */
export const THRUST_RING = 0.5;

/**
 * How far back inside a ring the knob must come, a share of the stick's
 * reach, to stop what passing it out began, so a thumb resting on the ring
 * doesn't flicker it on and off.
 */
export const RING_GIVE = 0.04;

/** Describes the stick as the deck's painter reads it, in device pixels. */
export interface StickView {
  /** Whether a finger holds it. */
  readonly held: boolean;
  /**
   * Where its base is, while it is held, on the canvas as it was before it
   * last changed, until the finger next moves.
   */
  readonly base: Place;
  /** Where its knob is, while it is held, as its base is. */
  readonly knob: Place;
  /** Whether it thrusts, past its thrust ring, which lights. */
  readonly thrusting: boolean;
  /** Whether it is pushed to its edge, at full thrust, which lights. */
  readonly full: boolean;
}

/**
 * Follows the one finger on the stick, from where it lands to where it
 * lifts, and says what the stick asks: a heading past its turn ring, and a
 * push past its thrust ring, rising from nothing there to full at its edge.
 * The knob stops at the edge, and the base follows a finger dragged past it.
 */
export class Stick implements StickView {
  /** The finger holding it, by its pointer's id, or null. */
  private finger: number | null = null;
  private readonly basePlace = { x: 0, y: 0 };
  private readonly knobPlace = { x: 0, y: 0 };
  /** How far out the knob is, a share of the reach. */
  private out = 0;
  private turning = false;
  private pushing = false;
  /** Whether the canvas has moved under the finger, so its next move lays the base afresh. */
  private relaying = false;
  /** Where the base lies from the finger, as the canvas last moved under it. */
  private readonly fromFinger = { x: 0, y: 0 };

  /** Takes how far the knob reaches, in device pixels. */
  constructor(private reach: number) {}

  get held(): boolean {
    return this.finger !== null;
  }

  get base(): Place {
    return this.basePlace;
  }

  get knob(): Place {
    return this.knobPlace;
  }

  get thrusting(): boolean {
    return this.pushing;
  }

  get full(): boolean {
    return this.out === 1;
  }

  /**
   * Takes how far the knob now reaches, in device pixels, as the canvas
   * changes under a finger that may hold the stick, whose next move lays the
   * base afresh, as far from it and the same way as before, so the stick
   * asks what it did.
   */
  measure(reach: number): void {
    if (!this.relaying) {
      this.fromFinger.x = this.basePlace.x - this.knobPlace.x;
      this.fromFinger.y = this.basePlace.y - this.knobPlace.y;
    }
    const scale = reach / this.reach;
    this.fromFinger.x *= scale;
    this.fromFinger.y *= scale;
    this.relaying = this.finger !== null;
    this.reach = reach;
  }

  /**
   * Takes a finger pressed, which holds the stick unless another does, its
   * base and knob where it lands, and returns whether it took it.
   */
  press(id: number, place: Place): boolean {
    if (this.finger !== null) return false;
    this.finger = id;
    this.basePlace.x = place.x;
    this.basePlace.y = place.y;
    this.knobPlace.x = place.x;
    this.knobPlace.y = place.y;
    return true;
  }

  /** Takes a finger moved, and returns whether it is the one holding the stick, its knob moved to it. */
  move(id: number, place: Place): boolean {
    if (id !== this.finger) return false;
    if (this.relaying) {
      this.basePlace.x = place.x + this.fromFinger.x;
      this.basePlace.y = place.y + this.fromFinger.y;
      this.relaying = false;
    }
    const dx = place.x - this.basePlace.x;
    const dy = place.y - this.basePlace.y;
    const apart = Math.hypot(dx, dy);
    if (apart > this.reach) {
      this.basePlace.x = place.x - (dx / apart) * this.reach;
      this.basePlace.y = place.y - (dy / apart) * this.reach;
    }
    this.knobPlace.x = place.x;
    this.knobPlace.y = place.y;
    this.out = Math.min(1, apart / this.reach);
    this.turning = this.out > TURN_RING - (this.turning ? RING_GIVE : 0);
    this.pushing = this.out > THRUST_RING - (this.pushing ? RING_GIVE : 0);
    return true;
  }

  /** Takes a finger lifted, or one the browser took away, and returns whether it was the one holding the stick. */
  lift(id: number): boolean {
    if (id !== this.finger) return false;
    this.letGo();
    return true;
  }

  /** Lets go of the finger holding the stick, as the game pauses. */
  letGo(): void {
    this.finger = null;
    this.relaying = false;
    this.out = 0;
    this.turning = false;
    this.pushing = false;
  }

  /** Returns the heading the stick points the ship toward, in radians, or null within its turn ring. */
  heading(): number | null {
    if (!this.turning) return null;
    return Math.atan2(
      this.knobPlace.y - this.basePlace.y,
      this.knobPlace.x - this.basePlace.x,
    );
  }

  /** Returns the stick's push, from 0 at its thrust ring to 1 at its edge. */
  thrust(): number {
    if (!this.pushing) return 0;
    return Math.max(0, (this.out - THRUST_RING) / (1 - THRUST_RING));
  }
}
