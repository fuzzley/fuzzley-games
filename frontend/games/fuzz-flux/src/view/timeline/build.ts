// A move's timeline, built from its record and the board it was played
// on, before it plays: the fuzzball picked up put down, the swap or the
// swap refused, each wave in turn on the board as the one before left it,
// what plays after the waves, and the level's end where the move ends it;
// and the timeline of a tap between moves, which picks a fuzzball up or
// puts one down.

import type { MoveRecord } from "../../rules/move/record";
import type { GoalShown, GridShown, WindShown } from "../run_state";
import { playAfterWaves } from "./after_waves";
import { afterSwap } from "./board_after";
import { Draft } from "./draft";
import { pickedUp, putDown } from "./events/pick_up";
import { swapOf } from "./events/swap";
import type { FeelTuning } from "./feel";
import { type Cleared, playLevelEnd } from "./level_end";
import { POOLS, type Pools } from "./limits";
import type { Motion } from "./less_motion";
import { type Speed, pacedFeel } from "./pace";
import type { Part } from "./part";
import { standingOn } from "./standing";
import type { Timeline } from "./timeline";
import { type WavePlayed, playWave } from "./wave";

/**
 * Describes the board as a move starts: where every piece stands at the
 * tap, the wind, the goals as the bar shows them, and the fuzzball picked
 * up; a run's state with the fuzzball held.
 */
export interface MoveStart {
  readonly grid: GridShown;
  /** The wind, or null for a level with none, whose pieces fall down the screen. */
  readonly wind: WindShown | null;
  readonly goals: readonly GoalShown[];
  /** The square of the fuzzball picked up as the move is made, put down as it starts, or null for none. */
  readonly held: number | null;
}

/** Describes how the player has set moves to play in Settings: at a speed, and in a motion. */
export interface PlaySettings {
  readonly speed: Speed;
  readonly motion: Motion;
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
 * played on, as the player has set moves to play, with the encore and how
 * many stars it earned for a move that clears its level, held to what a
 * scene's pools hold at once, as limits.ts sizes them unless it says.
 *
 * Its rest is when the board takes the swap it kept while the move played,
 * and a little may play on past it, as a face a swap refused made cross
 * comes back to rest or a copy flies to its goal: the scene samples a
 * timeline until the next one starts, each piece from its resting look and
 * face.
 *
 * @throws {RangeError} for a fuzzball held, or a swap kept, from a square
 *   with none, or a move that clears its level with no encore.
 */
export function timelineOf(
  record: MoveRecord,
  start: MoveStart,
  feel: FeelTuning,
  settings: PlaySettings,
  cleared: Cleared | null,
  pools: Pools = POOLS,
): Timeline {
  const paced = pacedFeel(feel, settings.speed);
  const draft = new Draft(start.grid, start.goals, settings.motion);
  // The swap starts as the put-down does and holds the board for itself.
  draft.add(putDownOn(start.grid, start.held, paced));
  const blows = start.wind?.blows ?? "down";
  let played: WavePlayed = {
    endMs: Math.max(0, draft.add(swapOf(record.swap, start.grid, paced))),
    grid: afterSwap(start.grid, record.swap),
  };
  for (const wave of record.waves) {
    played = playWave(draft, wave, played.grid, blows, played.endMs, paced);
  }
  const { restMs, end } = playLevelEnd(
    draft,
    record.outcome,
    cleared,
    playAfterWaves(draft, record, played, blows, paced),
    paced,
  );
  return draft.finish(restMs, end, paced, pools);
}

/**
 * Returns the timeline of a tap between moves on the board as it stands,
 * as the player has set moves to play.
 *
 * @throws {RangeError} for a fuzzball picked up, put down or looking its
 *   way from a square with none.
 */
export function heldTimelineOf(
  grid: GridShown,
  change: HeldChange,
  feel: FeelTuning,
  settings: PlaySettings,
): Timeline {
  const paced = pacedFeel(feel, settings.speed);
  const draft = new Draft(grid, [], settings.motion);
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
  return draft.finish(Math.max(0, downMs, upMs), null, paced, POOLS);
}

/** Returns the parts of the fuzzball on a square put down, none for no square. */
function putDownOn(
  grid: GridShown,
  square: number | null,
  feel: FeelTuning,
): readonly Part[] {
  return square === null ? [] : putDown(standingOn(grid, square), feel);
}
