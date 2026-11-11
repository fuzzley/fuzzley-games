// The measure of a wall the careless player and the solver choose their
// shots by: the sketch's score() (docs/brick-fuzz-pop/sketch/sim.mjs), each
// of its numbers named, since the careless player's floors were tuned with
// it. The solver's certificates are replayed in every browser, so it is
// held as the rules are (eslint.config.js), to their fence and their exact
// arithmetic.

import { fieldRowOf } from "../rules/grid";
import type { RoundOutcome, RoundStart } from "../rules/round/round";
import {
  DANGER_ROW,
  inDanger,
  isNeeded,
  lowestNeededRow,
} from "../rules/wall/lower";
import type { Wall } from "../rules/wall/wall";

/** What a lost level measures: less than any wall still standing. */
const LOST_SCORE = -1_000_000_000;

/** What a cleared level measures before its rounds are taken off: more than any wall still standing. */
const CLEARED_SCORE = 1_000_000_000;

/** What each round a cleared level took takes off its measure, so the fewer rounds the better. */
const ROUND_COST = 1000;

/** What each brick the level needs weighs on top of its hits left, so breaking a brick counts for more than wearing a hit off one. */
const BRICK_WEIGHT = 1.5;

/** How much more a brick weighs for standing low: its weight times 1 and this over its row squared, 15 times in row 1. */
const LOW_WEIGHT = 14;

/** What a brick the level needs in the row over the floor's, or lower, takes off: one step from losing it. */
const DANGER_COST = 500;

/** What the lowest brick the level needs standing in row 2 takes off: two steps from losing it. */
const NEAR_DANGER_COST = 60;

/** What each friend in the crew adds. */
const FRIEND_WORTH = 6;

/** What a boon earned for the next shot adds. */
const BOON_WORTH = 25;

/** Describes what the measure reads of a round played: how it left its level, and the next round's start. */
export interface MeasuredRound {
  readonly outcome: Pick<RoundOutcome, "result">;
  readonly next: Pick<RoundStart, "wall" | "crew" | "boon">;
}

/**
 * Returns how well a round left its level, the higher the better, given
 * the rounds the level has played, this one among them: a lost level the
 * least, and a cleared one the most, less for each round it took; else
 * each brick the level needs weighed by its hits left and how low it
 * stands, the field's rows counted from the floor, the danger of the
 * lowest, then the crew and a boon earned.
 */
export function wallScore(
  { outcome, next }: MeasuredRound,
  rounds: number,
): number {
  if (outcome.result === "lost") return LOST_SCORE;
  if (outcome.result === "cleared") return CLEARED_SCORE - rounds * ROUND_COST;
  const { wall, crew, boon } = next;
  let weight = 0;
  for (const [cell, brick] of wall.bricks.entries()) {
    if (brick === null || !isNeeded(brick)) continue;
    const row = fieldRowOf(wall, cell);
    weight += (brick.hits + BRICK_WEIGHT) * (1 + LOW_WEIGHT / (row * row));
  }
  return (
    -weight -
    dangerOf(wall) +
    crew.friends.length * FRIEND_WORTH +
    (boon === null ? 0 : BOON_WORTH)
  );
}

/** Returns what the lowest brick a wall's level needs takes off for its row: the most in danger, less a row over it, else nothing. */
function dangerOf(wall: Wall): number {
  if (inDanger(wall)) return DANGER_COST;
  return lowestNeededRow(wall) === DANGER_ROW + 1 ? NEAR_DANGER_COST : 0;
}
