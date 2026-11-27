// A board, and the game played on it. The rules always let things fall down
// the board's own frame: a wind that blows another way turns the frame
// instead, a quarter turn clockwise for each step from down in `WINDS`.
// A game is never changed: the rules make the next one from it.

import type { DustLayers } from "../catalog/elements";
import type { Goal } from "../catalog/goals";
import type { KindId } from "../catalog/kinds";
import type { Piece } from "../catalog/pieces";

/** Every way the wind blows on the screen, each at its place the quarter turns clockwise it turns the board's frame. */
export const WINDS = [
  "down",
  "right",
  "up",
  "left",
] as const satisfies readonly string[];

/** A way the wind blows on the screen, such as "right". */
export type Wind = (typeof WINDS)[number];

/** How many quarter turns clockwise a board's frame is turned from the screen's. */
export type QuarterTurns = 0 | 1 | 2 | 3;

/** Every way a game stands: still in play, cleared, or over, its moves run out first. */
export const OUTCOMES = [
  "playing",
  "cleared",
  "over",
] as const satisfies readonly string[];

/** How a game stands, such as "cleared". */
export type Outcome = (typeof OUTCOMES)[number];

/** Describes a board in its own frame, each of its lists by square, a square's index `y * width + x`. */
export interface Board {
  readonly width: number;
  readonly height: number;
  /** Whether each square is open, there to hold a piece; a gap's isn't. */
  readonly open: readonly boolean[];
  /** What each square holds, or null where it holds nothing, as a gap never does. */
  readonly pieces: readonly (Piece | null)[];
  /** How many layers of dust lie on each square, none on a gap. */
  readonly dust: readonly DustLayers[];
  /** Whether each square is a bed, where a sleepyhead leaves the board. */
  readonly beds: readonly boolean[];
}

/**
 * Describes how many fuzzballs each lane of a board's frame has let in, for
 * each of the frame's quarter turns, by `QuarterTurns`: a lane a column of
 * that frame, from the left.
 */
export type Lanes = readonly [
  readonly number[],
  readonly number[],
  readonly number[],
  readonly number[],
];

/** Describes a wind that turns: how often, how far, and how long it waits yet. */
export interface TurningWind {
  /** How many moves it waits between turns. */
  readonly every: number;
  /** How many quarter turns clockwise each of its turns gives the board's frame, which turn the wind counterclockwise. */
  readonly quarters: number;
  /** How many more moves it waits before its next turn. */
  readonly wait: number;
}

/**
 * Describes a game under way: its board and all the rules need to play the
 * next move on it, the same every time from the same game and move.
 */
export interface Game {
  /** The board, in its own frame. */
  readonly board: Board;
  /** How far its frame is turned from the screen's, which is the wind's place in `WINDS`. */
  readonly turns: QuarterTurns;
  /** The kinds in play, in the level's order, which a draw of a kind picks from by its place. */
  readonly kinds: readonly KindId[];
  readonly goals: readonly Goal[];
  /** What each goal still needs, in the goals' order: one is met at 0, and counts on below it. */
  readonly goalsLeft: readonly number[];
  readonly movesLeft: number;
  /**
   * How many moves have been played, which the draws take: the encore
   * spends moves left without playing any, so this can't be worked out
   * from those.
   */
  readonly movesPlayed: number;
  /** The deal's seed, which every draw takes. */
  readonly seed: number;
  readonly lanes: Lanes;
  /** The id the next piece made takes, past every id the board has held. */
  readonly nextPieceId: number;
  /** The wind that turns, or null where the wind never turns. */
  readonly wind: TurningWind | null;
  readonly outcome: Outcome;
}
