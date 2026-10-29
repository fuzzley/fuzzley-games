/**
 * Names what a key, a click or a tap asks of the game: to launch the ball
 * or fire the laser, to pause, to pause or go on as it isn't, or to go on,
 * or to the next level once one is cleared.
 */
export type FieldCommand = "launch" | "pause" | "toggle" | "go";

/** Names a key held to push the paddle. */
export type HeldKey = "left" | "right";

/**
 * What each key asks, by `event.code`, the key's place on the keyboard
 * rather than its letter, so A and D steer on a QWERTY keyboard where Q
 * and D do on an AZERTY one.
 */
const COMMAND_KEYS: Readonly<Record<string, FieldCommand>> = {
  Space: "launch",
  ArrowUp: "launch",
  KeyW: "launch",
  Escape: "pause",
  KeyP: "toggle",
  Enter: "go",
  NumpadEnter: "go",
};

/** Which way each key pushes the paddle while it is held, by `event.code`. */
const HELD_KEYS: Readonly<Record<string, HeldKey>> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

/** The keys the field answers, by `event.code`, which the scene captures. */
export const FIELD_KEYS: readonly string[] = [
  ...Object.keys(HELD_KEYS),
  ...Object.keys(COMMAND_KEYS),
];

/** Returns what a key asks of the game, or null for a key that asks nothing. */
export function commandOfKey(code: string): FieldCommand | null {
  return COMMAND_KEYS[code] ?? null;
}

/** Returns the way a key pushes the paddle while it is held, or null for one that doesn't. */
export function heldKeyOf(code: string): HeldKey | null {
  return HELD_KEYS[code] ?? null;
}
