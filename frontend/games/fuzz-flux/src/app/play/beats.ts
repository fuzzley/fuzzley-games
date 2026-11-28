// What a move on the board has come to at a moment of its timeline, on the
// scene's clock: each goal's count as its flights land, the board's rest,
// and the card at the level's end, each star on which lights as the view's
// `starsLitAt()` says; and the wind, turned as the gust that turns it sets
// in. A beat falls in the first frame that stands past it, as a cue at the
// same moment plays.

import type { Card, WindShown } from "../../view/run_state";
import type { GoalCount, Timeline } from "../../view/timeline/timeline";

/**
 * Describes what the play on the board has come to, which the bar and the
 * card show as it comes: what each goal still asks for as its flights have
 * landed, whether the moves left show in the warning color, the card once
 * the level's end has come to it, how many of its stars are lit, and the
 * wind, or null for a level with none.
 */
export interface Beats {
  readonly goalsLeft: readonly number[];
  readonly movesLow: boolean;
  readonly card: Card | null;
  readonly starsLit: number;
  readonly wind: WindShown | null;
}

/** Returns whether a beat at a moment of a timeline has passed, the play standing at another. */
export function hasPassed(atMs: number, playedMs: number): boolean {
  return atMs < playedMs;
}

/**
 * Returns what each goal asks for at a moment of a move's timeline: what it
 * asked as the move started, or as its last count to land by then left it.
 */
export function goalsLeftAt(
  counts: readonly GoalCount[],
  from: readonly number[],
  playedMs: number,
): readonly number[] {
  const left = [...from];
  for (const count of counts) {
    if (hasPassed(count.atMs, playedMs)) left[count.goal] = count.left;
  }
  return left;
}

/** Returns whether two lists of counts hold the same counts, in the same order. */
export function sameCounts(
  one: readonly number[],
  other: readonly number[],
): boolean {
  return (
    one.length === other.length &&
    one.every((count, place) => count === other[place])
  );
}

/** Returns the card at a level's end once its beat has passed on a move's timeline, or null before it, or for a move that ends nothing. */
export function cardAt(
  { end }: Pick<Timeline, "end">,
  card: Card | null,
  playedMs: number,
): Card | null {
  return end !== null && hasPassed(end.cardMs, playedMs) ? card : null;
}

/**
 * Returns the wind at a moment of a move's timeline: as it blew as the
 * move started until the beat the wind turns, after a move that turns it,
 * and as the move leaves it from then, or from the start after one that
 * turns none.
 */
export function windAt(
  { windTurnsMs }: Pick<Timeline, "windTurnsMs">,
  from: WindShown | null,
  to: WindShown | null,
  playedMs: number,
): WindShown | null {
  return windTurnsMs === undefined || hasPassed(windTurnsMs, playedMs)
    ? to
    : from;
}
