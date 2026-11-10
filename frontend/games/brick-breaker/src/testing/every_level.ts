import { variantOfSpec } from "@fz/core/testing";
import { LEVELS } from "../rules/levels/levels";
import { PRESET_SPEEDS } from "../rules/speed";
import { TALLEST_FIELD } from "../rules/tuning";
import {
  AUTOPILOT_LIMIT,
  ENDGAME_LIMIT,
  limitsOf,
  playLevel,
} from "./autopilot";

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
  const speed = variantOfSpec(specFile, PRESET_SPEEDS, "every_level");
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
