import type { Field } from "./field";
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

/**
 * Describes a run of the game, from the level it started at to its end, a
 * value each change replaces.
 *
 * A move that doesn't fit where the run stands returns it as it is, so the
 * shell can make each move as it comes.
 */
export interface Run {
  /** Tells runs apart: a new run takes a new one. */
  readonly id: number;
  /** Where everything random comes from: the same seed plays the same. */
  readonly seed: number;
  readonly speed: Speed;
  /** The number of the game's last level, clearing which wins the run. */
  readonly lastLevel: number;
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
  /** The lives the level in play's capsules have brought, as far as the run has taken them. */
  readonly levelGained: number;
  /** The lives the level in play has lost, as far as the run has taken them. */
  readonly levelLost: number;
  readonly outcome: Outcome;
}

/** What a run takes from the field of the level under way. */
export type LevelProgress = Pick<
  Field,
  "state" | "score" | "livesGained" | "livesLost"
>;

/** Says how a new run starts. */
export interface RunStart {
  readonly id: number;
  readonly seed: number;
  readonly speed: Speed;
  readonly lastLevel: number;
  /** The level it starts at, from 1. */
  readonly level: number;
}

/** Returns a new run, waiting for its first level to start. */
export function createRun({
  id,
  seed,
  speed,
  lastLevel,
  level,
}: RunStart): Run {
  return {
    id,
    seed,
    speed,
    lastLevel,
    firstLevel: level,
    level,
    banked: 0,
    score: 0,
    lives: FIRST_LIVES,
    nextLifeAt: FIRST_LIFE_POINTS,
    levelGained: 0,
    levelLost: 0,
    outcome: "ready",
  };
}

/** Returns whether a run has ended, lost or won. */
export function hasEnded(run: Run): boolean {
  return run.outcome === "over" || run.outcome === "won";
}

/** Returns how many levels a run has cleared since its first. */
export function levelsCleared(run: Run): number {
  const throughLevel = run.outcome === "cleared" || run.outcome === "won";
  return run.level - run.firstLevel + (throughLevel ? 1 : 0);
}

/**
 * Returns the run with a level under way: its first, or the one after the
 * level just cleared. Any other run is returned as it is.
 */
export function startLevel(run: Run): Run {
  if (run.outcome === "ready") return { ...run, outcome: "playing" };
  if (run.outcome !== "cleared") return run;
  return {
    ...run,
    level: run.level + 1,
    levelGained: 0,
    levelLost: 0,
    outcome: "playing",
  };
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
 * Returns the run caught up with the level under way, as its field now
 * stands: the level's points, then the lives its capsules brought, then the
 * lives it lost, then its clearing, the order they come in on a field,
 * however many of them a frame's steps took.
 *
 * So a run over stays over though a blast clears its level after the last
 * life is lost, and a level is banked once. A run whose field has nothing
 * new is returned as it is, so the shell can tell a frame that changed it.
 */
export function catchUp(run: Run, field: LevelProgress): Run {
  if (!isUnderWay(run) || !hasNews(run, field)) return run;
  const scored = withScore(run, run.banked + field.score);
  const gained = field.livesGained - run.levelGained;
  const lost = field.livesLost - run.levelLost;
  const lives = Math.min(MAX_LIVES, scored.lives + gained) - lost;
  const caughtUp = {
    ...scored,
    lives: Math.max(0, lives),
    levelGained: field.livesGained,
    levelLost: field.livesLost,
  };
  if (lives <= 0) return { ...caughtUp, outcome: "over" };
  if (field.state !== "cleared") return caughtUp;
  const banked = scored.score + clearingPoints(field.livesLost);
  const outcome = run.level >= run.lastLevel ? "won" : "cleared";
  return { ...withScore(caughtUp, banked), banked, outcome };
}

/**
 * Returns the seed of the level in play's field, the run's mixed with the
 * level's number, so no two levels draw alike.
 */
export function levelSeed(run: Run): number {
  return run.seed ^ Math.imul(run.level, 0x85ebca6b);
}

/** Returns whether a level's field has come to anything the run hasn't taken yet. */
function hasNews(run: Run, field: LevelProgress): boolean {
  return (
    run.banked + field.score !== run.score ||
    field.livesGained !== run.levelGained ||
    field.livesLost !== run.levelLost ||
    field.state === "cleared"
  );
}

/** Returns whether a level is under way, in play or paused. */
function isUnderWay(run: Run): boolean {
  return run.outcome === "playing" || run.outcome === "paused";
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
