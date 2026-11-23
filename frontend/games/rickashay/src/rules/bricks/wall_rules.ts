// What Rickashay's kinds of brick say of its wall, which @fz/brick-wall's
// lowerWall() and the danger row's helpers are handed: a level needs broken
// the kinds the catalog marks needed, and moss grows back between rounds.

import type { WallRules } from "@fz/brick-wall/rules/wall";
import {
  type Brick,
  type KindId,
  type Wall,
  hasTrait,
  kindOf,
} from "../catalog/kinds";
import { MOSS_REGROWS } from "../tuning";

/**
 * Returns a wall with each brick that regrows, moss, grown back
 * `MOSS_REGROWS` hits up to its full hits, as it is after each round it
 * survives; or the same wall where none grows.
 */
function regrow(wall: Wall): Wall {
  if (!wall.bricks.some(grows)) {
    return wall;
  }
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      grows(brick)
        ? { ...brick, hits: Math.min(brick.full, brick.hits + MOSS_REGROWS) }
        : brick,
    ),
  };
}

/** Returns whether a cell holds a brick that grows hits back after a round: moss short of its full hits. */
function grows(brick: Brick | null): brick is Brick {
  return (
    brick !== null && brick.hits < brick.full && hasTrait(brick.kind, "regrows")
  );
}

/** What the wall's rules say of its bricks: a level needs those of a kind the catalog marks needed broken, and moss grows back between rounds. */
export const WALL_RULES: WallRules<KindId> = {
  needed: (kind) => kindOf(kind).needed,
  betweenRounds: regrow,
};
