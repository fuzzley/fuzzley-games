import { isRecord, isWhole } from "@fz/core/json";
import { type Brick, isNeeded } from "./bricks";
import type { Field } from "./field";
import { CELLS } from "./grid";
import { type LevelEntry, parseLevel } from "./levels";
import { type Run, startLevel } from "./run";
import { isSpeed } from "./speed";
import { FIRST_LIFE_POINTS, MAX_LIVES } from "./tuning";

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
  readonly speed: string;
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
 * have under that number, a field that doesn't fit the level, or a number
 * out of its range.
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
    !isWhole(level) ||
    !isWhole(firstLevel) ||
    !isSpeed(speed) ||
    !isWhole(seed) ||
    !isCount(banked) ||
    !isWhole(score) ||
    !isWhole(lives) ||
    !isWhole(nextLifeAt) ||
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
    nextLifeAt <= score ||
    nextLifeAt < FIRST_LIFE_POINTS
  ) {
    return null;
  }
  const field = restoredField(value["field"], entry, score - banked);
  if (field === undefined) return null;
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
  for (const brick of field.bricks) {
    const kept = brick && saved.bricks[brick.cell];
    if (brick && kept) takeUpBrick(brick, kept);
  }
  field.needed = field.bricks.filter(
    (brick) => brick && isNeeded(brick) && !brick.broken,
  ).length;
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
 * Returns a level's field as storage kept it: null for a level not yet
 * begun, or undefined if it doesn't fit the level or a number is out of its
 * range.
 */
function restoredField(
  value: unknown,
  entry: LevelEntry,
  levelScore: number,
): SavedField | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
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
    return undefined;
  }
  const kept = value["bricks"];
  const cells = parseLevel(entry).cells;
  if (!Array.isArray(kept) || kept.length !== CELLS) return undefined;
  const bricks: (SavedBrick | null)[] = [];
  for (const [cell, placed] of cells.entries()) {
    const brick: unknown = kept[cell];
    if (!placed) {
      if (brick !== null) return undefined;
      bricks.push(null);
      continue;
    }
    const restored = restoredBrick(brick, placed.hits);
    if (!restored) return undefined;
    bricks.push(restored);
  }
  return { bricks, streakPoints, climbed, steps, draws };
}

/** Returns a brick as storage kept it, or null if a number is out of its range. */
function restoredBrick(value: unknown, whole: number): SavedBrick | null {
  if (!isRecord(value)) return null;
  const { hits, broken, shown, goesOffAt, regrowsAt } = value;
  if (
    !isCount(hits) ||
    hits > whole ||
    typeof broken !== "boolean" ||
    typeof shown !== "boolean" ||
    !isCount(goesOffAt) ||
    !isCount(regrowsAt)
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

/** Returns whether a value is a whole number not below nothing. */
function isCount(value: unknown): value is number {
  return isWhole(value) && value >= 0;
}
