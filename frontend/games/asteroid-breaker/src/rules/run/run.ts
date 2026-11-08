import type { Field, WaveStart } from "../field/field";
import type { Strays } from "../hazards/strays";
import { type Crew, createCrew } from "../ship/pilots";
import type { Speed } from "../speed";
import { FIRST_SHIP_POINTS, SHIP_POINTS } from "../tuning";

/**
 * Says where a run stands: a wave waiting for the player's first move, under
 * way or paused, a wave cleared, or ended with no ship left. No run is won:
 * Endless goes on until the ships run out.
 */
export type Outcome = "ready" | "playing" | "paused" | "cleared" | "over";

/**
 * Describes a run of the game, from the wave it started at to its end, a
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
  /** The wave it started at, from 1. */
  readonly firstWave: number;
  /** The wave in play, or the last one cleared, from 1. */
  readonly wave: number;
  /** The points of the waves cleared. */
  readonly banked: number;
  /** The points of the run so far, the wave in play's included. */
  readonly score: number;
  /** Who flies the run's ships and who waits at home, as the field last left them. */
  readonly crew: Crew;
  /** The score the next ship comes at. */
  readonly nextShipAt: number;
  /** The strays brought home in the waves cleared. */
  readonly straysBanked: number;
  /** The strays brought home so far, the wave in play's included. */
  readonly strays: number;
  readonly outcome: Outcome;
}

/** Describes what a run takes from the field of the wave under way. */
export interface WaveProgress extends Pick<
  Field,
  "cleared" | "score" | "crew" | "nextShipAt"
> {
  readonly strays: Pick<Strays, "broughtHome">;
}

/** Says how a new run starts. */
export interface RunStart {
  readonly id: number;
  readonly seed: number;
  readonly speed: Speed;
  /** The wave it starts at, from 1. */
  readonly wave: number;
}

/** Returns a new run, waiting for its first wave to start, with its first crew and no points. */
export function createRun({ id, seed, speed, wave }: RunStart): Run {
  return {
    id,
    seed,
    speed,
    firstWave: wave,
    wave,
    banked: 0,
    score: 0,
    crew: createCrew(),
    nextShipAt: FIRST_SHIP_POINTS,
    straysBanked: 0,
    strays: 0,
    outcome: "ready",
  };
}

/** Returns whether a run has ended, its ships run out. */
export function hasEnded(run: Run): boolean {
  return run.outcome === "over";
}

/**
 * Returns whether a run is in progress, which a new game would lose: a
 * wave under way or just cleared, or one waiting for its first move after
 * a wave cleared.
 */
export function isInProgress(run: Run): boolean {
  if (run.outcome === "ready") return hasClearedAWave(run);
  return isUnderWay(run) || run.outcome === "cleared";
}

/** Returns how many waves a run has cleared since its first. */
export function wavesCleared(run: Run): number {
  return run.wave - run.firstWave + (run.outcome === "cleared" ? 1 : 0);
}

/** Returns whether a run has cleared a wave since its first. */
export function hasClearedAWave(run: Run): boolean {
  return wavesCleared(run) > 0;
}

/**
 * Returns whether a run has cleared every wave of a game of so many written
 * ones, from the first, which takes it into Endless.
 */
export function hasClearedAll(run: Run, written: number): boolean {
  return run.firstWave === 1 && wavesCleared(run) >= written;
}

/** Returns the run with its wave under way, if it was waiting for the first move. */
export function startWave(run: Run): Run {
  return run.outcome === "ready" ? { ...run, outcome: "playing" } : run;
}

/**
 * Returns the run gone on to the wave after the one just cleared, waiting
 * for its first move. Any other run is returned as it is.
 */
export function nextWave(run: Run): Run {
  if (run.outcome !== "cleared") return run;
  return { ...run, wave: run.wave + 1, outcome: "ready" };
}

/** Returns the run paused, if a wave is under way. */
export function pause(run: Run): Run {
  return run.outcome === "playing" ? { ...run, outcome: "paused" } : run;
}

/**
 * Returns the run going on, if it was paused: under way again, or waiting
 * again for the first move of a wave whose field hasn't moved, as one taken
 * up before its first move is.
 */
export function resume(run: Run, field: Pick<Field, "steps">): Run {
  if (run.outcome !== "paused") return run;
  return { ...run, outcome: field.steps === 0 ? "ready" : "playing" };
}

/**
 * Returns the run caught up with the wave under way, as its field now
 * stands: its points, its crew, the next ship's mark and the strays it
 * brought home, then its end, with no one left flying, or its clearing,
 * banked once.
 *
 * So a run over stays over though a blast clears its wave after the last
 * ship is lost. A run whose field has nothing new is returned as it is, so
 * the shell can tell a frame that changed it.
 */
export function catchUp(run: Run, field: WaveProgress): Run {
  if (!isUnderWay(run) || !hasNews(run, field)) return run;
  const caughtUp: Run = {
    ...run,
    score: run.banked + field.score,
    crew: field.crew,
    nextShipAt: field.nextShipAt,
    strays: run.straysBanked + field.strays.broughtHome,
  };
  if (field.crew.flying.length === 0) return { ...caughtUp, outcome: "over" };
  if (!field.cleared) return caughtUp;
  return {
    ...caughtUp,
    banked: caughtUp.score,
    straysBanked: caughtUp.strays,
    outcome: "cleared",
  };
}

/**
 * Returns the seed of the wave in play's field, the run's mixed with the
 * wave's number, so no two waves draw alike.
 */
export function waveSeed(run: Run): number {
  return run.seed ^ Math.imul(run.wave, 0x85ebca6b);
}

/** Returns what the field of the run's wave in play takes from the run as it starts. */
export function waveStart(run: Run): WaveStart {
  return {
    seed: waveSeed(run),
    crew: run.crew,
    banked: run.banked,
    nextShipAt: run.nextShipAt,
  };
}

/**
 * Returns the score the next ship comes at past a score: the first mark,
 * or the next of those every {@link SHIP_POINTS} after it, as the field
 * moves the mark on, at a full crew too.
 */
export function nextShipAfter(score: number): number {
  if (score < FIRST_SHIP_POINTS) return FIRST_SHIP_POINTS;
  const passed = Math.floor((score - FIRST_SHIP_POINTS) / SHIP_POINTS) + 1;
  return FIRST_SHIP_POINTS + passed * SHIP_POINTS;
}

/** Returns whether a wave's field has come to anything the run hasn't taken yet. */
function hasNews(run: Run, field: WaveProgress): boolean {
  return (
    run.banked + field.score !== run.score ||
    field.crew !== run.crew ||
    field.nextShipAt !== run.nextShipAt ||
    run.straysBanked + field.strays.broughtHome !== run.strays ||
    field.cleared
  );
}

/** Returns whether a wave is under way, in play or paused. */
function isUnderWay(run: Run): boolean {
  return run.outcome === "playing" || run.outcome === "paused";
}
