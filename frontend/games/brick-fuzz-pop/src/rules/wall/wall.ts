// Brick Fuzz Pop's wall: @fz/brick-wall/rules/wall's, of the catalog's kinds
// of brick, and what the wall's rules say of them, which the library's
// lowerWall() and the danger row's helpers are handed.

import type {
  Brick as BrickOf,
  Wall as WallOf,
  WallRules,
} from "@fz/brick-wall/rules/wall";
import { type BrickKindId, brickKind, hasTrait } from "../catalog/bricks";

/** Describes a brick of a wall, of a kind the catalog holds, as it stands this round. */
export type Brick = BrickOf<BrickKindId>;

/** Describes a level's wall of the catalog's kinds, a value each round replaces. */
export type Wall = WallOf<BrickKindId>;

/**
 * Returns a wall with each brick that regrows, moss, given back a hit up to
 * its full hits, as it grows after each round it survives; or the same
 * wall where none grows.
 */
export function regrow(wall: Wall): Wall {
  if (!wall.bricks.some(grows)) return wall;
  return {
    ...wall,
    bricks: wall.bricks.map((brick) =>
      grows(brick) ? { ...brick, hits: brick.hits + 1 } : brick,
    ),
  };
}

/** Returns whether a cell holds a brick that grows a hit back after the round: moss short of its full hits. */
function grows(brick: Brick | null): brick is Brick {
  return (
    brick !== null && brick.hits < brick.full && hasTrait(brick.kind, "regrows")
  );
}

/** What the wall's rules say of its bricks: a level needs those of a kind the catalog marks needed broken, and moss regrows between rounds. */
export const WALL_RULES: WallRules<BrickKindId> = {
  needed: (kind) => brickKind(kind).needed,
  betweenRounds: regrow,
};
