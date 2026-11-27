// An event's parts played on a board, for a spec of the view to sample:
// the timeline a draft makes of them, at rest once they stop holding the
// board, and how a piece of a timeline looks at a moment.

import type { GridShown } from "../view/run_state";
import { Draft } from "../view/timeline/draft";
import { FEEL, type FeelTuning } from "../view/timeline/feel";
import type { Part } from "../view/timeline/part";
import { frameFor, sampleAt } from "../view/timeline/sample";
import type { Sampled, Timeline } from "../view/timeline/timeline";

/** Returns the timeline a board plays once an event's parts are added to it, at the design's feel. */
export function timelineOfParts(
  grid: GridShown,
  parts: readonly Part[],
): Timeline {
  const draft = new Draft(grid);
  return draft.finish(Math.max(0, draft.add(parts)), null, FEEL);
}

/**
 * Returns how a piece of a timeline looks at a moment, sampled by the feel
 * it was built at.
 *
 * @throws {Error} for a piece the timeline has no track for.
 */
export function pieceAt(
  timeline: Timeline,
  piece: number,
  ms: number,
  feel: FeelTuning = FEEL,
): Sampled {
  const track = timeline.pieces.findIndex(({ id }) => id === piece);
  const sampled = sampleAt(timeline, feel, ms, frameFor(timeline)).pieces[
    track
  ];
  if (sampled === undefined) {
    throw new Error(`The timeline has no track for piece ${String(piece)}.`);
  }
  return sampled;
}
