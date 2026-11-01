import { keysOf } from "@fz/core/records";
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
  /** Pickups and strays are drawn in to the ship from farther, for a time. */
  | { readonly kind: "pull"; readonly reach: number; readonly ms: number }
  /** The rocks and comets go at a share of their speed, for a time. */
  | { readonly kind: "pace"; readonly scale: number; readonly ms: number }
  /** Every rock within a reach of the ship takes a hit, at once. */
  | { readonly kind: "nova"; readonly reach: number }
  /** One more ship, at once. */
  | { readonly kind: "ship" };

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
    about: "Three shots at each pull, 12° apart, for 12 seconds.",
    weight: 10,
    from: 2,
    effect: { kind: "weapon", weapon: "spread", ms: 12_000 },
  },
  rapid: {
    name: "Rapid",
    about: "A shot twice as often, for 12 seconds.",
    weight: 9,
    from: 2,
    effect: { kind: "weapon", weapon: "rapid", ms: 12_000 },
  },
  shield: {
    name: "Shield",
    about:
      "The next rock or comet to touch the ship breaks a size down instead, and the shield goes.",
    weight: 7,
    from: 2,
    effect: { kind: "guard" },
  },
  ship: {
    name: "Extra ship",
    about: "One more ship, up to six.",
    weight: 1,
    from: 5,
    effect: { kind: "ship" },
  },
  lance: {
    name: "Lance",
    about:
      "A shot flies on through what it breaks, up to three rocks, for 10 seconds.",
    weight: 6,
    from: 6,
    effect: { kind: "weapon", weapon: "lance", ms: 10_000 },
  },
  magnet: {
    name: "Magnet",
    about: "Draws pickups and strays in from 14 units, for 15 seconds.",
    weight: 5,
    from: 6,
    effect: { kind: "pull", reach: 14, ms: 15_000 },
  },
  slow: {
    name: "Slow",
    about: "Rocks and comets move at half their speed, for 8 seconds.",
    weight: 5,
    from: 8,
    effect: { kind: "pace", scale: 0.5, ms: 8000 },
  },
  nova: {
    name: "Nova",
    about:
      "A ring sweeps 12 units out from the ship; each rock it reaches takes a hit.",
    weight: 4,
    from: 9,
    effect: { kind: "nova", reach: 12 },
  },
} as const satisfies Readonly<Record<string, Pickup>>;

/** A pickup's id, such as "spread". */
export type PickupId = keyof typeof PICKUPS;

/** Every pickup's id, in How to play's order. */
export const PICKUP_IDS = keysOf(PICKUPS);

/** Returns whether a value names a pickup, as a wave's file may. */
export function isPickupId(value: unknown): value is PickupId {
  return typeof value === "string" && Object.hasOwn(PICKUPS, value);
}

/** Returns a pickup, as the shape every pickup has. */
export function pickup(id: PickupId): Pickup {
  return PICKUPS[id];
}
