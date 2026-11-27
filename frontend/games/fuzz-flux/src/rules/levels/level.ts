// A level, as a set's file holds it, and the reader that takes a set's file
// in. The files are the design's, copied as they are, so the reader takes
// their words for the goals and the specials and gives back the game's. It
// refuses whatever the game can't play, and asks nothing of whether a
// level plays well.

import { isCount, isRecord, isWhole, listOf, unknownKey } from "@fz/core/json";
import { isKeyOf, isOneOf, itemAt } from "@fz/core/records";
import { WINDS, type Wind } from "../board/board";
import { type Square, indexOf } from "../board/cells";
import { readPictures } from "../board/picture";
import type { ElementGoalId, Goal } from "../catalog/goals";
import { type KindId, isKindId } from "../catalog/kinds";
import type { MadeId, SpecialId } from "../catalog/specials";

/** Everything a level can bring in new, in the order the levels bring them, each with a line of its own under the bar. */
const NEW_THINGS = [
  "bunch",
  "dasher",
  "wisp",
  "puffer",
  "frizzball",
  "pair",
  "dust",
  "brick",
  "thick-brick",
  "cage",
  "sleepyhead",
  "burr",
  "wind",
  "turning-wind",
] as const satisfies readonly string[];

/** Something a level brings in new, such as "thick-brick". */
export type NewThing = (typeof NEW_THINGS)[number];

/** Describes a special a level is dealt on a square of its board. */
export type PlacedSpecial =
  | {
      readonly at: Square;
      readonly what: SpecialId;
      readonly kind: KindId;
    }
  | { readonly at: Square; readonly what: "frizzball" };

/** Describes a level's wind: where it blows from the start, and how it turns. */
export interface LevelWind {
  readonly blows: Wind;
  /**
   * How often it turns, in moves, and how many quarter turns clockwise each
   * turn gives the board's frame; null for a wind that never turns.
   */
  readonly turns: { readonly every: number; readonly quarters: number } | null;
}

/** Describes a move: a square picked up, and its neighbor it is swapped with. */
export interface Hint {
  readonly from: Square;
  readonly to: Square;
}

/** Describes a level, as its set's file holds it, in the game's words. */
export interface Level {
  /** Names it for good, since its records are kept by it: its number among the design's levels, in digits. */
  readonly id: string;
  readonly name: string;
  /** What it is made around, as the design says it. */
  readonly idea: string;
  /** What it brings in new, or null for a level that brings in nothing. */
  readonly brings: NewThing | null;
  /** The kinds it plays with, in its own order, which the deal's draws pick from by their places. */
  readonly kinds: readonly KindId[];
  readonly moves: number;
  readonly goals: readonly Goal[];
  /** Its board, a row a string, top row first, each square a letter of the legend's. */
  readonly board: readonly string[];
  /** Its dust, of its board's shape, a digit a square, or null for a level with no dust. */
  readonly dust: readonly string[] | null;
  /** The specials it is dealt, in the order the deal places them. */
  readonly specials: readonly PlacedSpecial[];
  /** Its wind, or null for a level with none, everything falling down. */
  readonly wind: LevelWind | null;
  /** The move a hand shows on a level that teaches something, or null where the hint is the careful player's. */
  readonly hint: Hint | null;
  /** The seeds of its deals, in the order they are played. */
  readonly deals: readonly number[];
  /** The moves to spare its first, second and third stars ask for, the first at clearing it. */
  readonly stars: readonly [number, number, number];
}

/** Describes a set of levels, as its file holds it. */
export interface LevelSet {
  readonly id: string;
  readonly name: string;
  /** What its levels bring in, as the design says it. */
  readonly about: string;
  readonly levels: readonly Level[];
}

/** The keys a set's file may have, so one a typo misspells isn't left unread. */
const SET_KEYS: Readonly<Record<keyof LevelSet, true>> = {
  id: true,
  name: true,
  about: true,
  levels: true,
};

/** The keys a level may have in its set's file: a level's, and the set it is in. */
const LEVEL_KEYS: Readonly<Record<keyof Level | "set", true>> = {
  id: true,
  set: true,
  name: true,
  idea: true,
  brings: true,
  kinds: true,
  moves: true,
  goals: true,
  board: true,
  dust: true,
  specials: true,
  wind: true,
  hint: true,
  deals: true,
  stars: true,
};

/** Every goal a level's file names, by its word there. */
const GOALS_IN_FILES = {
  dust: "dust",
  brick: "brick",
  cage: "cage",
  sleepy: "sleepyhead",
} as const satisfies Readonly<Record<string, ElementGoalId>>;

/** Every special a level's file places, by its word there. */
const SPECIALS_IN_FILES = {
  "dash-h": "dasher-across",
  "dash-v": "dasher-down",
  puff: "puffer",
  wisp: "wisp",
  frizz: "frizzball",
} as const satisfies Readonly<Record<string, MadeId>>;

/**
 * Returns a set of levels from its file, as it reads.
 *
 * @throws {Error} for a file the game can't trust, naming the level and
 *   what is wrong with it.
 */
export function levelSetOf(file: unknown): LevelSet {
  const fail = (problem: string): never => {
    throw new Error(`A set of levels: ${problem}.`);
  };
  if (!isRecord(file)) {
    return fail("it isn't a record");
  }
  const extra = unknownKey(file, SET_KEYS);
  if (extra !== null) {
    fail(`it has a "${extra}", which no set has`);
  }
  const id = textOf(file["id"]) ?? fail("it has no id");
  const levels: unknown = file["levels"];
  if (!Array.isArray(levels) || levels.length === 0) {
    return fail(`"${id}" has no levels`);
  }
  const stored: readonly unknown[] = levels;
  const name = textOf(file["name"]) ?? fail(`"${id}" has no name`);
  const about =
    textOf(file["about"]) ?? fail(`"${id}" says nothing of its levels`);
  const read = stored.map((level, place) => levelOf(level, id, place));
  const twice = read.find(
    (level, place) =>
      read.findIndex((other) => other.id === level.id) !== place,
  );
  if (twice !== undefined) {
    fail(`"${id}" has two levels numbered ${twice.id}`);
  }
  return { id, name, about, levels: read };
}

/** Returns a level from its set's file, throwing for one the game can't trust. */
function levelOf(file: unknown, set: string, place: number): Level {
  const fail = (problem: string): never => {
    throw new Error(
      `Level ${String(place + 1)} of the set "${set}": ${problem}.`,
    );
  };
  // A key's value as its reader reads it, or the level refused.
  const read = <T>(
    value: unknown,
    reader: (value: unknown) => T | null,
    problem: string,
  ): T => reader(value) ?? fail(problem);
  // An optional key's value, as read, or its own for a key left out.
  const readGiven = <T, E>(
    value: unknown,
    reader: (value: unknown) => T | null,
    leftOut: E,
    problem: string,
  ): T | E => (value === undefined ? leftOut : read(value, reader, problem));
  if (!isRecord(file)) {
    return fail("it isn't a record");
  }
  const extra = unknownKey(file, LEVEL_KEYS);
  if (extra !== null) {
    fail(`it has a "${extra}", which no level has`);
  }
  if (file["set"] !== set) {
    fail("it names another set");
  }
  const kinds = read(
    file["kinds"],
    kindsOf,
    "it plays with no list of kinds, each once",
  );
  const board = read(file["board"], rowsOf, "it has no picture of its board");
  const dust = readGiven(
    file["dust"],
    rowsOf,
    null,
    "it has no picture of its dust",
  );
  const laidOut = readPictures(board, dust);
  if (typeof laidOut === "string") {
    return fail(laidOut);
  }
  const { width, height, placed } = laidOut;
  const [strange] = placed.flatMap((square) =>
    square.what === "fuzzball" &&
    square.kind !== null &&
    !kinds.includes(square.kind)
      ? [square.kind]
      : [],
  );
  if (strange !== undefined) {
    fail(`its board draws a ${strange} fuzzball, a kind it doesn't play with`);
  }
  const onBoard = ({ x, y }: Square): boolean =>
    x < width &&
    y < height &&
    itemAt(placed, indexOf({ x, y }, width)).what !== "gap";
  return {
    id: String(read(file["id"], positive, "it has no number for its id")),
    name: read(file["name"], textOf, "it has no name"),
    idea: read(file["idea"], textOf, "it says nothing of its idea"),
    brings: readGiven(
      file["brings"],
      newThingOf,
      null,
      "it brings in nothing the game knows",
    ),
    kinds,
    moves: read(file["moves"], positive, "it has no moves"),
    goals: read(
      file["goals"],
      (goals) => goalsOf(goals, kinds),
      "it has no list of goals, each of a kind it plays with",
    ),
    board,
    dust,
    specials: readGiven(
      file["specials"],
      (specials) =>
        listOf(specials, (special) => specialOf(special, kinds, onBoard)),
      [],
      "it places a special the game can't, or off its board",
    ),
    wind: readGiven(
      file["wind"],
      windOf,
      null,
      "it has a wind the game can't blow",
    ),
    hint: readGiven(
      file["hint"],
      (hint) => hintOf(hint, onBoard),
      null,
      "it hints at no swap of neighbors on its board",
    ),
    deals: read(
      file["deals"],
      dealsOf,
      "it has no list of deals, each a seed from 0",
    ),
    stars: read(
      file["stars"],
      starsOf,
      "it asks for no 3 counts of moves to spare",
    ),
  };
}

/** Returns a picture from a file, a list of rows, or null. */
function rowsOf(value: unknown): readonly string[] | null {
  return listOf(value, textOf);
}

/** Returns a level's deals from a file, a seed each, or null for none. */
function dealsOf(value: unknown): readonly number[] | null {
  const deals = listOf(value, (seed) => (isCount(seed) ? seed : null));
  return deals?.length === 0 ? null : deals;
}

/** Returns a value read from a file if it is text with something in it, or null. */
function textOf(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** Returns a value read from a file if it is a whole number above 0, or null. */
function positive(value: unknown): number | null {
  return isWhole(value) && value > 0 ? value : null;
}

/** Returns the kinds a file lists, or null for a list empty, of other than kinds, or naming a kind twice. */
function kindsOf(value: unknown): readonly KindId[] | null {
  const kinds = listOf(value, (kind) => (isKindId(kind) ? kind : null));
  return kinds === null ||
    kinds.length === 0 ||
    new Set(kinds).size !== kinds.length
    ? null
    : kinds;
}

/** Returns what a level brings in new, from its file's words, which part a thing's words by spaces, or null. */
function newThingOf(value: unknown): NewThing | null {
  const thing = typeof value === "string" ? value.replaceAll(" ", "-") : null;
  return isOneOf(thing, NEW_THINGS) ? thing : null;
}

/** Returns a level's goals from its file, or null for a list empty or of a goal it can't play. */
function goalsOf(
  value: unknown,
  kinds: readonly KindId[],
): readonly Goal[] | null {
  const goals = listOf(value, (goal) => goalOf(goal, kinds));
  return goals === null || goals.length === 0 ? null : goals;
}

/** Returns a goal from a level's file, or null for one of no goal's shape or of a kind it doesn't play with. */
function goalOf(value: unknown, kinds: readonly KindId[]): Goal | null {
  if (!isRecord(value)) {
    return null;
  }
  const { type, kind, count, ...rest } = value;
  if (Object.keys(rest).length > 0) {
    return null;
  }
  if (type === "gather") {
    const counted = positive(count);
    return isKindId(kind) && kinds.includes(kind) && counted !== null
      ? { what: "gather", kind, count: counted }
      : null;
  }
  return isKeyOf(type, GOALS_IN_FILES) &&
    kind === undefined &&
    count === undefined
    ? { what: GOALS_IN_FILES[type] }
    : null;
}

/** Returns a special from a level's file, or null for one the game can't place, or not on its board. */
function specialOf(
  value: unknown,
  kinds: readonly KindId[],
  onBoard: (square: Square) => boolean,
): PlacedSpecial | null {
  if (!isRecord(value) || unknownKey(value, SPECIAL_KEYS) !== null) {
    return null;
  }
  const { x, y, kind, sp } = value;
  if (
    !isCount(x) ||
    !isCount(y) ||
    !onBoard({ x, y }) ||
    !isKindId(kind) ||
    !kinds.includes(kind) ||
    !isKeyOf(sp, SPECIALS_IN_FILES)
  ) {
    return null;
  }
  const what = SPECIALS_IN_FILES[sp];
  return what === "frizzball"
    ? { at: { x, y }, what }
    : { at: { x, y }, what, kind };
}

/** The keys a special has in a level's file. */
const SPECIAL_KEYS: Readonly<Record<"x" | "y" | "kind" | "sp", true>> = {
  x: true,
  y: true,
  kind: true,
  sp: true,
};

/** Returns a level's wind from its file, or null for one the game can't blow. */
function windOf(value: unknown): LevelWind | null {
  if (!isRecord(value)) {
    return null;
  }
  const { dir, every, turn, ...rest } = value;
  if (Object.keys(rest).length > 0 || !isOneOf(dir, WINDS)) {
    return null;
  }
  if (every === undefined) {
    return turn === undefined ? { blows: dir, turns: null } : null;
  }
  const often = positive(every);
  const quarters = turn === undefined ? 1 : positive(turn);
  return often === null || quarters === null || quarters > 3
    ? null
    : { blows: dir, turns: { every: often, quarters } };
}

/** Returns a level's hint from its file, two neighboring squares of its board, or null. */
function hintOf(
  value: unknown,
  onBoard: (square: Square) => boolean,
): Hint | null {
  const squares = listOf(value, (square) => {
    const at = listOf(square, (n) => (isCount(n) ? n : null));
    if (at?.length !== 2) {
      return null;
    }
    const placed = { x: itemAt(at, 0), y: itemAt(at, 1) };
    return onBoard(placed) ? placed : null;
  });
  if (squares?.length !== 2) {
    return null;
  }
  const from = itemAt(squares, 0);
  const to = itemAt(squares, 1);
  const apart = Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
  return apart === 1 ? { from, to } : null;
}

/** Returns a level's thresholds for its stars from its file, 3 counts of moves to spare, or null. */
function starsOf(value: unknown): readonly [number, number, number] | null {
  const stars = listOf(value, (spare) => (isCount(spare) ? spare : null));
  return stars?.length === 3
    ? [itemAt(stars, 0), itemAt(stars, 1), itemAt(stars, 2)]
    : null;
}
