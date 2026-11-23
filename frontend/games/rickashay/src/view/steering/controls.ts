// What Rickashay's keys ask of the game besides the aim, by `event.code`,
// the key's place on the keyboard rather than its letter, so the same
// fingers find F, X, G and R on any keyboard.

import { RUN_KEYS, type RunCommand } from "@fz/core/run";

/**
 * What each of the game's own keys asks of it: F switches fast-forward on
 * or off, X skips a flight, G reads the guide aloud and R the wall's lowest
 * rows.
 */
const GAME_KEYS = {
  KeyF: "fast",
  KeyX: "skip",
  KeyG: "readGuide",
  KeyR: "readRows",
} as const satisfies Readonly<Record<string, string>>;

/**
 * Names what a key asks of the game: to switch fast-forward on or off, to
 * skip a flight, to read the guide or the wall's lowest rows aloud, or
 * what the keys every game shares ask of its run.
 */
export type FieldCommand =
  (typeof GAME_KEYS)[keyof typeof GAME_KEYS] | RunCommand;

/** What each key asks of the game: the game's own, and Escape, P and Enter as every game's run has them. */
const COMMAND_KEYS: Readonly<Record<string, FieldCommand>> = {
  ...RUN_KEYS,
  ...GAME_KEYS,
};

/** Returns what a key asks of the game, or null for a key that asks nothing of it. */
export function commandOfKey(code: string): FieldCommand | null {
  return COMMAND_KEYS[code] ?? null;
}
