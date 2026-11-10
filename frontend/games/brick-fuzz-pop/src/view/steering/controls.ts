import { RUN_KEYS, type RunCommand } from "@fz/core/run";

/**
 * Names what a key asks of the game: to skip a flight, to read the wall's
 * lowest rows aloud, or what the keys every game shares ask of its run.
 */
export type FieldCommand = "skip" | "read" | RunCommand;

/**
 * Names what a key does to the shot being aimed: turns the aim left or
 * right, raises or lowers the charge a notch, or lets the shot fly.
 */
export type SteerKey = "left" | "right" | "up" | "down" | "release";

/** Names a key held: fast-forward, while a flight is in the air. */
export type HeldKey = "fast";

/**
 * What each key asks of the game, by `event.code`, the key's place on the
 * keyboard rather than its letter, so the same fingers find X and R on any
 * keyboard: Escape, P and Enter as every game's run has them.
 */
const COMMAND_KEYS: Readonly<Record<string, FieldCommand>> = {
  ...RUN_KEYS,
  KeyX: "skip",
  KeyR: "read",
};

/**
 * What each key does to the shot, by `event.code`, so A, S, D and W steer
 * on a QWERTY keyboard where Q, S, D and Z do on an AZERTY one.
 */
const STEER_KEYS: Readonly<Record<string, SteerKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "release",
};

/** What each key holds while it is held, by `event.code`. */
const HELD_KEYS: Readonly<Record<string, HeldKey>> = {
  KeyF: "fast",
};

/** Returns what a key asks of the game, or null for a key that asks nothing of it. */
export function commandOfKey(code: string): FieldCommand | null {
  return COMMAND_KEYS[code] ?? null;
}

/** Returns what a key does to the shot being aimed, or null for one that does nothing to it. */
export function steerKeyOf(code: string): SteerKey | null {
  return STEER_KEYS[code] ?? null;
}

/** Returns what a key holds while it is held, or null for one that holds nothing. */
export function heldKeyOf(code: string): HeldKey | null {
  return HELD_KEYS[code] ?? null;
}
