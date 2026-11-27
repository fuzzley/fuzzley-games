// What a move plays once its waves are done, each in turn as its record
// holds it: a burr spreading, the wind turning and then the waves its turn
// sets off, and the shuffle. A burr's spread and the wind's turn play by
// the events in their lists, which an element's events join.

import { itemAt } from "@fz/core/records";
import { WINDS, type Wind } from "../../rules/board/board";
import type { BurrSpread, Gust, MoveRecord } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import { afterShuffle, afterSpread } from "./board_after";
import type { Draft } from "./draft";
import { shuffled } from "./events/shuffle";
import type { FeelTuning } from "./feel";
import type { Part } from "./part";
import { type WavePlayed, playWave } from "./wave";

/** Returns the parts of a burr spreading after a move, from a moment, on the board its waves left. */
export type SpreadEvent = (
  spread: BurrSpread,
  atMs: number,
  grid: GridShown,
  feel: FeelTuning,
) => readonly Part[];

/** Returns the parts of the wind turning after a move, from a moment, on the board as it turns, before the waves its turn sets off. */
export type GustEvent = (
  gust: Gust,
  atMs: number,
  grid: GridShown,
  feel: FeelTuning,
) => readonly Part[];

/** Each event a burr's spread plays by. */
const SPREAD_EVENTS: readonly SpreadEvent[] = [];

/** Each event the wind's turn plays by. */
const GUST_EVENTS: readonly GustEvent[] = [];

/** Describes a move played to its end: when the board may go on, how it is left, and the way the wind blows. */
export interface MovePlayed extends WavePlayed {
  readonly blows: Wind;
}

/**
 * Adds the parts of what a move plays after its waves to its draft, from
 * when they let the board go on, the wind blowing a way, and returns when
 * the board may go on, how it is left and the way the wind blows then.
 *
 * @throws {RangeError} for a burr spread to a square with no fuzzball, or
 *   a piece shuffled from a square where it doesn't stand.
 */
export function playAfterWaves(
  draft: Draft,
  record: MoveRecord,
  played: WavePlayed,
  blowing: Wind,
  feel: FeelTuning,
): MovePlayed {
  const { burrSpread: spread, gust, shuffle } = record;
  let { endMs, grid } = played;
  let blows = blowing;
  if (spread !== null) {
    endMs = heldMs(
      draft,
      SPREAD_EVENTS.map((event) => event(spread, endMs, grid, feel)),
      endMs,
    );
    grid = afterSpread(grid, spread);
  }
  if (gust !== null) {
    endMs = heldMs(
      draft,
      GUST_EVENTS.map((event) => event(gust, endMs, grid, feel)),
      endMs,
    );
    blows = itemAt(WINDS, gust.turns);
    for (const wave of gust.waves) {
      ({ endMs, grid } = playWave(draft, wave, grid, blows, endMs, feel));
    }
  }
  if (shuffle !== null) {
    endMs = heldMs(draft, [shuffled(shuffle, endMs, grid, feel)], endMs);
    grid = afterShuffle(grid, shuffle);
  }
  return { endMs, grid, blows };
}

/** Adds the parts of some events to a draft and returns the latest they hold the board until, but no sooner than a moment. */
function heldMs(
  draft: Draft,
  events: readonly (readonly Part[])[],
  fromMs: number,
): number {
  return events.reduce(
    (latestMs, parts) => Math.max(latestMs, draft.add(parts)),
    fromMs,
  );
}
