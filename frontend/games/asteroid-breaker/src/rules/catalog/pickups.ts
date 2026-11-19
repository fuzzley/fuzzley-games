import { isKeyOf, keysOf } from "@fz/core/records";
import type { WeaponId } from "./weapons";

/**
 * Names what catching a pickup does.
 *
 * Its kind is its group: catching one replaces whatever of its group is in
 * effect, so two never run at once.
 */
export type PickupEffect =
  /** The ship fires another weapon, for a time. */
  | { readonly kind: "weapon"; readonly weapon: WeaponId; readonly ms: number }
  /** The next rock or comet to touch the ship breaks a size down instead, and the shield goes. */
  | { readonly kind: "guard" }
  /** Pickups, sparks, strays and the crew knocked loose are drawn in to the ship from farther, for a time. */
  | { readonly kind: "pull"; readonly reach: number; readonly ms: number }
  /** The rocks and comets go at a share of their speed, for a time. */
  | { readonly kind: "pace"; readonly scale: number; readonly ms: number };

/** An effect's kind, which is its group. */
export type EffectKind = PickupEffect["kind"];

/** Describes a pickup: what it does, and when it may come. */
export interface Pickup {
  /** Names it, in How to play and as it is caught, such as "Spread". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** How likely it is to be drawn, against the others in the wave's pool. */
  readonly weight: number;
  /** The first wave whose pool it joins. */
  readonly from: number;
  /** What catching it does. */
  readonly effect: PickupEffect;
}

/** Every pickup, by id, in How to play's order, the wave each first comes in. */
export const PICKUPS = {
  spread: {
    name: "Spread",
    about: "Fires 3 shots at once for 12 seconds.",
    weight: 10,
    from: 2,
    effect: { kind: "weapon", weapon: "spread", ms: 12_000 },
  },
  rapid: {
    name: "Rapid",
    about: "Fires twice as often for 12 seconds.",
    weight: 9,
    from: 2,
    effect: { kind: "weapon", weapon: "rapid", ms: 12_000 },
  },
  shield: {
    name: "Shield",
    about: "Blocks the next rock or comet that hits your ship.",
    weight: 7,
    from: 2,
    effect: { kind: "guard" },
  },
  lance: {
    name: "Lance",
    about: "Fires shots that break up to 3 rocks each. Lasts 10 seconds.",
    weight: 6,
    from: 6,
    effect: { kind: "weapon", weapon: "lance", ms: 10_000 },
  },
  magnet: {
    name: "Magnet",
    about:
      "Pulls in pickups, sparks and fuzzballs from 14 units for 15 seconds.",
    weight: 5,
    from: 6,
    effect: { kind: "pull", reach: 14, ms: 15_000 },
  },
  slow: {
    name: "Slow",
    about: "Slows rocks and comets to half speed for 8 seconds.",
    weight: 5,
    from: 8,
    effect: { kind: "pace", scale: 0.5, ms: 8000 },
  },
} as const satisfies Readonly<Record<string, Pickup>>;

/** A pickup's id, such as "spread". */
export type PickupId = keyof typeof PICKUPS;

/** Every pickup's id, in How to play's order. */
export const PICKUP_IDS = keysOf(PICKUPS);

/** Returns whether a value names a pickup, as a wave's file may. */
export function isPickupId(value: unknown): value is PickupId {
  return isKeyOf(value, PICKUPS);
}

/** Returns a pickup, as the shape every pickup has. */
export function pickup(id: PickupId): Pickup {
  return PICKUPS[id];
}
