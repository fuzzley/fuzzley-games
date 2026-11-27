// The rules every level keeps, as the design gives them: its board's size,
// its moves and its kinds, at most 4 kinds of thing on its board, goals it
// can meet there, its deals and its stars, and, over the levels in the
// order they are played, each new thing arriving alone. Whether a level
// plays well, and whether each deal can be cleared in its moves, are found
// by playing it, not read from its file.

import { count, listed } from "@fz/core/format";
import { keysOf } from "@fz/core/records";
import { type LaidOut, layOut } from "../board/picture";
import type { ElementGoalId, Goal } from "../catalog/goals";
import type { Level, NewThing } from "./level";

/** Describes the fewest and the most of something a level may have. */
interface Range {
  readonly least: number;
  readonly most: number;
}

/** The fewest and the most columns a level's board has. */
const COLUMNS: Range = { least: 6, most: 8 };

/** The fewest and the most rows a level's board has. */
const ROWS: Range = { least: 6, most: 9 };

/** The fewest and the most moves a level lasts. */
const MOVES: Range = { least: 11, most: 33 };

/** The fewest and the most kinds a level plays with: 5 the rule, 6 a difficulty, 4 a party. */
const KINDS: Range = { least: 4, most: 6 };

/** The most goals a level sets. */
const MOST_GOALS = 3;

/** The most kinds of thing a level's board holds. */
const MOST_THINGS = 4;

/** How many deals a level has, for "Try again" to play the next of. */
const DEALS = 8;

/**
 * Everything a board can hold beside its plain fuzzballs, in the order the
 * levels bring them: a special it is dealt, a gap, dust, a brick of 1
 * layer, a thicker one, a cage, a sleepyhead, a burr, a wind that never
 * turns and one that does.
 */
const BOARD_THINGS = [
  "special",
  "gap",
  "dust",
  "brick",
  "thick-brick",
  "cage",
  "sleepyhead",
  "burr",
  "wind",
  "turning-wind",
] as const satisfies readonly string[];

/** Something a board holds beside its plain fuzzballs, such as a cage. */
type BoardThing = (typeof BOARD_THINGS)[number];

/** Each thing a board can hold, in a sentence's words. */
const THING_WORDS: Readonly<Record<BoardThing, string>> = {
  special: "specials",
  gap: "gaps",
  dust: "dust",
  brick: "bricks",
  "thick-brick": "thick bricks",
  cage: "cages",
  sleepyhead: "sleepyheads",
  burr: "burrs",
  wind: "wind",
  "turning-wind": "turning wind",
};

/**
 * What each new thing puts on the board of the level that brings it in:
 * the thing itself, the specials it is dealt for the pair, or nothing for
 * the bunch and the specials a bunch makes.
 */
const HELD_WHEN_BROUGHT: Readonly<Record<NewThing, BoardThing | null>> = {
  bunch: null,
  dasher: null,
  wisp: null,
  puffer: null,
  frizzball: null,
  pair: "special",
  dust: "dust",
  brick: "brick",
  "thick-brick": "thick-brick",
  cage: "cage",
  sleepyhead: "sleepyhead",
  burr: "burr",
  wind: "wind",
  "turning-wind": "turning-wind",
};

/** Describes a goal of an element: the things on a board it counts, and the goal in the design's words. */
interface ElementGoal {
  readonly counts: readonly BoardThing[];
  readonly words: string;
}

/** Every goal of an element, by its id. */
const ELEMENT_GOALS: Readonly<Record<ElementGoalId, ElementGoal>> = {
  dust: { counts: ["dust"], words: "all the dust" },
  brick: { counts: ["brick", "thick-brick"], words: "every brick" },
  cage: { counts: ["cage"], words: "every cage" },
  sleepyhead: { counts: ["sleepyhead"], words: "every sleepyhead" },
};

/**
 * Returns what keeps a level from the rules a level keeps on its own, a
 * sentence for the first a reader would fix, or null for one that keeps
 * them all.
 *
 * Of its goals, the reader has refused a level with none, and a gather of a
 * kind it doesn't play with, so these rules ask only that it sets 3 at
 * most, each of its own, and that its board holds the element each goal of
 * an element counts.
 */
export function levelProblem(level: Level): string | null {
  const laidOut = layOut(level.board, level.dust);
  const { width, height } = laidOut;
  const things = thingsOn(level, laidOut);
  const kinds = level.kinds.length;
  return (
    rangeProblem(
      width,
      COLUMNS,
      `its board is ${count(width, "column", "columns")} wide`,
    ) ??
    rangeProblem(
      height,
      ROWS,
      `its board is ${count(height, "row", "rows")} tall`,
    ) ??
    rangeProblem(
      level.moves,
      MOVES,
      `it has ${count(level.moves, "move", "moves")}`,
    ) ??
    rangeProblem(
      kinds,
      KINDS,
      `it plays with ${count(kinds, "kind", "kinds")}`,
    ) ??
    thingsProblem(things) ??
    broughtAloneProblem(level.brings, things) ??
    goalsProblem(level.goals, things) ??
    dealsProblem(level.deals) ??
    starsProblem(level.stars, level.moves)
  );
}

/**
 * Returns what keeps levels, in the order they are played, from bringing
 * each new thing in alone, naming the first level at fault, or null for
 * levels that do.
 *
 * The first level whose board holds a thing holds nothing else, and brings
 * the thing in, but for a gap, which no level's file names as brought in;
 * and no level brings in what a level before it brought in.
 */
export function arrivalProblem(levels: readonly Level[]): string | null {
  const broughtIn = new Map<NewThing, Level>();
  const heldFirst = new Map<BoardThing, Level>();
  for (const level of levels) {
    const things = thingsOn(level, layOut(level.board, level.dust));
    const problem =
      broughtTwiceProblem(level, broughtIn) ??
      firstHeldProblem(level, things, heldFirst);
    if (problem !== null) {
      return problem;
    }
    if (level.brings !== null) {
      broughtIn.set(level.brings, level);
    }
    for (const thing of things) {
      if (!heldFirst.has(thing)) {
        heldFirst.set(thing, level);
      }
    }
  }
  return null;
}

/** Returns the things a level's board, as its pictures lay it out, holds beside its plain fuzzballs, in the order the levels bring them. */
function thingsOn(
  { specials, wind }: Level,
  { placed, dust }: LaidOut,
): readonly BoardThing[] {
  const holds: Readonly<Record<BoardThing, boolean>> = {
    special: specials.length > 0,
    gap: placed.some(({ what }) => what === "gap"),
    dust: dust.some((layers) => layers > 0),
    brick: placed.some(
      (square) => square.what === "brick" && square.layers === 1,
    ),
    "thick-brick": placed.some(
      (square) => square.what === "brick" && square.layers > 1,
    ),
    cage: placed.some((square) => square.what === "fuzzball" && square.caged),
    sleepyhead: placed.some(({ what }) => what === "sleepyhead"),
    burr: placed.some((square) => square.what === "fuzzball" && square.burred),
    wind: wind !== null && wind.turns === null,
    "turning-wind": wind !== null && wind.turns !== null,
  };
  return BOARD_THINGS.filter((thing) => holds[thing]);
}

/** Returns a count's words and its range where the count falls outside it, or null where it falls within. */
function rangeProblem(
  value: number,
  { least, most }: Range,
  words: string,
): string | null {
  return value < least || value > most
    ? `${words}, not ${String(least)} to ${String(most)}`
    : null;
}

/** Returns what puts more kinds of thing on a board than it may hold, a thick brick counted as a brick, or null for a board within the most. */
function thingsProblem(things: readonly BoardThing[]): string | null {
  const kinds = [
    ...new Set(
      things.map((thing) => (thing === "thick-brick" ? "brick" : thing)),
    ),
  ];
  return kinds.length > MOST_THINGS
    ? `its board holds ${String(kinds.length)} kinds of thing, more than ${String(MOST_THINGS)}: ${listed(wordsOf(kinds))}`
    : null;
}

/** Returns what keeps a level's board from holding what it brings in, and that alone, or null for a board that does. */
function broughtAloneProblem(
  brings: NewThing | null,
  things: readonly BoardThing[],
): string | null {
  if (brings === null) {
    return null;
  }
  const held = HELD_WHEN_BROUGHT[brings];
  const others = things.filter((thing) => thing !== held);
  if (others.length > 0) {
    return `it brings in the ${newWords(brings)}, and its board holds ${listed(wordsOf(others))} too`;
  }
  return held !== null && !things.includes(held)
    ? `it brings in the ${newWords(brings)}, and its board holds no ${THING_WORDS[held]}`
    : null;
}

/** Returns what keeps a level's goals from being 3 at most, each of its own and each met on its board, or null for goals that are. */
function goalsProblem(
  goals: readonly Goal[],
  things: readonly BoardThing[],
): string | null {
  if (goals.length > MOST_GOALS) {
    return `it has ${count(goals.length, "goal", "goals")}, more than ${String(MOST_GOALS)}`;
  }
  const asked = goals.map(goalWords);
  const twice = asked.find((goal, place) => asked.indexOf(goal) !== place);
  if (twice !== undefined) {
    return `it asks twice for ${twice}`;
  }
  for (const goal of goals) {
    if (goal.what !== "gather") {
      const { counts, words } = ELEMENT_GOALS[goal.what];
      if (!counts.some((thing) => things.includes(thing))) {
        return `it asks for ${words}, and its board holds none`;
      }
    }
  }
  return null;
}

/** Returns what keeps a level from 8 deals of its own, or null for a level with them. */
function dealsProblem(deals: readonly number[]): string | null {
  if (deals.length !== DEALS) {
    return `it has ${count(deals.length, "deal", "deals")}, not ${String(DEALS)}`;
  }
  const twice = deals.find((seed, place) => deals.indexOf(seed) !== place);
  return twice === undefined ? null : `it has the deal ${String(twice)} twice`;
}

/** Returns what keeps a level's stars from rising from clearing it to fewer moves to spare than it has, or null for stars that do. */
function starsProblem(
  stars: readonly [number, number, number],
  moves: number,
): string | null {
  const [first, second, third] = stars;
  if (first !== 0) {
    return `its first star asks for ${count(first, "move", "moves")} to spare, not 0`;
  }
  if (second <= first || third <= second) {
    return `its stars ask for ${listed(stars.map(String))} moves to spare, which don't rise`;
  }
  return third >= moves
    ? `its third star asks for ${count(third, "move", "moves")} to spare, and it lasts ${count(moves, "move", "moves")}`
    : null;
}

/** Returns what a level brings in that a level before it brought in, or null for a level that brings in nothing, or a thing new. */
function broughtTwiceProblem(
  level: Level,
  broughtIn: ReadonlyMap<NewThing, Level>,
): string | null {
  const { brings } = level;
  if (brings === null) {
    return null;
  }
  const before = broughtIn.get(brings);
  return before === undefined
    ? null
    : `level ${level.id} brings in the ${newWords(brings)}, which level ${before.id} brought in before it`;
}

/**
 * Returns what puts a thing on a board first beside something else, or
 * without the level bringing it in, or null for a level that holds nothing
 * new, or that alone and brought in, a gap aside.
 */
function firstHeldProblem(
  level: Level,
  things: readonly BoardThing[],
  heldFirst: ReadonlyMap<BoardThing, Level>,
): string | null {
  const first = things.find((thing) => !heldFirst.has(thing));
  if (first === undefined) {
    return null;
  }
  const others = things.filter((thing) => thing !== first);
  if (others.length > 0) {
    return `level ${level.id} is the first to hold ${THING_WORDS[first]}, and holds ${listed(wordsOf(others))} too`;
  }
  const arrival = keysOf(HELD_WHEN_BROUGHT).find(
    (thing) => HELD_WHEN_BROUGHT[thing] === first,
  );
  return arrival === undefined || arrival === level.brings
    ? null
    : `level ${level.id} is the first to hold ${THING_WORDS[first]}, and doesn't bring in the ${newWords(arrival)}`;
}

/** Returns things on a board in a sentence's words. */
function wordsOf(things: readonly BoardThing[]): string[] {
  return things.map((thing) => THING_WORDS[thing]);
}

/** Returns a goal in a sentence's words, such as "every cage" or "blue fuzzballs". */
function goalWords(goal: Goal): string {
  return goal.what === "gather"
    ? `${goal.kind} fuzzballs`
    : ELEMENT_GOALS[goal.what].words;
}

/** Returns a new thing in a sentence's words, such as "thick brick". */
function newWords(thing: NewThing): string {
  return thing.replaceAll("-", " ");
}
