// The cue that the moves are running low: at the feel's count of moves
// left the bar's count turns to the warning color, and the low sound plays
// once, as the board comes to rest after the move that brings it there.

import type { RunState } from "../run_state";
import type { FeelTuning } from "../timeline/feel";
import type { SoundCue } from "../timeline/timeline";

/** Returns whether so few moves are left that the bar's count shows in the warning color. */
export function movesLow(movesLeft: number, feel: FeelTuning): boolean {
  return movesLeft <= feel.lowMovesLeft;
}

/**
 * Returns the cue of the low sound at the moment the board comes to rest
 * after a move, where the move spends the moves left down to the feel's
 * count and leaves the level in play, or null, as after a swap refused,
 * which spends none.
 */
export function lowMovesCue(
  movesLeftBefore: number,
  after: Pick<RunState, "movesLeft" | "card">,
  atMs: number,
  feel: FeelTuning,
): SoundCue | null {
  return after.card === null &&
    !movesLow(movesLeftBefore, feel) &&
    movesLow(after.movesLeft, feel)
    ? { atMs, sound: "low", cents: 0, volume: 1 }
    : null;
}
