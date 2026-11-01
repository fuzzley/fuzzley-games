import { keysOf } from "@fz/core/records";
import { SHOTS_IN_FLIGHT, SHOT_EVERY_MS } from "../tuning";

/** Describes a weapon: what each pull of fire looses, how often, and what one shot breaks. */
export interface Weapon {
  /** The shots each pull fires, fanned evenly about the ship's heading. */
  readonly count: number;
  /** The angle between two shots of a pull, in degrees. */
  readonly spreadDeg: number;
  /** The time between two pulls while fire is held. */
  readonly everyMs: number;
  /** The most of its shots in flight at once; a pull waits until all of it fits. */
  readonly inFlight: number;
  /** The most rocks one shot breaks, flying on through each but the last. */
  readonly breaks: number;
}

/**
 * Every weapon, by id: the plain gun, and those a pickup gives, each better
 * than the gun in one way.
 */
export const WEAPONS = {
  gun: {
    count: 1,
    spreadDeg: 0,
    everyMs: SHOT_EVERY_MS,
    inFlight: SHOTS_IN_FLIGHT,
    breaks: 1,
  },
  spread: {
    count: 3,
    spreadDeg: 12,
    everyMs: SHOT_EVERY_MS,
    // As many pulls in flight as the gun has shots.
    inFlight: 3 * SHOTS_IN_FLIGHT,
    breaks: 1,
  },
  rapid: {
    count: 1,
    spreadDeg: 0,
    everyMs: SHOT_EVERY_MS / 2,
    // Twice the gun's in flight, as it fires twice as often.
    inFlight: 2 * SHOTS_IN_FLIGHT,
    breaks: 1,
  },
  lance: {
    count: 1,
    spreadDeg: 0,
    everyMs: SHOT_EVERY_MS,
    inFlight: SHOTS_IN_FLIGHT,
    breaks: 3,
  },
} as const satisfies Readonly<Record<string, Weapon>>;

/** A weapon's id, such as "rapid". */
export type WeaponId = keyof typeof WEAPONS;

/** Every weapon's id, the gun first. */
export const WEAPON_IDS = keysOf(WEAPONS);
