import { isCount, isRecord, isWhole } from "@fz/core/json";
import { pick } from "@fz/core/records";
import {
  type RockKindId,
  type RockTrait,
  isRockKindId,
  isRockSize,
  rockKind,
} from "../catalog/rocks";
import { type Field, type PlayerSetup, fieldFor } from "../field/field";
import { fillFor, stretchField } from "../field/fill";
import { safestPlace } from "../field/spawn";
import { nextStrayAfter } from "../hazards/hazards";
import { ROCK_OUTLINES, type Rock, isFree } from "../rocks/rocks";
import { PILOT_COLORS, type Pilot } from "../ship/pilots";
import { createShip } from "../ship/ship";
import { type Speed, isSpeed } from "../speed";
import { stepsIn } from "../stepper";
import type { Torus } from "../torus";
import {
  FIELD_LONGEST_SIDE,
  FIELD_SHORT_SIDE,
  MAX_SHIPS,
  STRAY_POINTS,
} from "../tuning";
import { waveToPlay } from "../waves/endless";
import { type Wave, type WaveEntry, waveEntryOf } from "../waves/waves";
import {
  type Run,
  isInProgress,
  nextShipAfter,
  startWave,
  waveStart,
} from "./run";

/**
 * What of a rock storage keeps: what it is, where it is, how it flies and
 * turns, how it is drawn, the hits it has left, and whether it is whole or
 * broken and waiting to go off, and when.
 */
const KEPT_OF_ROCK = [
  "kind",
  "size",
  "x",
  "y",
  "vx",
  "vy",
  "angle",
  "spin",
  "outline",
  "hits",
  "live",
  "goesOffAt",
] as const satisfies readonly (keyof Rock)[];

/** A rock as storage keeps it: whole, or broken and waiting to go off. */
export type SavedRock = Readonly<Pick<Rock, (typeof KEPT_OF_ROCK)[number]>>;

/**
 * The wave in play's field as storage keeps it: the size it was laid out
 * at and its size now, its rocks, and the counts its draws, strays, comets
 * and points run by.
 *
 * A stray adrift, the comets on their way, the pickups, the shots, the
 * effects in play and the chain go.
 */
export interface SavedField {
  /** The size it was laid out at, which set its slots, its strays, the pickups it floats at once and its comets' times. */
  readonly laidOut: Torus;
  /** Its size now, which a pause may have stretched it to since. */
  readonly torus: Torus;
  /** Each rock whole, and each broken and waiting to go off, for its blast. */
  readonly rocks: readonly SavedRock[];
  readonly steps: number;
  readonly draws: number;
  /** How many strays the wave has sent. */
  readonly straysSent: number;
  /** The step the next stray comes at. */
  readonly nextStrayAt: number;
  /** The step the next comet's warning starts at. */
  readonly nextCometAt: number;
  /** The step a pickup was last let go at, from which a drought is counted. */
  readonly lastDropAt: number;
  /** What the chain's multiplier has added to the wave's points, for its tally. */
  readonly chainPoints: number;
  /** How many ships the wave has lost, which a clean wave has none of. */
  readonly shipsLost: number;
}

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
  /** The wave's field, or null for a wave not yet begun or not yet moved, which is laid out afresh. */
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

/** What of a field storage keeps. */
export type SavableField = Pick<
  Field,
  | "setup"
  | "torus"
  | "rocks"
  | "steps"
  | "draws"
  | "strays"
  | "comets"
  | "lastDropAt"
  | "chainPoints"
  | "shipsLost"
>;

/** What of the run the shell keeps beside it. */
export interface RunKeeping {
  /** Each stray brought home, in the order they came. */
  readonly broughtHome: readonly Pilot[];
  /** Whether the run was flown on numbers the debug menu tuned. */
  readonly tuned: boolean;
}

/** What a field kept must agree with of its run: the wave's points and the strays it has brought home. */
interface WaveSoFar {
  readonly points: number;
  readonly straysHome: number;
}

/**
 * Returns a run under way and its field as storage keeps them, or null for
 * a run with nothing to keep: one waiting for its first move, or one that
 * has ended.
 *
 * A run whose wave was just cleared is kept at the start of the next, so
 * the page going away over the Cleared card loses nothing, and a wave not
 * yet moved as one not yet begun, so it is laid out afresh on the room it
 * comes back to, as a wave waiting for its first move is.
 */
export function saveGame(
  run: Run,
  field: SavableField,
  waves: readonly WaveEntry[],
  keeping: RunKeeping,
): SavedGame | null {
  if (!isInProgress(run)) return null;
  if (run.outcome === "cleared") {
    return savedRun(startWave(run), null, waves, keeping);
  }
  const kept = field.steps === 0 ? null : savedField(field);
  return savedRun(run, kept, waves, keeping);
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
  const { waveId, wave, firstWave, speed, seed, banked, score } = value;
  const { straysBanked, strays, lastGiven, tuned } = value;
  if (
    !isCount(wave) ||
    wave < 1 ||
    !isCount(firstWave) ||
    !isSpeed(speed) ||
    !isWhole(seed) ||
    !isCount(banked) ||
    !isCount(score) ||
    !isCount(straysBanked) ||
    !isCount(strays) ||
    !isPilot(lastGiven) ||
    typeof tuned !== "boolean"
  ) {
    return null;
  }
  const entry = waveEntryOf(waves, wave);
  const flying = pilotsOf(value["flying"]);
  const home = pilotsOf(value["home"]);
  if (
    entry.data.id !== waveId ||
    firstWave < 1 ||
    firstWave > wave ||
    score < banked ||
    strays < straysBanked ||
    value["nextShipAt"] !== nextShipAfter(score) ||
    !flying ||
    flying.length === 0 ||
    flying.length > MAX_SHIPS ||
    !home ||
    home.length > strays
  ) {
    return null;
  }
  const run: Run = {
    id,
    seed,
    speed,
    firstWave,
    wave,
    banked,
    score,
    crew: { flying, home, lastGiven },
    nextShipAt: nextShipAfter(score),
    straysBanked,
    strays,
    outcome: "paused",
  };
  const kept = value["field"];
  const soFar = { points: score - banked, straysHome: strays - straysBanked };
  let field: SavedField | null = null;
  if (kept !== null) {
    field = restoredField(kept, waveToPlay(entry, seed), soFar);
    if (!field) return null;
  } else if (soFar.points > 0 || soFar.straysHome > 0) {
    // A wave kept as not yet begun has scored nothing yet.
    return null;
  }
  const broughtHome = pilotsOf(value["broughtHome"]);
  return {
    run,
    field,
    broughtHome: broughtHome?.length === strays ? broughtHome : [],
    tuned,
  };
}

/**
 * Returns the wave in play's field as storage kept it, laid out afresh at
 * the size it was laid out at, so its slots, strays and comets are as they
 * were, and stretched to the size it was kept at: its rocks in its first
 * slots, the rest free, the counts its draws, strays, comets and points
 * run by, its points from the run, and its ship waiting where it is
 * safest, as the next in line would.
 */
export function takeUpField(
  wave: Wave,
  setup: PlayerSetup,
  saved: SavedField,
  run: Run,
): Field {
  const field = fieldFor(wave, {
    ...waveStart(run),
    ...setup,
    torus: saved.laidOut,
    speed: run.speed,
  });
  stretchField(field, saved.torus);
  for (const [slot, rock] of field.rocks.entries()) {
    const kept = saved.rocks[slot];
    if (!kept) {
      rock.live = false;
      continue;
    }
    Object.assign(rock, kept);
    rock.lastX = kept.x;
    rock.lastY = kept.y;
  }
  field.steps = saved.steps;
  field.draws = saved.draws;
  field.strays.sent = saved.straysSent;
  field.strays.nextAt = saved.nextStrayAt;
  field.strays.broughtHome = run.strays - run.straysBanked;
  field.comets.nextAt = saved.nextCometAt;
  field.lastDropAt = saved.lastDropAt;
  field.score = run.score - run.banked;
  field.chainPoints = saved.chainPoints;
  field.shipsLost = saved.shipsLost;
  const { x, y } = safestPlace(field);
  field.ship = createShip(x, y, field.steer);
  return field;
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

/**
 * Returns what storage keeps of a field, a stray adrift counted as gone, so
 * the next comes as long after this step as it would after one gone.
 */
function savedField(field: SavableField): SavedField {
  const { strays } = field;
  return {
    laidOut: sizeOf(field.setup.torus),
    torus: sizeOf(field.torus),
    rocks: field.rocks
      .filter((rock) => !isFree(rock))
      .map((rock) => pick(rock, KEPT_OF_ROCK)),
    steps: field.steps,
    draws: field.draws,
    straysSent: strays.sent,
    nextStrayAt: strays.adrift.live
      ? nextStrayAfter(field.steps)
      : strays.nextAt,
    nextCometAt: field.comets.nextAt,
    lastDropAt: field.lastDropAt,
    chainPoints: field.chainPoints,
    shipsLost: field.shipsLost,
  };
}

/** Returns a copy of a field's size. */
function sizeOf({ width, height }: Torus): Torus {
  return { width, height };
}

/**
 * Returns a wave's field as storage kept it, or null if it can't be
 * trusted: one not yet moved, which is kept as none, a size no board lays
 * a field out at, more rocks than the wave holds at the size it was laid
 * out at or none, a rock off the field or in a state its kind never comes
 * to, more strays home than the wave has sent or more sent than it sends,
 * fewer points than the chain and the strays home have scored, or a count
 * out of its range.
 */
function restoredField(
  value: unknown,
  wave: Wave,
  { points, straysHome }: WaveSoFar,
): SavedField | null {
  if (!isRecord(value)) return null;
  const { steps, draws, straysSent, nextStrayAt, nextCometAt } = value;
  const { lastDropAt, chainPoints, shipsLost } = value;
  const laidOut = torusOf(value["laidOut"]);
  const torus = torusOf(value["torus"]);
  if (
    !laidOut ||
    !torus ||
    !isCount(steps) ||
    steps === 0 ||
    !isCount(draws) ||
    !isCount(straysSent) ||
    straysSent < straysHome ||
    !isCount(nextStrayAt) ||
    !isCount(nextCometAt) ||
    !isCount(lastDropAt) ||
    lastDropAt > steps ||
    !isCount(chainPoints) ||
    chainPoints + straysHome * STRAY_POINTS > points ||
    !isCount(shipsLost)
  ) {
    return null;
  }
  const fill = fillFor(wave, laidOut);
  const kept = value["rocks"];
  if (straysSent > fill.strays || !Array.isArray(kept)) return null;
  if (kept.length === 0 || kept.length > fill.cap) return null;
  const rocks: SavedRock[] = [];
  for (const rock of kept) {
    const restored = restoredRock(rock, torus, steps);
    if (!restored) return null;
    rocks.push(restored);
  }
  return {
    laidOut,
    torus,
    rocks,
    steps,
    draws,
    straysSent,
    nextStrayAt,
    nextCometAt,
    lastDropAt,
    chainPoints,
    shipsLost,
  };
}

/**
 * Returns a rock as storage kept it, or null if it lies off the field, a
 * number isn't one, or it is in a state its kind never comes to: a size it
 * doesn't come in, an outline it hasn't, more hits left than it starts
 * with, or, whole, none, or, broken, a blast its kind doesn't set off or
 * one not due within its beat of the field's last step.
 */
function restoredRock(
  value: unknown,
  torus: Torus,
  steps: number,
): SavedRock | null {
  if (!isRecord(value)) return null;
  const { kind, size, x, y, vx, vy, angle, spin, outline, hits } = value;
  const { live, goesOffAt } = value;
  if (
    !isRockKindId(kind) ||
    !isRockSize(size) ||
    !isWithin(x, torus.width) ||
    !isWithin(y, torus.height) ||
    !isFiniteNumber(vx) ||
    !isFiniteNumber(vy) ||
    !isFiniteNumber(angle) ||
    !isFiniteNumber(spin) ||
    !isWhole(outline) ||
    outline < 0 ||
    outline >= ROCK_OUTLINES ||
    !isCount(hits) ||
    typeof live !== "boolean" ||
    !isCount(goesOffAt)
  ) {
    return null;
  }
  const most = rockKind(kind).hits[size];
  if (most === undefined || hits > most) return null;
  const sound = live
    ? hits > 0 && goesOffAt === 0
    : hits === 0 && isFuseLit(kind, goesOffAt, steps);
  if (!sound) return null;
  return {
    kind,
    size,
    x,
    y,
    vx,
    vy,
    angle,
    spin,
    outline,
    hits,
    live,
    goesOffAt,
  };
}

/** Returns whether a broken rock's blast is still to go off, after a field's last step, within its kind's beat of it. */
function isFuseLit(
  kind: RockKindId,
  goesOffAt: number,
  steps: number,
): boolean {
  const blast = rockKind(kind).traits.find(isBlast);
  return (
    blast !== undefined &&
    goesOffAt > steps &&
    goesOffAt <= steps + stepsIn(blast.delayMs)
  );
}

/** Returns whether a trait is a blast's. */
function isBlast(
  trait: RockTrait,
): trait is Extract<RockTrait, { kind: "blasts" }> {
  return trait.kind === "blasts";
}

/** Returns a field's size as storage kept it, or null for one no board lays a field out at. */
function torusOf(value: unknown): Torus | null {
  if (!isRecord(value)) return null;
  const { width, height } = value;
  if (!isFiniteNumber(width) || !isFiniteNumber(height)) return null;
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (short !== FIELD_SHORT_SIDE || long > FIELD_LONGEST_SIDE) return null;
  return { width, height };
}

/** Returns a list of pilots as storage kept it, or null if it isn't one. */
function pilotsOf(value: unknown): Pilot[] | null {
  if (!Array.isArray(value)) return null;
  const pilots: Pilot[] = [];
  for (const pilot of value) {
    if (!isPilot(pilot)) return null;
    pilots.push(pilot);
  }
  return pilots;
}

/** Returns whether a value names a pilot, by its color's number. */
function isPilot(value: unknown): value is Pilot {
  return isWhole(value) && value >= 0 && value < PILOT_COLORS;
}

/** Returns whether a value is a number JSON can hold: neither infinite nor not a number. */
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Returns whether a value is a place along an axis of a length, from 0 to under it. */
function isWithin(value: unknown, length: number): value is number {
  return isFiniteNumber(value) && value >= 0 && value < length;
}
