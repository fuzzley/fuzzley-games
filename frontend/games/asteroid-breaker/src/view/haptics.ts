import type { Run } from "../rules/run";

/** How the phone buzzes as a ship is lost, as `navigator.vibrate()` takes it, in milliseconds: once, firmly. */
export const LOST_BUZZ: readonly number[] = [80];

/** How the phone buzzes as a wave is cleared: twice, lightly, a moment apart. */
export const CLEARED_BUZZ: readonly number[] = [30, 60, 30];

/**
 * Returns how the phone buzzes as a run changes: as it loses a ship, or
 * clears a wave; or null for any other change, a new run's among them.
 */
export function buzzOf(before: Run, after: Run): readonly number[] | null {
  if (after.id !== before.id) return null;
  if (after.crew.flying.length < before.crew.flying.length) return LOST_BUZZ;
  if (after.outcome === "cleared" && before.outcome !== "cleared") {
    return CLEARED_BUZZ;
  }
  return null;
}
