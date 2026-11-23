// A run of a wall game, from the level it started at to its end: where it
// stands, its levels, the level in play's rounds, depth and par, and its
// points and stars. What a game tallies of a level's rounds, such as its
// jumps, the stars a level cleared earns and what a star is worth are the
// game's own, in the RunRules it hands in.

import { type RunStage, hasEnded } from "@fz/core/run";
import { type Pars, parOf } from "./par";
import { type IdentifiedLevel, levelIdOf } from "./progress";

/** Names how a round in flight ends its level as it lands: cleared or lost. */
export type LevelEnding = "cleared" | "lost";

/**
 * Describes a run of a wall game, from the level it started at to its end,
 * a value each change replaces, over what the game tallies of the level in
 * play's rounds, `T`. Where the level in play's next round starts is the
 * game's own.
 *
 * A round is taken in as it is released and lands once its flight has
 * played, so the run stays under way, and may pause, while the flight of
 * the round that ends its level plays. A move that doesn't fit where the
 * run stands returns it as it is, so a game's shell can make each move as
 * it comes.
 */
export interface Run<T> {
  /** Tells runs apart: a new run takes a new one. */
  readonly id: number;
  /** The number of the game's last level, clearing which wins the run. */
  readonly lastLevel: number;
  /** The level it started at, from 1. */
  readonly firstLevel: number;
  /** The level in play, or the last one cleared, from 1. */
  readonly level: number;
  /** The depth of the field as the level in play began, which its par is set for. */
  readonly depth: number;
  /** The level in play's par on that depth. */
  readonly par: number;
  /** The rounds the level in play has played, each from its release. */
  readonly rounds: number;
  /** What the game tallies of those rounds, such as how many jumped the wall. */
  readonly tally: T;
  /** The points of the levels cleared before the level in play. */
  readonly banked: number;
  /** The stars the levels it has cleared earned, the level in play's among them once it is cleared. */
  readonly stars: number;
  /**
   * The points of the run so far: the level in play's among them, each
   * round's from its release and its stars' once it is cleared.
   */
  readonly score: number;
  /** How the round in flight ends the level in play as it lands, or null while none ends it. */
  readonly ending: LevelEnding | null;
  readonly outcome: RunStage;
}

/** Says how a new run starts. */
export interface RunStart {
  /** Tells it from the runs before it. */
  readonly id: number;
  /** The level it starts at, from 1. */
  readonly level: number;
  /** The field's depth as that level begins. */
  readonly depth: number;
}

/** Describes what a run takes in of a round as it is released: its points, and how it leaves its level. */
export interface TakenRound {
  readonly points: number;
  readonly result: "on" | LevelEnding;
}

/** Describes the level in play as a run has played it, which a game's stars are worked out from. */
export type LevelPlay<T> = Pick<
  Run<T>,
  "level" | "depth" | "par" | "rounds" | "tally"
>;

/** Holds what a wall game's run is handed of the game: its pars, what it tallies of a level and what a level cleared earns. */
export interface RunRules<T, R extends TakenRound = TakenRound> {
  /** Each level's par on each depth, as the game's table of them holds it. */
  readonly pars: Pars;
  /** What the game tallies of a level before its first round. */
  readonly untallied: T;
  /** Returns a level's tally with a round of `R` taken in. */
  readonly tallied: (tally: T, round: R) => T;
  /** Returns the stars the level in play earns as it is cleared, at least one. */
  readonly starsOf: (level: LevelPlay<T>) => number;
  /** The points each star adds to the score. */
  readonly starPoints: number;
}

/**
 * Returns a new run, its first level waiting for the player's first move,
 * with its par on the depth it begins on. It throws for a level the game
 * doesn't have, or one with no par on that depth.
 */
export function createRun<T>(
  { id, level, depth }: RunStart,
  levels: readonly IdentifiedLevel[],
  rules: Pick<RunRules<T>, "pars" | "untallied">,
): Run<T> {
  return {
    id,
    lastLevel: levels.length,
    firstLevel: level,
    ...levelBegun(levels, rules, level, depth),
    banked: 0,
    stars: 0,
    score: 0,
    ending: null,
    outcome: "ready",
  };
}

/**
 * Returns whether a run is in progress, which a new game would lose: one
 * that hasn't ended and has played a round or cleared a level.
 */
export function isInProgress(run: Run<unknown>): boolean {
  if (hasEnded(run.outcome)) return false;
  return run.rounds > 0 || levelsCleared(run) > 0;
}

/** Returns whether a run's level in play is cleared: its card waits, or clearing it won the run. */
export function isLevelCleared(run: Pick<Run<unknown>, "outcome">): boolean {
  return run.outcome === "cleared" || run.outcome === "won";
}

/** Returns how many levels a run has cleared since its first. */
export function levelsCleared(
  run: Pick<Run<unknown>, "level" | "firstLevel" | "outcome">,
): number {
  return run.level - run.firstLevel + (isLevelCleared(run) ? 1 : 0);
}

/** Returns the run with its level under way, if it was waiting for the first move. */
export function startLevel<T>(run: Run<T>): Run<T> {
  return run.outcome === "ready" ? { ...run, outcome: "playing" } : run;
}

/**
 * Returns the run with a round taken in as it is released, its flight
 * still to play: the round counted, its points scored and the game's tally
 * of it kept, and how it ends the level, if it does, held until it lands
 * ({@link landRound}). A run not under way, paused, or with a round in
 * flight that ends its level is returned as it is.
 */
export function takeRound<T, R extends TakenRound>(
  run: Run<T>,
  round: R,
  rules: Pick<RunRules<T, R>, "tallied">,
): Run<T> {
  if (run.outcome !== "playing" || run.ending !== null) return run;
  return {
    ...run,
    rounds: run.rounds + 1,
    tally: rules.tallied(run.tally, round),
    score: run.score + round.points,
    ending: round.result === "on" ? null : round.result,
  };
}

/**
 * Returns the run with its round in flight landed, as {@link afterLanding}
 * says, if its level is under way and not paused, as a flight lands only
 * while it plays. Any other run is returned as it is.
 */
export function landRound<T>(
  run: Run<T>,
  rules: Pick<RunRules<T>, "starsOf" | "starPoints">,
): Run<T> {
  return run.outcome === "playing" ? afterLanding(run, rules) : run;
}

/**
 * Returns the run as it stands once its round in flight lands, whatever
 * its stage: its level cleared, the stars it earned and their points
 * added, which wins the run on the last level; or lost, which ends it. A
 * run with no ending held is returned as it is.
 *
 * Keep the records from the run it returns as the flight lands, once
 * nothing can change how the round ends. A saved game that keeps a run as
 * its round is released is ahead of the records until the flight lands, so
 * land a flight in the air at once as the page is hidden, whatever the
 * run's stage.
 */
export function afterLanding<T>(
  run: Run<T>,
  rules: Pick<RunRules<T>, "starsOf" | "starPoints">,
): Run<T> {
  switch (run.ending) {
    case null:
      return run;
    case "lost":
      return { ...run, ending: null, outcome: "over" };
    case "cleared": {
      const earned = rules.starsOf(run);
      return {
        ...run,
        stars: run.stars + earned,
        score: run.score + earned * rules.starPoints,
        ending: null,
        outcome: run.level >= run.lastLevel ? "won" : "cleared",
      };
    }
  }
}

/**
 * Returns the run gone on to the level after the one just cleared, its
 * points banked, the next waiting for the first move with its par on the
 * depth it begins on. Any other run is returned as it is.
 */
export function nextLevel<T>(
  run: Run<T>,
  depth: number,
  levels: readonly IdentifiedLevel[],
  rules: Pick<RunRules<T>, "pars" | "untallied">,
): Run<T> {
  if (run.outcome !== "cleared") return run;
  return {
    ...run,
    ...levelBegun(levels, rules, run.level + 1, depth),
    banked: run.score,
    outcome: "ready",
  };
}

/**
 * Returns the run on a depth the field has taken: a level with no round
 * played begun again on it, its par with it, or any other run as it is,
 * since a level's par stays that of the depth it began on. It throws for a
 * level with no par on that depth, as {@link createRun} does.
 */
export function takeDepth<T>(
  run: Run<T>,
  depth: number,
  levels: readonly IdentifiedLevel[],
  rules: Pick<RunRules<T>, "pars" | "untallied">,
): Run<T> {
  if (run.rounds > 0 || run.depth === depth) return run;
  return { ...run, ...levelBegun(levels, rules, run.level, depth) };
}

/** Returns the run paused, if its level is under way, a round in flight or not. */
export function pause<T>(run: Run<T>): Run<T> {
  return run.outcome === "playing" ? { ...run, outcome: "paused" } : run;
}

/**
 * Returns the run going on, if it was paused: under way again, or waiting
 * again for the first move of a level with no round played yet, as one
 * taken up before its first round is.
 */
export function resume<T>(run: Run<T>): Run<T> {
  if (run.outcome !== "paused") return run;
  return { ...run, outcome: run.rounds === 0 ? "ready" : "playing" };
}

/** Returns what a run keeps of a level as it begins: its number, the depth and par, and no rounds yet. */
function levelBegun<T>(
  levels: readonly IdentifiedLevel[],
  { pars, untallied }: Pick<RunRules<T>, "pars" | "untallied">,
  level: number,
  depth: number,
): Pick<Run<T>, "level" | "depth" | "par" | "rounds" | "tally"> {
  const par = parOf(levelIdOf(levels, level), depth, pars);
  return { level, depth, par, rounds: 0, tally: untallied };
}
