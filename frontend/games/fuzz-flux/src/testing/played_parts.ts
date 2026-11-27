// An event's parts played on a board, for a spec of the view to sample:
// how a move played by hand's first wave plays, the timeline a draft makes
// of an event's parts, at rest once they stop holding the board, or of a
// blast's, and how a piece of a timeline looks at a moment.

import { itemAt } from "@fz/core/records";
import type { GridShown } from "../view/run_state";
import type { BlastEvent } from "../view/timeline/blasts";
import { afterSwap } from "../view/timeline/board_after";
import { Draft } from "../view/timeline/draft";
import { FEEL, type FeelTuning } from "../view/timeline/feel";
import type { Part } from "../view/timeline/part";
import { reachesOf } from "../view/timeline/reach";
import { frameFor, sampleAt } from "../view/timeline/sample";
import type { Sampled, Timeline } from "../view/timeline/timeline";
import type { WavePlay } from "../view/timeline/wave_play";
import type { MoveFixture } from "./move_fixtures";
import { moveStartOf } from "./shown_board";

/** When a wave's bunches hop off, once they have huddled from its start, at 0, as `firstWaveOf()` plays it. */
export const HOPS_MS = FEEL.huddleMs;

/**
 * Returns how a move played by hand's first wave plays: from 0, its
 * bunches hopping off at `HOPS_MS`, on the board its swap leaves, the wind
 * blowing down, at the design's feel.
 *
 * @throws {RangeError} for a move that plays no wave.
 */
export function firstWaveOf(fixture: MoveFixture): WavePlay {
  const wave = itemAt(fixture.record.waves, 0);
  const grid = afterSwap(moveStartOf(fixture).grid, fixture.record.swap);
  return {
    wave,
    grid,
    blows: "down",
    startMs: 0,
    hopsMs: HOPS_MS,
    quickening: 1,
    before: 0,
    feel: FEEL,
  };
}

/** Returns the timeline of a blast of a move played by hand's first wave, by its place among the wave's, played by an event as its reach times it. */
export function blastTimeline(
  fixture: MoveFixture,
  event: BlastEvent,
  index = 0,
): Timeline {
  const play = firstWaveOf(fixture);
  const reach = itemAt(reachesOf(play.wave, play.hopsMs, FEEL), index);
  return timelineOfParts(
    play.grid,
    event(itemAt(play.wave.blasts, index), reach, play),
  );
}

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
