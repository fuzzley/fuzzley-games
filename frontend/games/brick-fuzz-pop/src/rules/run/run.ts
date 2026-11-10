import { type RunStage, hasEnded } from "@fz/core/run";
import { type Level, levelStart } from "../levels/level";
import { type LevelEntry, levelEntryOf, parseLevel } from "../levels/levels";
import type { RoundOutcome, RoundResult, RoundStart } from "../round/round";
import { starPoints } from "./scoring";
import { PARS, type Pars, parOf, starsFor } from "./stars";

/**
 * Says where a run stands: a level waiting for the player's first move,
 * under way or paused, a level cleared and the next waiting, ended by a
 * level lost, or won by clearing the last.
 */
export type Outcome = RunStage;

/** Names how a round in flight ends its level as it lands: cleared or lost. */
export type LevelEnding = Exclude<RoundResult, "on">;

/**
 * Describes a run of the game, from the level it started at to its end, a
 * value each change replaces. Where the level in play's next round starts
 * is the round's own, `RoundStart`, which the run leaves to the view.
 *
 * A round is taken in as it is released and lands once its flight has
 * played, so the run stays under way, and may pause, while the flight of
 * the round that ends its level plays. A move that doesn't fit where the
 * run stands returns it as it is, so the shell can make each move as it
 * comes.
 */
export interface Run {
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
  /** How many of those rounds jumped the wall. */
  readonly jumps: number;
  /** The points of the levels cleared before the level in play. */
  readonly banked: number;
  /**
   * The points of the run so far: the level in play's among them, each
   * round's from its release and its stars' once it is cleared.
   */
  readonly score: number;
  /** How the round in flight ends the level in play as it lands, or null while none ends it. */
  readonly ending: LevelEnding | null;
  readonly outcome: Outcome;
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

/** What a run takes from a round played. */
export type RoundTaken = Pick<RoundOutcome, "points" | "jumped" | "result">;

/**
 * Returns a new run, its first level waiting for the player's first move,
 * with its par on the depth it begins on. It throws for a level the game
 * doesn't have, or one with no par on that depth.
 */
export function createRun(
  { id, level, depth }: RunStart,
  levels: readonly LevelEntry[],
  pars: Pars = PARS,
): Run {
  return {
    id,
    lastLevel: levels.length,
    firstLevel: level,
    ...levelBegun(levels, pars, level, depth),
    banked: 0,
    score: 0,
    ending: null,
    outcome: "ready",
  };
}

/**
 * Returns whether a run is in progress, which a new game would lose: one
 * that hasn't ended and has played a round or cleared a level.
 */
export function isInProgress(run: Run): boolean {
  if (hasEnded(run.outcome)) return false;
  return run.rounds > 0 || levelsCleared(run) > 0;
}

/** Returns how many levels a run has cleared since its first. */
export function levelsCleared(run: Run): number {
  const throughLevel = run.outcome === "cleared" || run.outcome === "won";
  return run.level - run.firstLevel + (throughLevel ? 1 : 0);
}

/** Returns the level in play, ready to play. */
export function levelOf(
  run: Pick<Run, "level">,
  levels: readonly LevelEntry[],
): Level {
  return parseLevel(levelEntryOf(levels, run.level).data);
}

/**
 * Returns where the level in play's first round starts: the level laid out
 * on the depth it began on, which its par is set for and the saved game
 * reads its wall against, so lay a level out with this alone.
 */
export function openingOf(run: Pick<Run, "depth">, level: Level): RoundStart {
  return levelStart(level, run.depth);
}

/** Returns the run with its level under way, if it was waiting for the first move. */
export function startLevel(run: Run): Run {
  return run.outcome === "ready" ? { ...run, outcome: "playing" } : run;
}

/**
 * Returns the run with a round taken in as it is released, its flight
 * still to play: the round, its points and whether it jumped counted, and
 * how it ends the level, if it does, held until it lands
 * ({@link landRound}). A run not under way, paused, or with a round in
 * flight that ends its level is returned as it is.
 */
export function takeRound(run: Run, round: RoundTaken): Run {
  if (run.outcome !== "playing" || run.ending !== null) return run;
  return {
    ...run,
    rounds: run.rounds + 1,
    jumps: run.jumps + (round.jumped ? 1 : 0),
    score: run.score + round.points,
    ending: round.result === "on" ? null : round.result,
  };
}

/**
 * Returns the run with its round in flight landed, as {@link afterLanding}
 * says, if its level is under way and not paused, as a flight lands only
 * while it plays. Any other run is returned as it is.
 */
export function landRound(run: Run): Run {
  return run.outcome === "playing" ? afterLanding(run) : run;
}

/**
 * Returns the run as it stands once its round in flight lands, whatever its
 * stage: its level cleared, its stars' points added, which wins the run on
 * the last level; or lost, which ends it. A run with no ending held is
 * returned as it is.
 *
 * The saved game keeps a run so as its round is released, so keep the
 * records from it then too, or a reload mid-flight loses them: a level
 * cleared (`levelResultOf()`) and the run ended (`isNewBest()`, then
 * `withRunEnded()`).
 */
export function afterLanding(run: Run): Run {
  switch (run.ending) {
    case null:
      return run;
    case "lost":
      return { ...run, ending: null, outcome: "over" };
    case "cleared":
      return {
        ...run,
        score: run.score + starPoints(starsFor(run.rounds, run.par)),
        ending: null,
        outcome: run.level >= run.lastLevel ? "won" : "cleared",
      };
  }
}

/**
 * Returns the run gone on to the level after the one just cleared, its
 * points banked, the next waiting for the first move with its par on the
 * depth it begins on. Any other run is returned as it is.
 */
export function nextLevel(
  run: Run,
  depth: number,
  levels: readonly LevelEntry[],
  pars: Pars = PARS,
): Run {
  if (run.outcome !== "cleared") return run;
  return {
    ...run,
    ...levelBegun(levels, pars, run.level + 1, depth),
    banked: run.score,
    outcome: "ready",
  };
}

/** Returns the run paused, if its level is under way, a round in flight or not. */
export function pause(run: Run): Run {
  return run.outcome === "playing" ? { ...run, outcome: "paused" } : run;
}

/**
 * Returns the run going on, if it was paused: under way again, or waiting
 * again for the first move of a level with no round played yet, as one
 * taken up before its first round is.
 */
export function resume(run: Run): Run {
  if (run.outcome !== "paused") return run;
  return { ...run, outcome: run.rounds === 0 ? "ready" : "playing" };
}

/** Returns what a run keeps of a level as it begins: its number, the depth and par, and no rounds yet. */
function levelBegun(
  levels: readonly LevelEntry[],
  pars: Pars,
  level: number,
  depth: number,
): Pick<Run, "level" | "depth" | "par" | "rounds" | "jumps"> {
  const { id } = levelEntryOf(levels, level).data;
  return { level, depth, par: parOf(id, depth, pars), rounds: 0, jumps: 0 };
}
