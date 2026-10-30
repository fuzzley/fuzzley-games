import { type Brick, hitBrick } from "../rules/bricks";
import { createField } from "../rules/field";
import { cellIndex, inGrid } from "../rules/grid";
import { type LevelEntry, parseLevel } from "../rules/levels";
import { catchUp, createRun, levelSeed, startLevel } from "../rules/run";
import { type SavedGame, saveGame } from "../rules/saved_game";
import type { Speed } from "../rules/speed";
import { stepsIn } from "../rules/stepper";

/**
 * A brick's place in a level's grid, from 0: its row first, as a level's
 * picture reads, then its column.
 */
export type Place = readonly [row: number, column: number];

/** Describes a run begun at a level and played part way into it. */
export interface KeptRun {
  /** The level it began at, by its number. */
  readonly level: number;
  readonly speed: Speed;
  readonly seed: number;
  /** How long the level has been played, in milliseconds. */
  readonly playedMs: number;
  /** The bricks broken. */
  readonly broken: readonly Place[];
  /** The bricks hit once without breaking. */
  readonly worn: readonly Place[];
}

/**
 * Returns a run as storage keeps it, for a page to take up: begun at a
 * level, with the bricks it names broken or hit once through the rules.
 *
 * The bricks and the points are as a ball would have left them, but the
 * balls' climb and the capsules' draws are as at the serve, since the
 * bricks are hit with no ball in play. It throws for a level the game
 * doesn't have or a place with no brick.
 */
export function keptRun(
  levels: readonly LevelEntry[],
  kept: KeptRun,
): SavedGame {
  const entry = levels[kept.level - 1];
  if (!entry) throw new Error(`There is no level ${String(kept.level)}.`);
  const run = startLevel(
    createRun({
      id: 1,
      seed: kept.seed,
      speed: kept.speed,
      lastLevel: levels.length,
      level: kept.level,
    }),
  );
  const field = createField(parseLevel(entry), {
    speed: run.speed,
    seed: levelSeed(run),
  });
  field.steps = stepsIn(kept.playedMs);
  const brickAt = ([row, column]: Place): Brick => {
    const brick = inGrid(column, row)
      ? field.bricks[cellIndex(column, row)]
      : undefined;
    if (!brick) {
      throw new Error(
        `Level ${String(kept.level)} has no brick at row ${String(row)}, column ${String(column)}.`,
      );
    }
    return brick;
  };
  for (const place of kept.broken) {
    hitBrick(field, brickAt(place), 0, 0, "breaks");
  }
  for (const place of kept.worn) hitBrick(field, brickAt(place), 0, 0);
  const saved = saveGame(catchUp(run, field), field, levels);
  if (!saved) throw new Error("The run has nothing to keep.");
  return saved;
}
