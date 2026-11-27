// A move's timeline, built from its record and the board it was played
// on, before it plays: the fuzzball picked up put down, then the swap or
// the swap refused; and the timeline of a tap between moves, which picks a
// fuzzball up or puts one down.

import type { MoveRecord } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import { Draft } from "./draft";
import { pickedUp, putDown } from "./events/pick_up";
import { swapOf } from "./events/swap";
import type { FeelTuning } from "./feel";
import { type Pace, pacedFeel } from "./pace";
import type { Part } from "./part";
import { standingOn } from "./standing";
import type { Timeline } from "./timeline";

/** Describes the board as a move starts: where every piece stands at the tap, and the fuzzball picked up. */
export interface MoveStart {
  readonly grid: GridShown;
  /** The square of the fuzzball picked up as the move is made, put down as it starts, or null for none. */
  readonly held: number | null;
}

/** Describes a tap between moves that changes the fuzzball held: the fuzzball it picks up, those that look its way, and the one it puts down. */
export interface HeldChange {
  /** The square of the fuzzball picked up, or null for none. */
  readonly up: number | null;
  /** The squares of the fuzzballs that would bunch with it in a swap. */
  readonly lookers: readonly number[];
  /** The square of the fuzzball put down, or null for none. */
  readonly down: number | null;
}

/**
 * Returns the timeline of a move, from its record and the board it was
 * played on, at the player's pace.
 *
 * Its rest is when the board takes the swap it kept while the move played,
 * and a little may play on past it, as a face a swap refused made cross
 * comes back to rest: the scene samples a timeline until the next one
 * starts, each piece from its resting look and face.
 *
 * @throws {RangeError} for a fuzzball held, or a swap kept, from a square
 *   with none.
 */
export function timelineOf(
  record: MoveRecord,
  start: MoveStart,
  feel: FeelTuning,
  pace: Pace,
): Timeline {
  const paced = pacedFeel(feel, pace);
  const draft = new Draft(start.grid);
  // The swap starts as the put-down does and holds the board for itself.
  draft.add(putDownOn(start.grid, start.held, paced));
  const restMs = Math.max(0, draft.add(swapOf(record.swap, start.grid, paced)));
  return draft.finish(restMs, null, paced);
}

/**
 * Returns the timeline of a tap between moves on the board as it stands,
 * at the player's pace.
 *
 * @throws {RangeError} for a fuzzball picked up, put down or looking its
 *   way from a square with none.
 */
export function heldTimelineOf(
  grid: GridShown,
  change: HeldChange,
  feel: FeelTuning,
  pace: Pace,
): Timeline {
  const paced = pacedFeel(feel, pace);
  const draft = new Draft(grid);
  const downMs = draft.add(putDownOn(grid, change.down, paced));
  const upMs = draft.add(
    change.up === null
      ? []
      : pickedUp(
          standingOn(grid, change.up),
          change.lookers.map((square) => standingOn(grid, square)),
          paced,
        ),
  );
  return draft.finish(Math.max(0, downMs, upMs), null, paced);
}

/** Returns the parts of the fuzzball on a square put down, none for no square. */
function putDownOn(
  grid: GridShown,
  square: number | null,
  feel: FeelTuning,
): readonly Part[] {
  return square === null ? [] : putDown(standingOn(grid, square), feel);
}
