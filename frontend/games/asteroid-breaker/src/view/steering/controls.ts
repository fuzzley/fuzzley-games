import { RUN_KEYS, type RunCommand } from "@fz/core/run";

/**
 * Names a key held to fly the ship: a turn either way, a push, fire or a
 * dash. A paused game goes on at any of them, as at Enter.
 */
export type HeldKey = "left" | "right" | "thrust" | "fire" | "dash";

/**
 * What each key flies the ship by while it is held, by `event.code`, the
 * key's place on the keyboard rather than its letter, so W, A, S and D fly
 * on a QWERTY keyboard where Z, Q, S and D do on an AZERTY one.
 */
const HELD_KEYS: Readonly<Record<string, HeldKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "thrust",
  KeyW: "thrust",
  Space: "fire",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  ArrowDown: "dash",
  KeyS: "dash",
};

/** Returns what a key asks of the game's run, or null for a key that asks nothing. */
export function commandOfKey(code: string): RunCommand | null {
  return RUN_KEYS[code] ?? null;
}

/** Returns what a key flies the ship by while it is held, or null for one that doesn't. */
export function heldKeyOf(code: string): HeldKey | null {
  return HELD_KEYS[code] ?? null;
}
