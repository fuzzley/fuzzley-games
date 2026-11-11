import type { Level } from "../rules/levels/level";
import type { RoundRules } from "../rules/round/round";
import type { Boon } from "../rules/shot";
import { wallFrom } from "./wall_picture";

/** Rules under which a fuzzball yawns before it reaches any wall, so no shot takes a hit off a brick. */
export const NO_HITS: RoundRules = { bored: 0.5 };

/**
 * Returns a level whose wall is pictured, a row of nine characters for each
 * of its rows from the top, as `wallFrom()` draws one, with the boon its
 * jumps earn.
 */
export function levelFrom(
  picture: readonly string[],
  boon: Boon = "hot",
): Level {
  const { bricks, rows } = wallFrom(picture);
  return { boon, bricks, rows };
}

/** A level of one plain brick three rows over the wall's lowest, which opens on the jump line of a field 11 deep: no shot taking a hit, it jumps once and is lost in six rounds. */
export const HIGH_BRICK = levelFrom([
  "o........",
  ".........",
  ".........",
  ".........",
]);
