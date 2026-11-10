import { multiplierAt } from "@fz/core/math";
import { brickKind } from "../catalog/bricks";
import { JUMP_POINTS, STAR_POINTS, STREAK } from "../tuning";
import type { Brick } from "../wall/wall";
import type { Run } from "./run";
import { starsOf } from "./stars";

/**
 * Returns how many times a break scores by its place in its round's streak,
 * from 1: once, then more from the 5th brick, the 10th and the 20th.
 */
export function streakTimes(streak: number): number {
  return multiplierAt(streak, STREAK);
}

/**
 * Returns what a brick scores as it breaks, the round's `streak`-th: its
 * kind's points for each hit it had whole, times the streak's multiplier.
 */
export function breakPoints(
  brick: Pick<Brick, "kind" | "full">,
  streak: number,
): number {
  return brickKind(brick.kind).points * brick.full * streakTimes(streak);
}

/** Returns what so many stars add to a level's points. */
export function starPoints(stars: number): number {
  return stars * STAR_POINTS;
}

/** Describes how the level in play's points add up, for the Cleared card. */
export interface LevelTally {
  /** What its bricks scored, the streaks' multipliers included. */
  readonly bricks: number;
  /** What its jumps added. */
  readonly jumps: number;
  /** What its stars added: nothing until it is cleared. */
  readonly stars: number;
}

/** Returns how the level in play's points add up, as the run stands. */
export function tallyOf(
  run: Pick<Run, "outcome" | "rounds" | "par" | "jumps" | "banked" | "score">,
): LevelTally {
  const jumps = run.jumps * JUMP_POINTS;
  const stars = starPoints(starsOf(run));
  return { bricks: run.score - run.banked - jumps - stars, jumps, stars };
}
