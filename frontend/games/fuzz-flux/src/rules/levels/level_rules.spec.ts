import type { Level } from "./level";
import { arrivalProblem, levelProblem } from "./level_rules";

/** Returns a picture 6 squares wide and 6 rows tall: its top rows, and rows of one letter under them. */
function pictureOf(top: readonly string[], letter: string): string[] {
  return [...top, ...Array<string>(6 - top.length).fill(letter.repeat(6))];
}

/** Returns a picture of a board 6 by 6: its top rows, and plain fuzzballs under them. */
function boardOf(...top: readonly string[]): string[] {
  return pictureOf(top, ".");
}

/** Returns a picture of a board's dust, 6 by 6: its top rows, and no dust under them. */
function dustOf(...top: readonly string[]): string[] {
  return pictureOf(top, "0");
}

/** Returns a picture of a board of plain fuzzballs, so many squares wide and rows tall. */
function plainBoard(width: number, height: number): string[] {
  return Array<string>(height).fill(".".repeat(width));
}

/** A level that keeps every rule: a board 6 by 6 of plain fuzzballs, 5 kinds, 14 moves, a goal, 8 deals and its stars. */
const LEVEL: Level = {
  id: "1",
  name: "Spec",
  idea: "A spec's board.",
  brings: null,
  kinds: ["blue", "red", "amber", "green", "violet"],
  moves: 14,
  goals: [{ what: "gather", kind: "blue", count: 10 }],
  board: boardOf(),
  dust: null,
  specials: [],
  wind: null,
  hint: null,
  deals: [1, 2, 3, 4, 5, 6, 7, 8],
  stars: [0, 4, 9],
};

/** Returns the level that keeps every rule, changed. */
function levelWith(changes: Partial<Level>): Level {
  return { ...LEVEL, ...changes };
}

/** Returns levels played in the order given, each the level that keeps every rule changed, numbered from 1. */
function levelsWith(...changes: readonly Partial<Level>[]): Level[] {
  return changes.map((change, place) =>
    levelWith({ id: String(place + 1), ...change }),
  );
}

describe("levelProblem", () => {
  it("finds none in a level that keeps every rule", () => {
    expect(levelProblem(LEVEL)).toBeNull();
  });

  it.each<[string, Partial<Level>]>([
    ["a board 8 columns wide and 9 rows tall", { board: plainBoard(8, 9) }],
    ["11 moves", { moves: 11 }],
    ["33 moves", { moves: 33 }],
    ["4 kinds", { kinds: ["blue", "red", "amber", "green"] }],
    ["6 kinds", { kinds: ["blue", "red", "amber", "green", "violet", "pink"] }],
    [
      "4 kinds of thing, a thick brick counted as a brick",
      {
        board: boardOf("_12B.."),
        dust: dustOf("000010"),
      },
    ],
    [
      "3 goals",
      {
        goals: [
          { what: "gather", kind: "blue", count: 10 },
          { what: "gather", kind: "red", count: 10 },
          { what: "gather", kind: "amber", count: 10 },
        ],
      },
    ],
    [
      "a goal of every brick on a board of thick bricks",
      { board: boardOf("23...."), goals: [{ what: "brick" }] },
    ],
    ["a third star for 13 moves to spare of 14", { stars: [0, 1, 13] }],
    ["the bunch brought in on a board of plain fuzzballs", { brings: "bunch" }],
    [
      "the pair brought in on a board dealt specials",
      {
        brings: "pair",
        specials: [
          { at: { x: 0, y: 0 }, what: "puffer", kind: "blue" },
          { at: { x: 1, y: 0 }, what: "frizzball" },
        ],
      },
    ],
    [
      "the thick brick brought in on a board of thick bricks alone",
      { brings: "thick-brick", board: boardOf("23....") },
    ],
    [
      "the turning wind brought in on a board of it alone",
      {
        brings: "turning-wind",
        wind: { blows: "down", turns: { every: 2, quarters: 1 } },
      },
    ],
  ])("finds none in a level with %s", (_, changes) => {
    expect(levelProblem(levelWith(changes))).toBeNull();
  });

  it.each<[string, Partial<Level>, string]>([
    [
      "a board 5 columns wide",
      { board: plainBoard(5, 6) },
      "its board is 5 columns wide, not 6 to 8",
    ],
    [
      "a board 9 columns wide",
      { board: plainBoard(9, 6) },
      "its board is 9 columns wide, not 6 to 8",
    ],
    [
      "a board 5 rows tall",
      { board: plainBoard(6, 5) },
      "its board is 5 rows tall, not 6 to 9",
    ],
    [
      "a board 10 rows tall",
      { board: plainBoard(6, 10) },
      "its board is 10 rows tall, not 6 to 9",
    ],
    ["10 moves", { moves: 10 }, "it has 10 moves, not 11 to 33"],
    ["34 moves", { moves: 34 }, "it has 34 moves, not 11 to 33"],
    [
      "3 kinds",
      { kinds: ["blue", "red", "amber"] },
      "it plays with 3 kinds, not 4 to 6",
    ],
    [
      "5 kinds of thing",
      {
        board: boardOf("_1B*.."),
        dust: dustOf("000010"),
      },
      "its board holds 5 kinds of thing, more than 4: gaps, dust, bricks, cages and burrs",
    ],
    [
      "every kind of thing",
      {
        board: boardOf("_12B*z"),
        dust: dustOf("000001"),
        specials: [{ at: { x: 0, y: 1 }, what: "wisp", kind: "red" }],
        wind: { blows: "left", turns: { every: 4, quarters: 1 } },
      },
      "its board holds 8 kinds of thing, more than 4: specials, gaps, dust, bricks, cages, sleepyheads, burrs and turning wind",
    ],
    [
      "the bunch brought in on a board with gaps",
      { brings: "bunch", board: boardOf("_.....") },
      "it brings in the bunch, and its board holds gaps too",
    ],
    [
      "the brick brought in on a board with a thick brick",
      { brings: "brick", board: boardOf("12....") },
      "it brings in the brick, and its board holds thick bricks too",
    ],
    [
      "the wind brought in on a board with dust",
      {
        brings: "wind",
        dust: dustOf("100000"),
        wind: { blows: "right", turns: null },
      },
      "it brings in the wind, and its board holds dust too",
    ],
    [
      "the cage brought in on a board with none",
      { brings: "cage" },
      "it brings in the cage, and its board holds no cages",
    ],
    [
      "the pair brought in on a board dealt no specials",
      { brings: "pair" },
      "it brings in the pair, and its board holds no specials",
    ],
    [
      "the turning wind brought in on a board whose wind never turns",
      { brings: "turning-wind", wind: { blows: "down", turns: null } },
      "it brings in the turning wind, and its board holds wind too",
    ],
    [
      "4 goals",
      {
        goals: [
          { what: "gather", kind: "blue", count: 10 },
          { what: "gather", kind: "red", count: 10 },
          { what: "gather", kind: "amber", count: 10 },
          { what: "gather", kind: "green", count: 10 },
        ],
      },
      "it has 4 goals, more than 3",
    ],
    [
      "a gather of one kind twice",
      {
        goals: [
          { what: "gather", kind: "blue", count: 10 },
          { what: "gather", kind: "blue", count: 5 },
        ],
      },
      "it asks twice for blue fuzzballs",
    ],
    [
      "a goal of an element twice",
      {
        board: boardOf("B....."),
        goals: [{ what: "cage" }, { what: "cage" }],
      },
      "it asks twice for every cage",
    ],
    [
      "a goal of all the dust on a board whose dust has no layer",
      {
        goals: [{ what: "dust" }],
        dust: dustOf(),
      },
      "it asks for all the dust, and its board holds none",
    ],
    [
      "a goal of every brick on a board of none",
      { goals: [{ what: "brick" }] },
      "it asks for every brick, and its board holds none",
    ],
    [
      "a goal of every cage on a board of none",
      { goals: [{ what: "gather", kind: "red", count: 5 }, { what: "cage" }] },
      "it asks for every cage, and its board holds none",
    ],
    [
      "a goal of every sleepyhead on a board of none",
      { goals: [{ what: "sleepyhead" }] },
      "it asks for every sleepyhead, and its board holds none",
    ],
    ["7 deals", { deals: [1, 2, 3, 4, 5, 6, 7] }, "it has 7 deals, not 8"],
    [
      "9 deals",
      { deals: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      "it has 9 deals, not 8",
    ],
    [
      "a deal twice",
      { deals: [1, 2, 3, 4, 5, 3, 7, 8] },
      "it has the deal 3 twice",
    ],
    [
      "a first star for moves to spare",
      { stars: [1, 4, 9] },
      "its first star asks for 1 move to spare, not 0",
    ],
    [
      "a second star for no more than the first",
      { stars: [0, 0, 9] },
      "its stars ask for 0, 0 and 9 moves to spare, which don't rise",
    ],
    [
      "a third star for no more than the second",
      { stars: [0, 4, 4] },
      "its stars ask for 0, 4 and 4 moves to spare, which don't rise",
    ],
    [
      "a third star for every move it has to spare",
      { stars: [0, 4, 14] },
      "its third star asks for 14 moves to spare, and it lasts 14 moves",
    ],
  ])("finds a level with %s", (_, changes, problem) => {
    expect(levelProblem(levelWith(changes))).toBe(problem);
  });
});

describe("arrivalProblem", () => {
  it("finds none in levels that bring each new thing in alone", () => {
    const levels = levelsWith(
      { brings: "bunch" },
      { brings: "cage", board: boardOf("B.....") },
      { board: boardOf("_.....") },
      { board: boardOf("_B....") },
      {
        brings: "pair",
        specials: [{ at: { x: 1, y: 1 }, what: "wisp", kind: "red" }],
      },
    );

    expect(arrivalProblem(levels)).toBeNull();
  });

  it.each<[string, readonly Partial<Level>[], string]>([
    [
      "a level that holds two things first",
      [{}, { board: boardOf("_B....") }],
      "level 2 is the first to hold gaps, and holds cages too",
    ],
    [
      "a level that holds a thing first beside one held before",
      [{ board: boardOf("_.....") }, { board: boardOf("_B....") }],
      "level 2 is the first to hold cages, and holds gaps too",
    ],
    [
      "a level that holds a thing first without bringing it in",
      [{ board: boardOf("*.....") }],
      "level 1 is the first to hold burrs, and doesn't bring in the burr",
    ],
    [
      "a level that holds specials first without bringing in the pair",
      [
        { brings: "bunch" },
        {
          specials: [{ at: { x: 0, y: 0 }, what: "dasher-down", kind: "blue" }],
        },
      ],
      "level 2 is the first to hold specials, and doesn't bring in the pair",
    ],
    [
      "a thing brought in twice",
      [{ brings: "bunch" }, { brings: "bunch" }],
      "level 2 brings in the bunch, which level 1 brought in before it",
    ],
  ])("finds %s", (_, changes, problem) => {
    expect(arrivalProblem(levelsWith(...changes))).toBe(problem);
  });
});
