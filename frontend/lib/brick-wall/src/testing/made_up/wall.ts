// A wall game made up for the specs of the solver, the careless player and
// the holders, on the library's own wall: a shot is an aim alone, one of
// nine, which breaks the lowest brick in play in the column of its number,
// whole, and the wall comes down after a round as the library's rules bring
// it down. Its certificates keep each shot's aim alone. It stands in a
// folder beside the entries, which a game's fences refuse it.

import { COLUMNS } from "../../rules/field";
import { brickAt, cellAt } from "../../rules/grid";
import {
  type Legend,
  type LegendBrick,
  levelOpening,
  wallFrom,
} from "../../rules/level_picture";
import {
  type Wall,
  type WallRules,
  isCleared,
  lowerWall,
} from "../../rules/wall";
import type { LinePlay, PlayedRound } from "../solver";

/** Kinds of brick made up for the specs: a level needs clay broken, not moss. */
export type MadeUpKind = "clay" | "moss";

/** Says which made-up kinds a level needs broken: clay, and the wall stands between rounds as it is. */
export const MADE_UP_RULES: WallRules<MadeUpKind> = {
  needed: (kind) => kind === "clay",
  betweenRounds: (wall) => wall,
};

/** Returns a brick of clay of some hits, as the legend draws it. */
function clay(hits: number): LegendBrick<MadeUpKind> {
  return { kind: "clay", hits, plates: 0 };
}

/**
 * How the made-up game reads its pictures: a digit a brick of clay of that
 * many hits, `#` one that never breaks, and `m` a brick of moss of 3.
 */
export const MADE_UP_LEGEND: Legend<MadeUpKind> = {
  none: ".",
  bricks: {
    "#": clay(0),
    ...Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => [
        String(index + 1),
        clay(index + 1),
      ]),
    ),
    m: { kind: "moss", hits: 3, plates: 0 },
  },
  twinMarks: [],
  tintOf: () => 0,
};

/** Describes where a round of the made-up game starts: its wall. */
export interface MadeUpStart {
  readonly wall: Wall<MadeUpKind>;
}

/** What a lost level measures: less than any wall still standing. */
const LOST_SCORE = -1_000_000;

/** What a cleared level measures before its rounds are taken off: more than any wall still standing. */
const CLEARED_SCORE = 1_000_000;

/**
 * Returns how the made-up game plays a level, its wall pictured as
 * `wallFrom()` draws one, on a field of a depth: a shot at aim `a`, 0 to 8,
 * breaks the lowest brick in play in column `a` but one that never breaks,
 * which stops it; and a round is measured by the hits left in the wall's
 * bricks, of every kind, the fewer the better.
 */
export function madeUpPlay(
  picture: readonly string[],
  depth: number,
): LinePlay<MadeUpKind, MadeUpStart, number> {
  return {
    opening: {
      wall: levelOpening(wallFrom(picture, MADE_UP_LEGEND), depth).wall,
    },
    shots: Array.from({ length: COLUMNS }, (_, aim) => [aim]),
    play: (start, aim) => playShot(start, aim, depth),
    keyOf: ({ wall }) =>
      `${wall.bricks.map((brick) => brick?.hits ?? ".").join(",")}|${String(wall.lowestRow)}`,
    score: ({ outcome, next }, rounds) => {
      if (outcome.result === "lost") return LOST_SCORE;
      if (outcome.result === "cleared") return CLEARED_SCORE - rounds;
      return -next.wall.bricks.reduce(
        (sum, brick) => sum + (brick?.hits ?? 0),
        0,
      );
    },
    wallRules: MADE_UP_RULES,
  };
}

/**
 * Returns a shot as the made-up game's certificates keep it, an aim alone:
 * their codec, which throws a `RangeError` for anything else.
 */
export function readMadeUpShot(kept: unknown): number {
  if (!isMadeUpAim(kept)) {
    throw new RangeError(`${JSON.stringify(kept)} isn't an aim.`);
  }
  return kept;
}

/** Returns whether a value is one of the made-up game's aims: a whole number from 0 to 8. */
function isMadeUpAim(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < COLUMNS
  );
}

/** Returns the round a shot at an aim plays from where a round starts on a field of a depth, throwing a `RangeError` for an aim that isn't one. */
function playShot(
  { wall }: MadeUpStart,
  aim: number,
  depth: number,
): PlayedRound<MadeUpStart> {
  if (!isMadeUpAim(aim)) {
    throw new RangeError(`${String(aim)} isn't an aim.`);
  }
  const struck = lowestIn(wall, aim, depth);
  const bricks = wall.bricks.map((brick, cell) =>
    cell === struck && brick !== null && brick.hits > 0 ? null : brick,
  );
  const broken = { ...wall, bricks };
  if (isCleared(broken, MADE_UP_RULES)) {
    return {
      outcome: { result: "cleared", jumped: false },
      next: { wall: broken },
    };
  }
  const lowered = lowerWall(broken, depth, MADE_UP_RULES);
  return {
    outcome: { result: lowered.lost ? "lost" : "on", jumped: lowered.jumped },
    next: { wall: lowered.wall },
  };
}

/** Returns the wall cell of the lowest brick in play in a column of a field of a depth, or null where none stands. */
function lowestIn(
  wall: Wall<MadeUpKind>,
  column: number,
  depth: number,
): number | null {
  for (let row = 0; row < depth; row++) {
    if (brickAt(wall, depth, column, row) !== null) {
      return cellAt(wall, column, row);
    }
  }
  return null;
}
