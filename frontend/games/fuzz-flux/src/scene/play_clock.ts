// The scene's clock, the one clock a level plays by, and where on it the
// play the board draws stands: each frame samples the play's timeline at
// that moment, and plays what starts since the moment the frame before
// stood at, so the shell's beats, the timeline's sounds and what it spawns
// all keep to one time.

import type { GridShown } from "../view/run_state";
import type { FeelTuning } from "../view/timeline/feel";
import type { Timeline } from "../view/timeline/timeline";

/** Describes what the board plays, as the shell hands it: a timeline, on the board it starts on. */
export interface BoardPlay {
  /** The board as the timeline starts: its squares, its gaps and its dust. */
  readonly grid: GridShown;
  /** A move's, a tap's between moves, a hint's, or a level's board falling in. */
  readonly timeline: Timeline;
  /** The feel it was built by, at the player's speed, as `pacedFeel()` gives it. */
  readonly feel: FeelTuning;
  /**
   * Whether it lands at once, as the move in play does when the player
   * looks away: drawn as its timeline ends, none of its sounds, effects or
   * flights played.
   */
  readonly landed: boolean;
}

/** A moment later than any a timeline holds, at which a play that lands at once is drawn: every track at its end. */
const LANDED_MS = Number.MAX_SAFE_INTEGER;

/**
 * Keeps the scene's clock, and where the play the board draws stands on
 * it: a play starts as the frame that first meets it does, and stands
 * as far into its timeline as the clock has run since.
 */
export class PlayClock {
  #nowMs = 0;
  #playedMs = 0;
  #sinceMs = 0;
  /** The play the clock last moved on with, or null before the first. */
  #play: BoardPlay | null = null;
  /** When the play started, on the scene's clock. */
  #startMs = 0;

  /** The scene's time, in milliseconds since it started. */
  get nowMs(): number {
    return this.#nowMs;
  }

  /** The moment of its timeline the play stands at, which the frame draws. */
  get playedMs(): number {
    return this.#playedMs;
  }

  /**
   * The moment of its timeline the play stood at the frame before, from
   * which the frame plays what starts up to the moment it stands at: a new
   * play's start, and a landed play's end.
   */
  get sinceMs(): number {
    return this.#sinceMs;
  }

  /** Moves the clock on by the time a frame took, with the play the board draws, from its start where it is new. */
  advance(play: BoardPlay, deltaMs: number): void {
    if (play !== this.#play) {
      this.#play = play;
      this.#startMs = this.#nowMs;
      this.#playedMs = 0;
    }
    this.#nowMs += deltaMs;
    this.#sinceMs = play.landed ? LANDED_MS : this.#playedMs;
    this.#playedMs = play.landed ? LANDED_MS : this.#nowMs - this.#startMs;
  }
}
