import { DESIGN_SETS, designSet } from "../../testing/design_files";
import { type Level, levelSetOf } from "./level";

/** A level's file that the reader takes, as a set's file holds it. */
const FILE = {
  id: 1,
  set: "spec",
  name: "Spec",
  idea: "A spec's board.",
  kinds: ["blue", "red", "amber"],
  moves: 10,
  goals: [{ type: "gather", kind: "blue", count: 5 }],
  board: ["...", "._."],
  deals: [3, 1],
  stars: [0, 2, 4],
};

/** A set's file of the one level. */
const SET = {
  id: "spec",
  name: "Specs",
  about: "A spec's levels.",
  levels: [FILE],
};

/** Returns a set's file of the one level, its file changed, a key given as undefined left out. */
function setWith(changes: Readonly<Record<string, unknown>> = {}): object {
  return { ...SET, levels: [{ ...FILE, ...changes }] };
}

/** Returns the one level of a set's file, its file changed. */
function levelWith(changes: Readonly<Record<string, unknown>> = {}): Level {
  const [level] = levelSetOf(setWith(changes)).levels;
  if (level === undefined) {
    throw new Error("The set read has no level.");
  }
  return level;
}

describe("levelSetOf", () => {
  it.each(DESIGN_SETS)(
    "reads the design's set %s whole, its 9 levels",
    (set) => {
      expect(levelSetOf(designSet(set)).levels).toHaveLength(9);
    },
  );

  it("reads a set's name and what its levels bring in", () => {
    const { id, name, about } = levelSetOf(setWith());

    expect({ id, name, about }).toEqual({
      id: "spec",
      name: "Specs",
      about: "A spec's levels.",
    });
  });

  it("reads a level in the game's words, its id its number in digits", () => {
    expect(levelWith()).toEqual({
      id: "1",
      name: "Spec",
      idea: "A spec's board.",
      brings: null,
      kinds: ["blue", "red", "amber"],
      moves: 10,
      goals: [{ what: "gather", kind: "blue", count: 5 }],
      board: ["...", "._."],
      dust: null,
      specials: [],
      wind: null,
      hint: null,
      deals: [3, 1],
      stars: [0, 2, 4],
    });
  });

  it.each([
    ["dust", "dust"],
    ["brick", "brick"],
    ["cage", "cage"],
    ["sleepy", "sleepyhead"],
  ])("reads a goal of %s as every %s", (type, what) => {
    expect(levelWith({ goals: [{ type }] }).goals).toEqual([{ what }]);
  });

  it.each([
    ["dash-h", "dasher-across"],
    ["dash-v", "dasher-down"],
    ["puff", "puffer"],
    ["wisp", "wisp"],
  ])("places a %s as a %s of its kind", (sp, what) => {
    const { specials } = levelWith({
      specials: [{ x: 2, y: 1, kind: "red", sp }],
    });

    expect(specials).toEqual([{ at: { x: 2, y: 1 }, what, kind: "red" }]);
  });

  it("places a frizzball, which has no kind", () => {
    const { specials } = levelWith({
      specials: [{ x: 0, y: 0, kind: "red", sp: "frizz" }],
    });

    expect(specials).toEqual([{ at: { x: 0, y: 0 }, what: "frizzball" }]);
  });

  it("reads what a level brings in, its words joined by hyphens", () => {
    expect(levelWith({ brings: "thick brick" }).brings).toBe("thick-brick");
  });

  it("reads the dust's picture", () => {
    expect(levelWith({ dust: ["012", "000"] }).dust).toEqual(["012", "000"]);
  });

  it.each([
    [{ dir: "right" }, { blows: "right", turns: null }],
    [
      { dir: "down", every: 3 },
      { blows: "down", turns: { every: 3, quarters: 1 } },
    ],
    [
      { dir: "up", every: 2, turn: 3 },
      { blows: "up", turns: { every: 2, quarters: 3 } },
    ],
  ])("reads the wind %j", (wind, read) => {
    expect(levelWith({ wind }).wind).toEqual(read);
  });

  it("reads the hint, a swap of neighbors", () => {
    expect(
      levelWith({
        hint: [
          [0, 0],
          [0, 1],
        ],
      }).hint,
    ).toEqual({
      from: { x: 0, y: 0 },
      to: { x: 0, y: 1 },
    });
  });

  it.each<[string, unknown, string]>([
    ["a list", [], "A set of levels: it isn't a record."],
    [
      "a key of no set",
      { ...SET, levelz: [] },
      'A set of levels: it has a "levelz", which no set has.',
    ],
    ["no id", { ...SET, id: "" }, "A set of levels: it has no id."],
    [
      "no levels",
      { ...SET, levels: [] },
      'A set of levels: "spec" has no levels.',
    ],
    [
      "levels of no list",
      { ...SET, levels: {} },
      'A set of levels: "spec" has no levels.',
    ],
    ["no name", { ...SET, name: 3 }, 'A set of levels: "spec" has no name.'],
    [
      "nothing of its levels",
      { ...SET, about: undefined },
      'A set of levels: "spec" says nothing of its levels.',
    ],
    [
      "two levels of one number",
      { ...SET, levels: [FILE, { ...FILE, name: "Spec again" }] },
      'A set of levels: "spec" has two levels numbered 1.',
    ],
  ])("refuses a set with %s", (_, file, problem) => {
    expect(() => levelSetOf(file)).toThrow(problem);
  });

  it("refuses a level of no record", () => {
    expect(() => levelSetOf({ ...SET, levels: [3] })).toThrow(
      'Level 1 of the set "spec": it isn\'t a record.',
    );
  });

  it.each<[string, Readonly<Record<string, unknown>>, string]>([
    ["a key of no level", { size: 3 }, 'it has a "size", which no level has'],
    ["another set", { set: "warm-up" }, "it names another set"],
    ["an id of 0", { id: 0 }, "it has no number for its id"],
    ["an id in words", { id: "1" }, "it has no number for its id"],
    ["an id of a part", { id: 1.5 }, "it has no number for its id"],
    ["no kinds", { kinds: [] }, "it plays with no list of kinds, each once"],
    [
      "a kind twice",
      { kinds: ["blue", "blue"] },
      "it plays with no list of kinds, each once",
    ],
    [
      "a kind of none",
      { kinds: ["blue", "teal"] },
      "it plays with no list of kinds, each once",
    ],
    [
      "kinds of no list",
      { kinds: "blue" },
      "it plays with no list of kinds, each once",
    ],
    [
      "no picture of its board",
      { board: undefined },
      "it has no picture of its board",
    ],
    [
      "a board of other than rows",
      { board: [1, 2] },
      "it has no picture of its board",
    ],
    [
      "a dust of other than rows",
      { dust: "000" },
      "it has no picture of its dust",
    ],
    [
      "a board that lays out no board",
      { board: ["...", ".."] },
      "row 2 of its board is 2 squares long, and its first 3",
    ],
    [
      "dust on a gap",
      { dust: ["000", "010"] },
      "its dust lies on a gap at column 2, row 2",
    ],
    [
      "a fuzzball of a kind it doesn't play with",
      { board: ["..v", "._."] },
      "its board draws a violet fuzzball, a kind it doesn't play with",
    ],
    ["no name", { name: undefined }, "it has no name"],
    ["no idea", { idea: "" }, "it says nothing of its idea"],
    [
      "a new thing of none",
      { brings: "teleport" },
      "it brings in nothing the game knows",
    ],
    [
      "a new thing of no words",
      { brings: 3 },
      "it brings in nothing the game knows",
    ],
    ["no moves", { moves: 0 }, "it has no moves"],
    [
      "no goals",
      { goals: [] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "goals of no list",
      { goals: { type: "dust" } },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a goal of no record",
      { goals: ["dust"] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a gather of a kind it doesn't play with",
      { goals: [{ type: "gather", kind: "pink", count: 5 }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a gather of nothing",
      { goals: [{ type: "gather", kind: "blue", count: 0 }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a gather of a kind of none",
      { goals: [{ type: "gather", kind: 3, count: 5 }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a goal of an element counted",
      { goals: [{ type: "dust", count: 3 }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a goal of an element with a kind",
      { goals: [{ type: "cage", kind: "blue" }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a goal of the burr",
      { goals: [{ type: "burr" }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "a goal with a key of no goal",
      { goals: [{ type: "dust", every: true }] },
      "it has no list of goals, each of a kind it plays with",
    ],
    [
      "specials of no list",
      { specials: {} },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special of no record",
      { specials: ["puff"] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special with a key of no special",
      { specials: [{ x: 0, y: 0, kind: "red", sp: "puff", hits: 2 }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special off the board's right",
      { specials: [{ x: 3, y: 0, kind: "red", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special under the board",
      { specials: [{ x: 0, y: 2, kind: "red", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special left of the board",
      { specials: [{ x: -1, y: 0, kind: "red", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special over the board",
      { specials: [{ x: 0, y: -1, kind: "red", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special on a gap",
      { specials: [{ x: 1, y: 1, kind: "red", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special of a kind of none",
      { specials: [{ x: 0, y: 0, kind: "teal", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special of a kind it doesn't play with",
      { specials: [{ x: 0, y: 0, kind: "pink", sp: "puff" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a special of none",
      { specials: [{ x: 0, y: 0, kind: "red", sp: "bomb" }] },
      "it places a special the game can't, or off its board",
    ],
    [
      "a wind of no record",
      { wind: "down" },
      "it has a wind the game can't blow",
    ],
    [
      "a wind with a key of no wind",
      { wind: { dir: "down", gusts: 2 } },
      "it has a wind the game can't blow",
    ],
    [
      "a wind that blows no way",
      { wind: { dir: "north" } },
      "it has a wind the game can't blow",
    ],
    [
      "a wind that turns, but never",
      { wind: { dir: "down", turn: 1 } },
      "it has a wind the game can't blow",
    ],
    [
      "a wind that turns every 0 moves",
      { wind: { dir: "down", every: 0 } },
      "it has a wind the game can't blow",
    ],
    [
      "a wind that turns by nothing",
      { wind: { dir: "down", every: 2, turn: 0 } },
      "it has a wind the game can't blow",
    ],
    [
      "a wind that turns a whole turn",
      { wind: { dir: "down", every: 2, turn: 4 } },
      "it has a wind the game can't blow",
    ],
    [
      "a hint of one square",
      { hint: [[0, 0]] },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint of three squares",
      {
        hint: [
          [0, 0],
          [1, 0],
          [2, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint of squares apart",
      {
        hint: [
          [0, 0],
          [2, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint off the board",
      {
        hint: [
          [2, 1],
          [2, 2],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint off the board's right",
      {
        hint: [
          [2, 0],
          [3, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint on a gap",
      {
        hint: [
          [1, 1],
          [1, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint of a square in three numbers",
      {
        hint: [
          [0, 0, 0],
          [1, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "a hint of a square in words",
      {
        hint: [
          ["a", 0],
          [1, 0],
        ],
      },
      "it hints at no swap of neighbors on its board",
    ],
    [
      "no deals",
      { deals: undefined },
      "it has no list of deals, each a seed from 0",
    ],
    [
      "a list of no deals",
      { deals: [] },
      "it has no list of deals, each a seed from 0",
    ],
    [
      "a deal of no seed",
      { deals: [1, 2.5] },
      "it has no list of deals, each a seed from 0",
    ],
    [
      "a deal of a seed below 0",
      { deals: [1, -1] },
      "it has no list of deals, each a seed from 0",
    ],
    [
      "two thresholds for its stars",
      { stars: [0, 2] },
      "it asks for no 3 counts of moves to spare",
    ],
    [
      "four thresholds for its stars",
      { stars: [0, 2, 4, 6] },
      "it asks for no 3 counts of moves to spare",
    ],
    [
      "a threshold below nothing",
      { stars: [0, -1, 4] },
      "it asks for no 3 counts of moves to spare",
    ],
  ])("refuses a level with %s", (_, changes, problem) => {
    expect(() => levelSetOf(setWith(changes))).toThrow(
      `Level 1 of the set "spec": ${problem}.`,
    );
  });
});
