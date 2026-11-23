import { type AimKey, aimKeyOf } from "@fz/brick-wall/view/aiming";
import { RUN_KEYS, type RunCommand } from "@fz/core/run";

/**
 * Names what a key asks of the game: to drop the fuzzballs in the air, to
 * switch fast-forward on or off, to read the wall's lowest rows aloud, or
 * what the keys every game shares ask of its run.
 */
export type FieldCommand = "drop" | "fast" | "read" | RunCommand;

/** Names what a key does to the charge: raises or lowers it a notch. */
type ChargeKey = "up" | "down";

/**
 * Names what a key does to the shot being aimed: turns the aim left or
 * right or lets the shot fly, as every wall game's keys do, or changes the
 * charge.
 */
export type SteerKey = AimKey | ChargeKey;

/**
 * What each key asks of the game, by `event.code`, the key's place on the
 * keyboard rather than its letter, so the same fingers find X, F and R on
 * any keyboard: Escape, P and Enter as every game's run has them.
 */
const COMMAND_KEYS: Readonly<Record<string, FieldCommand>> = {
  ...RUN_KEYS,
  KeyX: "drop",
  KeyF: "fast",
  KeyR: "read",
};

/**
 * What each key does to the charge, by `event.code`, so W and S charge on a
 * QWERTY keyboard where Z and S do on an AZERTY one.
 */
const CHARGE_KEYS: Readonly<Record<string, ChargeKey>> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
};

/** Returns what a key asks of the game, or null for a key that asks nothing of it. */
export function commandOfKey(code: string): FieldCommand | null {
  return COMMAND_KEYS[code] ?? null;
}

/** Returns what a key does to the shot being aimed, or null for one that does nothing to it. */
export function steerKeyOf(code: string): SteerKey | null {
  return aimKeyOf(code) ?? CHARGE_KEYS[code] ?? null;
}
