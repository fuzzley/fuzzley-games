import { clearingPoints } from "./scoring";
import type { Speed } from "./speed";
import {
  FIRST_LIFE_POINTS,
  FIRST_LIVES,
  LIFE_POINTS,
  MAX_LIVES,
} from "./tuning";

/**
 * Says where a run stands: waiting for its first level to start, a level
 * under way or paused, a level cleared and the next waiting, ended with no
 * lives left, or won by clearing the last level.
 */
export type Outcome =
  "ready" | "playing" | "paused" | "cleared" | "over" | "won";

/** A run of the game, from the level it started at to its end, a value each change replaces. */
export interface Run {
  /** Tells runs apart: a new run takes a new one. */
  readonly id: number;
  /** Where everything random comes from: the same seed plays the same. */
  readonly seed: number;
  readonly speed: Speed;
  /** How many levels the game has, the last of which wins the run. */
  readonly levels: number;
  /** The level it started at, from 1. */
  readonly firstLevel: number;
  /** The level in play, or the last one cleared, from 1. */
  readonly level: number;
  /** The points of the levels cleared. */
  readonly banked: number;
  /** The points of the run so far, the level in play's included. */
  readonly score: number;
  readonly lives: number;
  /** The score that brings the next life. */
  readonly nextLifeAt: number;
  readonly outcome: Outcome;
}

/** Says how a new run starts. */
export interface RunStart {
  readonly id: number;
  readonly seed: number;
  readonly speed: Speed;
  readonly levels: number;
  /** The level it starts at, from 1. */
  readonly level: number;
}

/** Returns a new run, waiting for its first level to start. */
export function createRun({ id, seed, speed, levels, level }: RunStart): Run {
  return {
    id,
    seed,
    speed,
    levels,
    firstLevel: level,
    level,
    banked: 0,
    score: 0,
    lives: FIRST_LIVES,
    nextLifeAt: FIRST_LIFE_POINTS,
    outcome: "ready",
  };
}

/** Returns whether a run has ended, lost or won. */
export function hasEnded(run: Run): boolean {
  return run.outcome === "over" || run.outcome === "won";
}

/**
 * Returns the run with a level under way: its first, or the one after the
 * level just cleared. Any other run is returned as it is.
 */
export function startLevel(run: Run): Run {
  if (run.outcome === "ready") return { ...run, outcome: "playing" };
  if (run.outcome !== "cleared") return run;
  return { ...run, level: run.level + 1, outcome: "playing" };
}

/** Returns the run paused, if a level is under way. */
export function pause(run: Run): Run {
  return run.outcome === "playing" ? { ...run, outcome: "paused" } : run;
}

/** Returns the run under way again, if it was paused. */
export function resume(run: Run): Run {
  return run.outcome === "paused" ? { ...run, outcome: "playing" } : run;
}

/**
 * Returns the run with the points of the level in play as they now stand,
 * and the lives they bring.
 */
export function tally(run: Run, levelPoints: number): Run {
  return withScore(run, run.banked + levelPoints);
}

/** Returns the run with lives that capsules brought, up to the most it may hold. */
export function gainLives(run: Run, count: number): Run {
  return { ...run, lives: Math.min(MAX_LIVES, run.lives + count) };
}

/** Returns the run with a life lost, over if it was the last. */
export function loseLife(run: Run): Run {
  const lives = run.lives - 1;
  return { ...run, lives, outcome: lives > 0 ? run.outcome : "over" };
}

/**
 * Returns the run with the level in play cleared: its points banked with
 * what clearing it adds, and the run won if it was the last level.
 */
export function clearLevel(
  run: Run,
  levelPoints: number,
  livesLost: number,
): Run {
  const score = run.banked + levelPoints + clearingPoints(livesLost);
  const outcome = run.level >= run.levels ? "won" : "cleared";
  return { ...withScore(run, score), banked: score, outcome };
}

/**
 * Returns the seed of the level in play's field, the run's mixed with the
 * level's number, so no two levels draw alike.
 */
export function levelSeed(run: Run): number {
  return run.seed ^ Math.imul(run.level, 0x85ebca6b);
}

/** Returns the run at a score, with a life for each mark it passed on the way, up to the most it may hold. */
function withScore(run: Run, score: number): Run {
  let { lives, nextLifeAt } = run;
  while (score >= nextLifeAt) {
    lives = Math.min(MAX_LIVES, lives + 1);
    nextLifeAt += LIFE_POINTS;
  }
  return { ...run, score, lives, nextLifeAt };
}
