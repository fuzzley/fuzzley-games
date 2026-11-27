// A wave as its events play it: the wave, the board as it starts, the way
// the board falls, when it starts and its bunches hop off, and how much
// quicker than its move's first it plays.

import type { Wind } from "../../rules/board/board";
import type { Wave } from "../../rules/move/record";
import type { GridShown } from "../run_state";
import { takenBy } from "./board_after";
import type { FeelTuning } from "./feel";
import { type Standing, findStanding } from "./standing";

/** Describes a wave as its events play it. */
export interface WavePlay {
  readonly wave: Wave;
  /** The board as the wave starts. */
  readonly grid: GridShown;
  /** The way the wind blows the board's pieces down it. */
  readonly blows: Wind;
  readonly startMs: number;
  /** When its bunches hop off, once they have huddled. */
  readonly hopsMs: number;
  /** The share of its own time it takes, as `quickeningOf()` gives it. */
  readonly quickening: number;
  /** How many waves of its move came before it. */
  readonly before: number;
  /** The feel at the move's pace. */
  readonly feel: FeelTuning;
}

/**
 * Returns each piece with eyes, all but a brick, that stands on the board
 * through a wave: on it as the wave starts, and not taken by the wave.
 */
export function stayingThrough(play: WavePlay): readonly Standing[] {
  const taken = takenBy(play.wave);
  return play.grid.squares.flatMap((_, square) => {
    const standing = findStanding(play.grid, square);
    return standing === null ||
      standing.piece.what === "brick" ||
      taken.has(standing.piece.id)
      ? []
      : [standing];
  });
}
