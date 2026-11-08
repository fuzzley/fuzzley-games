import { basename, dirname } from "node:path";
import { LEVELS } from "../rules/levels/levels";
import { PRESET_SPEEDS, type Speed } from "../rules/speed";
import { TALLEST_FIELD } from "../rules/tuning";
import {
  AUTOPILOT_LIMIT,
  ENDGAME_LIMIT,
  limitsOf,
  playLevel,
} from "./autopilot";

/** The folder that keeps a spec of every level for each preset speed. */
const FOLDER = "every_level";

/**
 * Returns the preset speed a spec file of every level is named for, so a
 * file can only play the speed its name says.
 *
 * @throws {Error} When the file is named for no preset speed, or lies
 *   outside the folder.
 */
function speedOfSpec(file: string): Speed {
  const name = basename(file, ".spec.ts");
  const speed = PRESET_SPEEDS.find((preset) => preset === name);
  if (basename(dirname(file)) !== FOLDER || speed === undefined) {
    throw new Error(`${file} is no preset speed's spec in ${FOLDER}/.`);
  }
  return speed;
}

/**
 * Holds every level, played at the preset speed its spec file is named for,
 * to being cleared by the autopilot within eight minutes of game time, its
 * last bricks within one, and on the tallest field within those eight
 * minutes stretched as its ball's trips are.
 *
 * Each preset speed's spec in `src/rules/levels/every_level/` calls it with
 * its own file (`import.meta.filename`), so Vitest plays the speeds side by
 * side and a file plays no speed but its own.
 */
export function holdEveryLevel(specFile: string): void {
  const speed = speedOfSpec(specFile);
  describe("every level", () => {
    const plays = LEVELS.map((entry) => [entry.data.name, entry] as const);

    it.each(plays)(
      `is cleared, %s at ${speed}, within eight minutes of game time, its last bricks within one`,
      (_, entry) => {
        const report = playLevel(entry, speed);

        expect({
          cleared: report.cleared,
          inTime: report.steps < AUTOPILOT_LIMIT,
          endgameInTime: report.endgameSteps <= ENDGAME_LIMIT,
        }).toEqual({ cleared: true, inTime: true, endgameInTime: true });
      },
    );

    // A taller field lengthens every trip between the paddle and the bricks,
    // and leaves more of how long the last bricks take to luck: across twenty
    // seeds, its endgames drag past their stretched minute about three times
    // as often. The spec above holds how each level is drawn; this one, that
    // each is still cleared in its time on the tallest field.
    it.each(plays)(
      `is cleared, %s at ${speed}, on a field ${String(TALLEST_FIELD)} tall, within eight minutes stretched as its ball's trips are`,
      (_, entry) => {
        const report = playLevel(entry, speed, { height: TALLEST_FIELD });

        expect({
          cleared: report.cleared,
          inTime: report.steps < limitsOf(TALLEST_FIELD).level,
        }).toEqual({ cleared: true, inTime: true });
      },
    );
  });
}
