// What a move plays once its waves are done, each in turn as its record
// holds it: a burr spreading, the wind turning and then the waves its turn
// sets off, and the shuffle. A burr's spread and the wind's turn play by
// the events in their lists, their sounds' first, which an element's
// events join.

import { itemAt } from "@fz/core/records";
import { WINDS, type Wind } from "../../rules/board/board";
import type { BurrSpread, Gust, MoveRecord } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import { afterShuffle, afterSpread } from "./board_after";
import type { Draft } from "./draft";
import { gustSound } from "./events/gust_sound";
import { shuffled } from "./events/shuffle";
import { spreadSound } from "./events/spread_sound";
import type { FeelTuning } from "./feel";
import type { Motion } from "./less_motion";
import type { Part } from "./part";
import { type WavePlayed, playWave } from "./wave";

/** Describes the board as an event after a move's waves plays on it: from when, as it stands then, at the move's feel and in its motion. */
export interface AfterPlay {
  readonly atMs: number;
  readonly grid: GridShown;
  readonly feel: FeelTuning;
  /** The motion the move plays in: with Less motion, the wind's turn sways nothing. */
  readonly motion: Motion;
}

/** Returns the parts of a burr spreading after a move, on the board its waves left. */
export type SpreadEvent = (
  spread: BurrSpread,
  play: AfterPlay,
) => readonly Part[];

/** Returns the parts of the wind turning after a move, on the board as it turns, before the waves its turn sets off. */
export type GustEvent = (gust: Gust, play: AfterPlay) => readonly Part[];

/** Each event a burr's spread plays by. */
const SPREAD_EVENTS: readonly SpreadEvent[] = [spreadSound];

/** Each event the wind's turn plays by. */
const GUST_EVENTS: readonly GustEvent[] = [gustSound];

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
      SPREAD_EVENTS.map((event) =>
        event(spread, { atMs: endMs, grid, feel, motion: draft.motion }),
      ),
      endMs,
    );
    grid = afterSpread(grid, spread);
  }
  if (gust !== null) {
    endMs = heldMs(
      draft,
      GUST_EVENTS.map((event) =>
        event(gust, { atMs: endMs, grid, feel, motion: draft.motion }),
      ),
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
