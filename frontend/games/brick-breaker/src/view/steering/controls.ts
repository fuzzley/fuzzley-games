import { RUN_KEYS, type RunCommand } from "@fz/core/run";

/**
 * Names what a key, a click or a tap asks of the game: to launch the ball,
 * fire the laser, or go on to the next level once one is cleared
 * (`launch`), or what the keys every game shares ask of its run.
 */
export type FieldCommand = "launch" | RunCommand;

/** Names a key held to push the paddle. */
export type HeldKey = "left" | "right";

/**
 * What each key asks, by `event.code`, the key's place on the keyboard
 * rather than its letter, so A and D steer on a QWERTY keyboard where Q
 * and D do on an AZERTY one.
 */
const COMMAND_KEYS: Readonly<Record<string, FieldCommand>> = {
  ...RUN_KEYS,
  Space: "launch",
  ArrowUp: "launch",
  KeyW: "launch",
};

/** Which way each key pushes the paddle while it is held, by `event.code`. */
const HELD_KEYS: Readonly<Record<string, HeldKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/** Returns what a key asks of the game, or null for a key that asks nothing. */
export function commandOfKey(code: string): FieldCommand | null {
  return COMMAND_KEYS[code] ?? null;
}

/** Returns the way a key pushes the paddle while it is held, or null for one that doesn't. */
export function heldKeyOf(code: string): HeldKey | null {
  return HELD_KEYS[code] ?? null;
}
