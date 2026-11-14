import { isCount, isFiniteNumber, isRecord, isWhole } from "@fz/core/json";
import { pick } from "@fz/core/records";
import { type Brick, neededLeft, unbrokenKeys } from "../bricks/bricks";
import { placeBricks } from "../bricks/sliders";
import { hasTrait, isNeeded } from "../catalog/bricks";
import type { Field } from "../field/field";
import { multiplier } from "../field/scoring";
import { CELLS, rowOf } from "../grid";
import type { LevelBrick } from "../levels/level";
import { type LevelEntry, parseLevel } from "../levels/levels";
import { type Speed, isSpeed } from "../speed";
import { MAX_LIVES } from "../tuning";
import { type Run, isInProgress, nextLifeAfter, startLevel } from "./run";

/** What of a brick play changes, and so what storage keeps of it. */
const KEPT_OF_BRICK = [
  "hits",
  "broken",
  "shown",
  "goesOffAt",
  "regrowsAt",
  "cell",
  "heading",
] as const satisfies readonly (keyof Brick)[];

/** A brick of the level in play as storage keeps it: what play has changed of it. */
export type SavedBrick = Readonly<Pick<Brick, (typeof KEPT_OF_BRICK)[number]>>;

/** The level in play's field as storage keeps it: its bricks, and the counts its timers and points run by. */
export interface SavedField {
  /** A brick for each cell of the grid, null where the level has none, each at its home. */
  readonly bricks: readonly (SavedBrick | null)[];
  readonly streakPoints: number;
  readonly darePoints: number;
  readonly climbed: number;
  readonly steps: number;
  readonly draws: number;
  /** The balls that have left the paddle since a brick the level needs broke, toward lending the seeker. */
  readonly dryBounces: number;
  /** The longest streak of the level's play, toward the level's third star. */
  readonly bestStreak: number;
}

/** The version of `SavedGame`, which the shell keeps a run under; the shell's reader drops any other. */
export const SAVED_GAME_VERSION = 2;

/** A run under way as storage keeps it. */
export interface SavedGame {
  /** The id of the level in play, which must still be the level of its number. */
  readonly levelId: string;
  readonly level: number;
  readonly firstLevel: number;
  readonly speed: Speed;
  readonly seed: number;
  readonly banked: number;
  readonly score: number;
  readonly lives: number;
  readonly nextLifeAt: number;
  readonly levelGained: number;
  readonly levelLost: number;
  /** The level's field, or null for a level not yet begun, its bricks as the level lays them. */
  readonly field: SavedField | null;
}

/** A run storage kept, taken up: the run, paused, and its level's field as kept. */
export interface TakenUp {
  readonly run: Run;
  readonly field: SavedField | null;
}

/** What of a field storage keeps. */
export type SavableField = Pick<
  Field,
  | "bricks"
  | "streakPoints"
  | "darePoints"
  | "climbed"
  | "steps"
  | "draws"
  | "dryBounces"
  | "bestStreak"
>;

/**
 * Returns a run under way and its field as storage keeps them, or null for
 * a run with nothing to keep: one waiting for its first serve, or one that
 * has ended.
 *
 * A run whose level was just cleared is kept at the start of the next, so
 * the page going away over the Cleared card loses nothing.
 */
export function saveGame(
  run: Run,
  field: SavableField,
  levels: readonly LevelEntry[],
): SavedGame | null {
  if (!isInProgress(run)) return null;
  if (run.outcome === "cleared") return savedRun(startLevel(run), null, levels);
  return savedRun(run, savedField(field), levels);
}

/**
 * Returns the run storage kept, paused, under a new id, with its level's
 * field as kept, or null if it can't be trusted: a level the game doesn't
 * have under that number, a field that doesn't fit the level, a number out
 * of its range, or a state no run comes to.
 */
export function restoreGame(
  value: unknown,
  levels: readonly LevelEntry[],
  id: number,
): TakenUp | null {
  if (!isRecord(value)) return null;
  const { levelId, level, firstLevel, speed, seed, banked, score, lives } =
    value;
  const { nextLifeAt, levelGained, levelLost } = value;
  if (
    !isCount(level) ||
    !isCount(firstLevel) ||
    !isSpeed(speed) ||
    !isWhole(seed) ||
    !isCount(banked) ||
    !isCount(score) ||
    !isCount(lives) ||
    !isCount(nextLifeAt) ||
    !isCount(levelGained) ||
    !isCount(levelLost)
  ) {
    return null;
  }
  const entry = levels[level - 1];
  if (
    !entry ||
    entry.data.id !== levelId ||
    firstLevel < 1 ||
    firstLevel > level ||
    score < banked ||
    lives < 1 ||
    lives > MAX_LIVES ||
    nextLifeAt !== nextLifeAfter(score)
  ) {
    return null;
  }
  const kept = value["field"];
  let field: SavedField | null = null;
  if (kept !== null) {
    field = restoredField(kept, entry, score - banked);
    if (!field) return null;
  } else if (score > banked || levelGained > 0 || levelLost > 0) {
    // A level kept as not yet begun has nothing on it yet.
    return null;
  }
  return {
    run: {
      id,
      seed,
      speed,
      lastLevel: levels.length,
      firstLevel,
      level,
      banked,
      score,
      lives,
      nextLifeAt,
      levelGained,
      levelLost,
      outcome: "paused",
    },
    field,
  };
}

/**
 * Lays what storage kept of a level's field over a new field of the level:
 * its points and lives from the run, and its bricks and counts as kept.
 */
export function takeUpField(
  field: Field,
  saved: SavedField | null,
  run: Run,
): void {
  field.score = run.score - run.banked;
  field.livesGained = run.levelGained;
  field.livesLost = run.levelLost;
  if (!saved) return;
  for (const [cell, brick] of field.bricks.entries()) {
    const kept = saved.bricks[cell];
    if (brick && kept) Object.assign(brick, kept);
  }
  placeBricks(field);
  field.needed = neededLeft(field.bricks);
  field.keysLeft = unbrokenKeys(field.bricks);
  field.streakPoints = saved.streakPoints;
  field.darePoints = saved.darePoints;
  field.climbed = saved.climbed;
  field.steps = saved.steps;
  field.draws = saved.draws;
  field.dryBounces = saved.dryBounces;
  field.bestStreak = saved.bestStreak;
}

/** Returns a run and its field as storage keeps them, naming its level by its id. */
function savedRun(
  run: Run,
  field: SavedField | null,
  levels: readonly LevelEntry[],
): SavedGame | null {
  const entry = levels[run.level - 1];
  if (!entry) return null;
  return {
    levelId: entry.data.id,
    level: run.level,
    firstLevel: run.firstLevel,
    speed: run.speed,
    seed: run.seed,
    banked: run.banked,
    score: run.score,
    lives: run.lives,
    nextLifeAt: run.nextLifeAt,
    levelGained: run.levelGained,
    levelLost: run.levelLost,
    field,
  };
}

/** Returns what storage keeps of a field. */
function savedField(field: SavableField): SavedField {
  return {
    bricks: byHome(field.bricks).map((brick) =>
      brick ? pick(brick, KEPT_OF_BRICK) : null,
    ),
    streakPoints: field.streakPoints,
    darePoints: field.darePoints,
    climbed: field.climbed,
    steps: field.steps,
    draws: field.draws,
    dryBounces: field.dryBounces,
    bestStreak: field.bestStreak,
  };
}

/**
 * Returns a level's field as storage kept it, or null if it can't be
 * trusted: it doesn't fit the level, a number is out of its range, its
 * streak points came with no streak long enough to multiply, the level
 * needs nothing more, its gates stand otherwise than its keys say, or two
 * of its bricks stand in one cell.
 */
function restoredField(
  value: unknown,
  entry: LevelEntry,
  levelScore: number,
): SavedField | null {
  if (!isRecord(value)) return null;
  const { streakPoints, darePoints, climbed, steps, draws, dryBounces } = value;
  const { bestStreak } = value;
  if (
    !isCount(streakPoints) ||
    !isCount(darePoints) ||
    streakPoints + darePoints > levelScore ||
    !isFiniteNumber(climbed) ||
    climbed < 0 ||
    !isCount(steps) ||
    !isCount(draws) ||
    !isCount(dryBounces) ||
    !isCount(bestStreak) ||
    (streakPoints > 0 && multiplier(bestStreak) === 1)
  ) {
    return null;
  }
  const kept = value["bricks"];
  const cells = parseLevel(entry).cells;
  if (!Array.isArray(kept) || kept.length !== CELLS) return null;
  const bricks: (SavedBrick | null)[] = [];
  let needsMore = false;
  for (const [cell, placed] of cells.entries()) {
    const brick: unknown = kept[cell];
    if (!placed) {
      if (brick !== null) return null;
      bricks.push(null);
      continue;
    }
    const restored = restoredBrick(brick, placed, cell);
    if (!restored) return null;
    bricks.push(restored);
    if (isNeeded(placed.kind) && !restored.broken) needsMore = true;
  }
  if (!needsMore || !gatesAsKeysSay(cells, bricks) || !standApart(bricks)) {
    return null;
  }
  return {
    bricks,
    streakPoints,
    darePoints,
    climbed,
    steps,
    draws,
    dryBounces,
    bestStreak,
  };
}

/**
 * Returns a brick as storage kept it, or null if a number is out of its
 * range or it is in a state its kind never comes to: broken with hits left
 * or whole without, but a gate, either way, hidden once hit, with a fuse
 * or a regrowth its kind doesn't have, or at a place it never comes to
 * ({@link restoredPlace}).
 */
function restoredBrick(
  value: unknown,
  placed: LevelBrick,
  home: number,
): SavedBrick | null {
  if (!isRecord(value)) return null;
  const { hits, broken, shown, goesOffAt, regrowsAt } = value;
  if (
    !isCount(hits) ||
    hits > placed.hits ||
    typeof broken !== "boolean" ||
    typeof shown !== "boolean" ||
    !isCount(goesOffAt) ||
    !isCount(regrowsAt)
  ) {
    return null;
  }
  const { kind } = placed;
  if (
    !brokenAsItComes(placed, hits, broken) ||
    (!shown && (!hasTrait(kind, "hidden") || hits < placed.hits)) ||
    (goesOffAt > 0 && (!hasTrait(kind, "blasts") || !broken)) ||
    (regrowsAt > 0 && !hasTrait(kind, "regrows"))
  ) {
    return null;
  }
  const place = restoredPlace(value, placed, home, broken);
  if (!place) return null;
  return { hits, broken, shown, goesOffAt, regrowsAt, ...place };
}

/**
 * Returns where a brick kept stands and the way it heads, or null for a
 * place it never comes to: out of the row the level drew it in, away from
 * home whole when it neither slides nor grows back where a train left it,
 * or heading as its kind doesn't.
 */
function restoredPlace(
  value: Readonly<Record<string, unknown>>,
  placed: LevelBrick,
  home: number,
  broken: boolean,
): Pick<SavedBrick, "cell" | "heading"> | null {
  const { cell, heading } = value;
  if (!isCount(cell) || rowOf(cell) !== rowOf(home) || !isWhole(heading)) {
    return null;
  }
  const { kind } = placed;
  const slides = hasTrait(kind, "slides");
  if (
    (slides ? Math.abs(heading) !== 1 : heading !== 0) ||
    (cell !== home && !broken && !slides && !hasTrait(kind, "regrows"))
  ) {
    return null;
  }
  return { cell, heading };
}

/** Returns a field's bricks each at its home, the cell the level drew it in. */
function byHome(bricks: readonly (Brick | null)[]): (Brick | null)[] {
  const homes: (Brick | null)[] = Array.from({ length: CELLS }, () => null);
  for (const brick of bricks) if (brick) homes[brick.home] = brick;
  return homes;
}

/** Returns whether no two bricks kept stand in one cell. */
function standApart(bricks: readonly (SavedBrick | null)[]): boolean {
  const taken = new Set<number>();
  for (const brick of bricks) {
    if (!brick) continue;
    if (taken.has(brick.cell)) return false;
    taken.add(brick.cell);
  }
  return true;
}

/**
 * Returns whether a brick kept is broken as its kind comes to: one that
 * breaks once it has no hits left, and a gate either way, which
 * {@link gatesAsKeysSay} checks against the keys.
 */
function brokenAsItComes(
  placed: LevelBrick,
  hits: number,
  broken: boolean,
): boolean {
  if (hasTrait(placed.kind, "locked")) return true;
  return broken === (placed.hits > 0 && hits === 0);
}

/**
 * Returns whether a level's gates stand as its keys say, as kept: every one
 * open once the level has broken all its keys, and shut while one is left.
 */
function gatesAsKeysSay(
  cells: readonly (LevelBrick | null)[],
  bricks: readonly (SavedBrick | null)[],
): boolean {
  let keys = 0;
  let left = 0;
  for (const [cell, placed] of cells.entries()) {
    if (!placed || !hasTrait(placed.kind, "unlocks")) continue;
    keys++;
    if (!bricks[cell]?.broken) left++;
  }
  const open = keys > 0 && left === 0;
  return cells.every(
    (placed, cell) =>
      !placed ||
      !hasTrait(placed.kind, "locked") ||
      bricks[cell]?.broken === open,
  );
}
