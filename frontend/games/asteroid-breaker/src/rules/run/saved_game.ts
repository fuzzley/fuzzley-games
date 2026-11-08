import { isCount, isRecord, isWhole } from "@fz/core/json";
import type { Field, PlayerSetup } from "../field/field";
import {
  type SavableField,
  type SavedField,
  type WaveSoFar,
  layOutKeptField,
  readField,
  savedField,
} from "../field/kept_field";
import { PILOT_COLORS, type Pilot } from "../ship/pilots";
import { type Speed, isSpeed } from "../speed";
import { MAX_SHIPS } from "../tuning";
import { waveToPlay } from "../waves/endless";
import { type Wave, type WaveEntry, waveEntryOf } from "../waves/waves";
import {
  type Run,
  hasClearedAWave,
  isInProgress,
  nextShipAfter,
  nextWave,
  waveStart,
} from "./run";

/** A run under way as storage keeps it. */
export interface SavedGame {
  /** The id of the wave in play, which must still be the wave of its number. */
  readonly waveId: string;
  readonly wave: number;
  readonly firstWave: number;
  readonly speed: Speed;
  readonly seed: number;
  readonly banked: number;
  readonly score: number;
  /** The pilots of the run's ships, the one at the controls first. */
  readonly flying: readonly Pilot[];
  /** The strays brought home, waiting to fly the next ships gained. */
  readonly home: readonly Pilot[];
  readonly lastGiven: Pilot;
  readonly nextShipAt: number;
  readonly straysBanked: number;
  readonly strays: number;
  /** Each stray the run brought home, in the order they came, for the result card. */
  readonly broughtHome: readonly Pilot[];
  /** Whether the run was flown on numbers the debug menu tuned, so it keeps no records. */
  readonly tuned: boolean;
  /**
   * The wave's field, or null for a wave after the run's first not yet
   * begun or not yet moved, which is laid out afresh.
   */
  readonly field: SavedField | null;
}

/** A run storage kept, taken up: the run, paused, and what else of it was kept. */
export interface TakenUp {
  readonly run: Run;
  readonly field: SavedField | null;
  /** Each stray brought home, or none where storage's count doesn't match the run's. */
  readonly broughtHome: readonly Pilot[];
  readonly tuned: boolean;
}

/** What of the run the shell keeps beside it. */
export interface RunKeeping {
  /** Each stray brought home, in the order they came. */
  readonly broughtHome: readonly Pilot[];
  /** Whether the run was flown on numbers the debug menu tuned. */
  readonly tuned: boolean;
}

/**
 * Returns a run under way and its field as storage keeps them, or null for
 * a run with nothing to keep: one whose first wave hasn't moved yet, or one
 * that has ended.
 *
 * A run whose wave was just cleared is kept at the start of the next, so
 * the page going away over the Cleared card loses nothing, and a later
 * wave not yet moved as one not yet begun, so it is laid out afresh on the
 * room it comes back to, as a wave waiting for its first move is.
 */
export function saveGame(
  run: Run,
  field: SavableField,
  waves: readonly WaveEntry[],
  keeping: RunKeeping,
): SavedGame | null {
  if (!isInProgress(run)) return null;
  if (run.outcome === "cleared") {
    return savedRun(nextWave(run), null, waves, keeping);
  }
  if (field.steps > 0) return savedRun(run, savedField(field), waves, keeping);
  return hasClearedAWave(run) ? savedRun(run, null, waves, keeping) : null;
}

/**
 * Returns the run storage kept, paused, under a new id, with its wave's
 * field as kept, or null if it can't be trusted: a wave the game doesn't
 * have under that number, a field that doesn't fit the wave, a number out
 * of its range, or a state no run comes to.
 */
export function restoreGame(
  value: unknown,
  waves: readonly WaveEntry[],
  id: number,
): TakenUp | null {
  if (!isRecord(value)) return null;
  const run = readRun(value, waves, id);
  const { tuned } = value;
  if (!run || typeof tuned !== "boolean") return null;
  const kept = value["field"];
  const soFar = waveSoFar(run);
  let field: SavedField | null = null;
  if (kept !== null) {
    const wave = waveToPlay(waveEntryOf(waves, run.wave), run.seed);
    field = readField(kept, wave, soFar);
    if (!field) return null;
  } else if (!hasClearedAWave(run) || hasScored(soFar)) {
    return null;
  }
  const { broughtHome } = value;
  const drawn = isPilots(broughtHome) && broughtHome.length === run.strays;
  return { run, field, broughtHome: drawn ? broughtHome : [], tuned };
}

/**
 * Returns the wave in play's field as storage kept it, laid out afresh as
 * the run started its wave, at the size it was laid out at, and stretched
 * to the size it was kept at, its points and strays brought home on it
 * from the run, as `layOutKeptField()` says.
 */
export function takeUpField(
  wave: Wave,
  setup: PlayerSetup,
  saved: SavedField,
  run: Run,
): Field {
  const start = { ...waveStart(run), ...setup, speed: run.speed };
  return layOutKeptField(wave, start, saved, waveSoFar(run));
}

/**
 * Returns what a run has scored on its wave in play: its points and the
 * strays it has brought home.
 */
export function waveSoFar(run: Run): WaveSoFar {
  return {
    points: run.score - run.banked,
    straysHome: run.strays - run.straysBanked,
  };
}

/**
 * Returns the run storage kept, paused, under a new id, or null if it
 * fails a check: its wave, its speed and seed, its points, its strays or
 * its crew.
 */
export function readRun(
  value: Readonly<Record<string, unknown>>,
  waves: readonly WaveEntry[],
  id: number,
): Run | null {
  if (
    !hasKnownWave(value, waves) ||
    !hasSpeedAndSeed(value) ||
    !hasSoundScore(value) ||
    !hasSoundStrays(value) ||
    !hasSoundCrew(value, value.strays)
  ) {
    return null;
  }
  const { seed, speed, firstWave, wave, banked, score, nextShipAt } = value;
  const { flying, home, lastGiven, straysBanked, strays } = value;
  return {
    id,
    seed,
    speed,
    firstWave,
    wave,
    banked,
    score,
    crew: { flying, home, lastGiven },
    nextShipAt,
    straysBanked,
    strays,
    outcome: "paused",
  };
}

/**
 * Returns whether a run kept names a wave the game has under its number,
 * by the id the game gives it there, and a first wave from the first to
 * it.
 */
export function hasKnownWave(
  value: Readonly<Record<string, unknown>>,
  waves: readonly WaveEntry[],
): value is Pick<SavedGame, "waveId" | "wave" | "firstWave"> {
  const { waveId, wave, firstWave } = value;
  return (
    isWaveNumber(wave) &&
    isWaveNumber(firstWave) &&
    firstWave <= wave &&
    waveEntryOf(waves, wave).data.id === waveId
  );
}

/** Returns whether a run kept is flown at a speed there is, from a whole seed. */
export function hasSpeedAndSeed(
  value: Readonly<Record<string, unknown>>,
): value is Pick<SavedGame, "speed" | "seed"> {
  const { speed, seed } = value;
  return isSpeed(speed) && isWhole(seed);
}

/**
 * Returns whether a run kept holds its points banked and a score of no
 * fewer, with the next ship's mark past that score.
 */
export function hasSoundScore(
  value: Readonly<Record<string, unknown>>,
): value is Pick<SavedGame, "banked" | "score" | "nextShipAt"> {
  const { banked, score, nextShipAt } = value;
  return (
    isCount(banked) &&
    isCount(score) &&
    score >= banked &&
    nextShipAt === nextShipAfter(score)
  );
}

/**
 * Returns whether a run kept holds the strays it banked and a count of
 * strays brought home of no fewer.
 */
export function hasSoundStrays(
  value: Readonly<Record<string, unknown>>,
): value is Pick<SavedGame, "straysBanked" | "strays"> {
  const { straysBanked, strays } = value;
  return isCount(straysBanked) && isCount(strays) && strays >= straysBanked;
}

/**
 * Returns whether a run kept holds a sound crew, given the strays it has
 * brought home: from one pilot flying to as many as a run has ships, no
 * more at home than those strays, and a last color given, each a pilot's.
 */
export function hasSoundCrew(
  value: Readonly<Record<string, unknown>>,
  strays: number,
): value is Pick<SavedGame, "flying" | "home" | "lastGiven"> {
  const { flying, home, lastGiven } = value;
  return (
    isPilots(flying) &&
    flying.length > 0 &&
    flying.length <= MAX_SHIPS &&
    isPilots(home) &&
    home.length <= strays &&
    isPilot(lastGiven)
  );
}

/**
 * Returns whether a run has scored on its wave in play, points or a stray
 * brought home, which a wave kept as not yet begun can't have.
 */
export function hasScored({ points, straysHome }: WaveSoFar): boolean {
  return points > 0 || straysHome > 0;
}

/** Returns a run and its field as storage keeps them, naming its wave by its id. */
function savedRun(
  run: Run,
  field: SavedField | null,
  waves: readonly WaveEntry[],
  { broughtHome, tuned }: RunKeeping,
): SavedGame {
  return {
    waveId: waveEntryOf(waves, run.wave).data.id,
    wave: run.wave,
    firstWave: run.firstWave,
    speed: run.speed,
    seed: run.seed,
    banked: run.banked,
    score: run.score,
    flying: run.crew.flying,
    home: run.crew.home,
    lastGiven: run.crew.lastGiven,
    nextShipAt: run.nextShipAt,
    straysBanked: run.straysBanked,
    strays: run.strays,
    broughtHome,
    tuned,
    field,
  };
}

/** Returns whether a value is a wave's number, from 1. */
function isWaveNumber(value: unknown): value is number {
  return isCount(value) && value >= 1;
}

/** Returns whether a value is a list of pilots, each named by its color's number. */
function isPilots(value: unknown): value is Pilot[] {
  return Array.isArray(value) && value.every(isPilot);
}

/** Returns whether a value names a pilot, by its color's number. */
function isPilot(value: unknown): value is Pilot {
  return isWhole(value) && value >= 0 && value < PILOT_COLORS;
}
