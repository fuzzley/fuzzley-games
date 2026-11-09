import type { BarOverflowAction } from "../bar_overflow";

/**
 * Returns the overflow menu's item for the sound, for a bar with no room for
 * its Sound button: one that turns the sound off while it is on, and on while
 * it is off.
 */
export function soundMenuAction(soundOn: boolean): BarOverflowAction<"sound"> {
  return soundOn
    ? { id: "sound", label: "Turn sound off", icon: "sound-off" }
    : { id: "sound", label: "Turn sound on", icon: "sound" };
}
