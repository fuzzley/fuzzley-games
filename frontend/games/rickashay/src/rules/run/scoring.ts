// What a round scores, as "The feel, in numbers" pays it (C12), by the
// tuning's points: each strike STRIKE_POINTS times the rally's step, each
// floor bounce its flight earned and kept BOUNCE_POINTS, and a jump
// JUMP_POINTS; and what the run tallies of a level's rounds, which its
// stars, its records and the sum on its Cleared card are read from. A
// star's STAR_POINTS are the run's to add, as the level is cleared.

import type { Run } from "@fz/brick-wall/rules/run";
import { multiplierAt } from "@fz/core/math";
import type { RoundOutcome } from "../flight/events";
import {
  BOUNCE_POINTS,
  JUMP_POINTS,
  RALLY_STEPS,
  STAR_POINTS,
  STRIKE_POINTS,
} from "../tuning";

/** Returns how many times a flight's strike scores by the rally it makes, from 1, as `RALLY_STEPS` step it up. */
export function rallyStep(rally: number): number {
  return multiplierAt(rally, RALLY_STEPS);
}

/** Returns what a flight's strike scores, the one that makes its rally `rally`: `STRIKE_POINTS` times the rally's step. */
export function strikePoints(rally: number): number {
  return STRIKE_POINTS * rallyStep(rally);
}

/**
 * Returns what a flight's strikes score at a rally, before its floor
 * bounces, in the same time however long the rally, as one read back from
 * storage may claim any length.
 */
export function rallyPoints(rally: number): number {
  // Every strike scores once; each step then adds what it scores over the
  // step below it for every strike from its own on.
  let multiples = rally;
  for (const [index, { from, times }] of RALLY_STEPS.entries()) {
    const below = RALLY_STEPS[index + 1]?.times ?? 1;
    multiples += (times - below) * Math.max(0, rally - from + 1);
  }
  return STRIKE_POINTS * multiples;
}

/** Describes what a round came to that its points and the run's tally read: its rally, its floor bounces and its jump. */
export type RoundCounts = Pick<RoundOutcome, "rally" | "earned" | "jumped">;

/**
 * Returns what a round scores: its flight's strikes, `BOUNCE_POINTS` for
 * each floor bounce it earned and kept, a spring brick's among them, and
 * `JUMP_POINTS` for a jump. A hot shot's own floor bounce is never earned,
 * and one lost to the most held pays nothing, as `RoundOutcome.earned`
 * counts neither.
 */
export function roundPoints({ rally, earned, jumped }: RoundCounts): number {
  return (
    rallyPoints(rally) + earned * BOUNCE_POINTS + (jumped ? JUMP_POINTS : 0)
  );
}

/** Returns what so many stars add to a level's points. */
export function starPoints(stars: number): number {
  return stars * STAR_POINTS;
}

/** Describes what the run tallies of the level in play's rounds. */
export interface LevelTally {
  /** How many of them jumped the wall. */
  readonly jumps: number;
  /** How many floor bounces their flights earned and kept. */
  readonly earned: number;
  /** The best rally of their flights, which the rally mark's star and the level's record read. */
  readonly bestRally: number;
}

/** What the run tallies of a level before its first round. */
export const UNTALLIED: LevelTally = { jumps: 0, earned: 0, bestRally: 0 };

/** Returns a level's tally with a round taken in: its jump counted, its floor bounces added and its rally kept if it is the best. */
export function tallied(tally: LevelTally, round: RoundCounts): LevelTally {
  return {
    jumps: tally.jumps + (round.jumped ? 1 : 0),
    earned: tally.earned + round.earned,
    bestRally: Math.max(tally.bestRally, round.rally),
  };
}

/** Describes how the level in play's points add up, as its Cleared card shows them. */
export interface LevelPoints {
  /** What its flights' strikes scored, the rally's steps included. */
  readonly strikes: number;
  /** What the floor bounces its flights earned and kept added. */
  readonly bounces: number;
  /** What its jumps added. */
  readonly jumps: number;
  /** What its stars added: nothing until it is cleared. */
  readonly stars: number;
}

/**
 * Returns how the level in play's points add up, from the run's points on
 * it, what it tallied of its rounds and the stars it has earned, none until
 * it is cleared.
 */
export function levelPoints(
  run: Pick<Run<LevelTally>, "tally" | "banked" | "score">,
  stars: number,
): LevelPoints {
  const bounces = run.tally.earned * BOUNCE_POINTS;
  const jumps = run.tally.jumps * JUMP_POINTS;
  const starred = starPoints(stars);
  return {
    strikes: run.score - run.banked - bounces - jumps - starred,
    bounces,
    jumps,
    stars: starred,
  };
}
