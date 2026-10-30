import { isRecord, isWhole } from "@fz/core/json";
import { type Brick, neededLeft } from "./bricks";
import { brickKind, hasTrait } from "./catalog/bricks";
import type { Field } from "./field";
import { CELLS } from "./grid";
import type { LevelBrick } from "./level";
import { type LevelEntry, parseLevel } from "./levels";
import { type Run, nextLifeAfter, startLevel } from "./run";
import { type Speed, isSpeed } from "./speed";
import { MAX_LIVES } from "./tuning";

/** A brick of the level in play as storage keeps it: what play has changed of it. */
export interface SavedBrick {
  readonly hits: number;
  readonly broken: boolean;
  readonly shown: boolean;
  readonly goesOffAt: number;
  readonly regrowsAt: number;
}

/** The level in play's field as storage keeps it: its bricks, and the counts its timers and points run by. */
export interface SavedField {
  /** A brick for each cell of the grid, null where the level has none. */
  readonly bricks: readonly (SavedBrick | null)[];
  readonly streakPoints: number;
  readonly climbed: number;
  readonly steps: number;
  readonly draws: number;
}

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
  "bricks" | "streakPoints" | "climbed" | "steps" | "draws"
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
  if (run.outcome === "cleared") return savedRun(startLevel(run), null, levels);
  if (run.outcome !== "playing" && run.outcome !== "paused") return null;
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
  const begun = score > banked || levelGained > 0 || levelLost > 0;
  const restored = restoredField(value["field"], entry, score - banked, begun);
  if (!restored) return null;
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
    field: restored.field,
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
    if (brick && kept) takeUpBrick(brick, kept);
  }
  field.needed = neededLeft(field.bricks);
  field.streakPoints = saved.streakPoints;
  field.climbed = saved.climbed;
  field.steps = saved.steps;
  field.draws = saved.draws;
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
    bricks: field.bricks.map((brick) =>
      brick
        ? {
            hits: brick.hits,
            broken: brick.broken,
            shown: brick.shown,
            goesOffAt: brick.goesOffAt,
            regrowsAt: brick.regrowsAt,
          }
        : null,
    ),
    streakPoints: field.streakPoints,
    climbed: field.climbed,
    steps: field.steps,
    draws: field.draws,
  };
}

/**
 * Returns a level's field as storage kept it, as `field`, null for a level
 * not yet begun, or returns null if it can't be trusted: it doesn't fit the
 * level, a number is out of its range, the level needs nothing more, or a
 * level with points or lives on it is kept as not begun.
 */
function restoredField(
  value: unknown,
  entry: LevelEntry,
  levelScore: number,
  begun: boolean,
): { readonly field: SavedField | null } | null {
  if (value === null) return begun ? null : { field: null };
  if (!isRecord(value)) return null;
  const { streakPoints, climbed, steps, draws } = value;
  if (
    !isCount(streakPoints) ||
    streakPoints > levelScore ||
    typeof climbed !== "number" ||
    !Number.isFinite(climbed) ||
    climbed < 0 ||
    !isCount(steps) ||
    !isCount(draws)
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
    const restored = restoredBrick(brick, placed);
    if (!restored) return null;
    bricks.push(restored);
    if (brickKind(placed.kind).needed && !restored.broken) needsMore = true;
  }
  if (!needsMore) return null;
  return { field: { bricks, streakPoints, climbed, steps, draws } };
}

/**
 * Returns a brick as storage kept it, or null if a number is out of its
 * range or it is in a state its kind never comes to: broken with hits left
 * or whole without, hidden once hit, or with a fuse or a regrowth its kind
 * doesn't have.
 */
function restoredBrick(value: unknown, placed: LevelBrick): SavedBrick | null {
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
    broken !== (placed.hits > 0 && hits === 0) ||
    (!shown && (!hasTrait(kind, "hidden") || hits < placed.hits)) ||
    (goesOffAt > 0 && (!hasTrait(kind, "blasts") || !broken)) ||
    (regrowsAt > 0 && !hasTrait(kind, "regrows"))
  ) {
    return null;
  }
  return { hits, broken, shown, goesOffAt, regrowsAt };
}

/** Lays a brick's kept state over it. */
function takeUpBrick(brick: Brick, kept: SavedBrick): void {
  brick.hits = kept.hits;
  brick.broken = kept.broken;
  brick.shown = kept.shown;
  brick.goesOffAt = kept.goesOffAt;
  brick.regrowsAt = kept.regrowsAt;
}

/**
 * Returns whether a value is a whole number not below nothing, and small
 * enough that adding one to it still counts.
 */
function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
