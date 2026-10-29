import { brickKind } from "./catalog/bricks";
import { CAPSULE_IDS, capsule } from "./catalog/capsules";
import { CELLS, cellIndex, columnOf, rowOf } from "./grid";
import type { Level, LevelBrick } from "./level";
import {
  LEVELS,
  LEVEL_SETS,
  type LevelData,
  type LevelSetData,
  parseLevel,
} from "./levels";
import { COLUMNS, ROWS } from "./tuning";

/** The set of a spec's levels, whose chance of a capsule is 0.1. */
const SET: LevelSetData = { id: "spec", name: "Spec", drops: 0.1, levels: [] };

/** Returns a level parsed from data changed as given, as the game's third. */
function parsed(changes: Partial<LevelData> = {}, number = 3): Level {
  return parseLevel({
    number,
    set: SET,
    data: { id: "spec", name: "Spec", bricks: ["o2#?........."], ...changes },
  });
}

/** Returns whether a cell holds a brick that never breaks, which no ball passes. */
function isWall(brick: LevelBrick | null | undefined): boolean {
  return !!brick && brickKind(brick.kind).hits === "never";
}

/** Returns each brick of a level's first row, as its kind and hits, up to the first gap. */
function firstRow(level: Level): [string, number][] {
  const bricks: [string, number][] = [];
  for (const brick of level.cells.slice(0, COLUMNS)) {
    if (!brick) break;
    bricks.push([brick.kind, brick.hits]);
  }
  return bricks;
}

/** Returns the tints of a level's first column, from the top, as far as it has bricks. */
function firstColumn(level: Level): number[] {
  const tints: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    const brick = level.cells[cellIndex(0, row)];
    if (!brick) break;
    tints.push(brick.tint);
  }
  return tints;
}

/**
 * Returns the cells of a level's needed bricks that no ball can reach: a
 * flood from the open field below the grid, through every cell but those
 * of bricks that never break, and through the gap above it, finds none of
 * them.
 */
function shutIn(level: Level): number[] {
  const key = (column: number, row: number): string =>
    `${String(column)},${String(row)}`;
  const isOpen = (column: number, row: number): boolean =>
    row < 0 || row >= ROWS || !isWall(level.cells[cellIndex(column, row)]);
  const reached = new Set<string>();
  const waiting: [number, number][] = [];
  for (let column = 0; column < COLUMNS; column++) waiting.push([column, ROWS]);
  for (let next = waiting.pop(); next; next = waiting.pop()) {
    const [column, row] = next;
    if (reached.has(key(column, row))) continue;
    reached.add(key(column, row));
    for (const [across, down] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const [c, r] = [column + across, row + down];
      if (c >= 0 && c < COLUMNS && r >= -1 && r <= ROWS && isOpen(c, r)) {
        waiting.push([c, r]);
      }
    }
  }
  return level.cells.flatMap((brick, cell) =>
    brick &&
    brickKind(brick.kind).needed &&
    !reached.has(key(columnOf(cell), rowOf(cell)))
      ? [cell]
      : [],
  );
}

describe("parseLevel", () => {
  it("lays each brick out as the shared legend says", () => {
    const level = parsed({ bricks: ["o234#*?~+...."] });

    expect(firstRow(level)).toEqual([
      ["plain", 1],
      ["tough", 2],
      ["tough", 3],
      ["tough", 4],
      ["steel", 0],
      ["blast", 1],
      ["gift", 1],
      ["ghost", 2],
      ["regrow", 1],
    ]);
  });

  it("leaves a cell empty for a dot, and below the rows it has", () => {
    const level = parsed({ bricks: [".o..........."] });

    expect(level.cells.filter((cell) => cell !== null)).toHaveLength(1);
  });

  it("has a cell for every one of the grid's", () => {
    expect(parsed().cells).toHaveLength(CELLS);
  });

  it("tints each row the next of the eight, as stripes", () => {
    const level = parsed({ bricks: Array<string>(10).fill("o............") });

    expect(firstColumn(level)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 0, 1]);
  });

  it("tints each brick as its tints say, or its row's for a dot", () => {
    const level = parsed({
      bricks: ["o............", "o............"],
      tints: ["8............", "............."],
    });

    expect(firstColumn(level)).toEqual([7, 1]);
  });

  it("lays out the characters of its own legend", () => {
    const level = parsed({
      bricks: ["LT..........."],
      legend: {
        L: { kind: "gift", capsule: "life" },
        T: { kind: "tough", hits: 4 },
      },
    });

    expect(level.cells.slice(0, 2)).toEqual([
      { kind: "gift", hits: 1, tint: 0, capsule: "life" },
      { kind: "tough", hits: 4, tint: 0, capsule: null },
    ]);
  });

  it("lets every capsule whose level has come fall", () => {
    const level = parsed({}, 5);

    expect(level.capsules).toEqual(
      CAPSULE_IDS.filter((id) => capsule(id).from <= 5),
    );
  });

  it("lets the capsules it names fall instead", () => {
    expect(parsed({ capsules: ["fire", "net"] }).capsules).toEqual([
      "fire",
      "net",
    ]);
  });

  it("takes its set's chance of a capsule, or its own", () => {
    expect([parsed().drops, parsed({ drops: 0.3 }).drops]).toEqual([0.1, 0.3]);
  });

  it("plays at the speed's own pace, or its own", () => {
    expect([parsed().pace, parsed({ pace: 1.2 }).pace]).toEqual([1, 1.2]);
  });

  it.each<[string, Partial<LevelData>, string]>([
    [
      "a row of the wrong length",
      { bricks: ["oooo"] },
      "row 1 of its bricks is 4 long, not 13",
    ],
    [
      "too many rows",
      { bricks: Array<string>(17).fill(".............") },
      "its bricks have 17 rows, more than 16",
    ],
    [
      "a character no legend has",
      { bricks: ["x............"] },
      `"x", in row 1, stands for no brick`,
    ],
    [
      "a legend that redefines a shared character",
      { legend: { o: { kind: "steel" } } },
      `its legend may not define "o"`,
    ],
    [
      "a legend that redefines the empty cell",
      { legend: { ".": { kind: "steel" } } },
      `its legend may not define "."`,
    ],
    [
      "a legend's kind that doesn't exist",
      { legend: { R: { kind: "rubber" } } },
      `"R" is a "rubber", which is no brick`,
    ],
    [
      "a legend's hits its kind can't take",
      { legend: { T: { kind: "tough", hits: 5 } } },
      `"T" has 5 for its hits, which a tough brick can't take`,
    ],
    [
      "a legend's hits on a brick that never breaks",
      { legend: { S: { kind: "steel", hits: 2 } } },
      `"S" has 2 for its hits, which a steel brick can't take`,
    ],
    [
      "a legend's capsule on a brick that gives none",
      { legend: { P: { kind: "plain", capsule: "life" } } },
      `"P" gives "life", but a plain brick gives nothing`,
    ],
    [
      "a legend's capsule that doesn't exist",
      { legend: { G: { kind: "gift", capsule: "rocket" } } },
      `"G" gives "rocket", which is no capsule`,
    ],
    [
      "a capsule in its pool that doesn't exist",
      { capsules: ["rocket"] },
      `its capsules name "rocket", which is no capsule`,
    ],
    [
      "tints of another shape",
      { tints: [] },
      "its tints have 0 rows, its bricks 1",
    ],
    [
      "a row of tints of the wrong length",
      { tints: ["1"] },
      "row 1 of its tints is 1 long, not 13",
    ],
    [
      "a tint that isn't one",
      { tints: ["9............"] },
      `"9", in row 1 of its tints, is no tint`,
    ],
    ["a pace too slow", { pace: 0.7 }, "its pace, 0.7, is outside 0.8 to 1.4"],
    ["a pace too fast", { pace: 1.5 }, "its pace, 1.5, is outside 0.8 to 1.4"],
    [
      "a chance that isn't one",
      { drops: 1.5 },
      "its chance of a capsule, 1.5, is no chance",
    ],
    [
      "a chance below none",
      { drops: -0.1 },
      "its chance of a capsule, -0.1, is no chance",
    ],
    [
      "a legend's character longer than one",
      { legend: { LL: { kind: "plain" } } },
      `its legend may not define "LL"`,
    ],
    [
      "a legend's hits that aren't whole",
      { legend: { T: { kind: "tough", hits: 2.5 } } },
      `"T" has 2.5 for its hits, which a tough brick can't take`,
    ],
    [
      "a legend's hits fewer than its kind takes",
      { legend: { T: { kind: "tough", hits: 1 } } },
      `"T" has 1 for its hits, which a tough brick can't take`,
    ],
    [
      "a tint below the first",
      { tints: ["0............"] },
      `"0", in row 1 of its tints, is no tint`,
    ],
    [
      "a tint where there is no brick",
      { tints: ["1...3........"] },
      `"3", in row 1 of its tints, tints no brick`,
    ],
  ])("names %s", (_, changes, problem) => {
    expect(() => parsed(changes)).toThrow(`Level "spec": ${problem}.`);
  });

  it("names a key no level has, as a typo would leave", () => {
    const typo = { pase: 1.3 };

    const parse = (): Level => parsed({ name: "Spec", ...typo });

    expect(parse).toThrow(`Level "spec": it has a "pase", which no level has.`);
  });

  it("names a key no brick of its legend has", () => {
    const typo = { capsul: "life" };

    const parse = (): Level =>
      parsed({ legend: { L: { kind: "gift", ...typo } } });

    expect(parse).toThrow(
      `Level "spec": "L" has a "capsul", which no brick has.`,
    );
  });

  it.each<[string, Partial<LevelData>]>([
    ["sixteen rows", { bricks: Array<string>(16).fill("o............") }],
    ["the slowest pace", { pace: 0.8 }],
    ["the fastest pace", { pace: 1.4 }],
    ["no chance of a capsule", { drops: 0 }],
    ["every chance of one", { drops: 1 }],
  ])("parses a level of %s", (_, changes) => {
    expect(() => parsed(changes)).not.toThrow();
  });
});

describe("the reach check", () => {
  it("finds a brick the level needs shut in by steel", () => {
    const level = parsed({
      bricks: ["###..........", "#o#..o.......", "###.........."],
    });

    expect(shutIn(level)).toEqual([cellIndex(1, 1)]);
  });

  it("reaches a brick through the gap above the grid", () => {
    const level = parsed({ bricks: ["#o#..........", "###.........."] });

    expect(shutIn(level)).toEqual([]);
  });

  it("finds a brick shut in by steel that leaves its corners open", () => {
    const level = parsed({
      bricks: [".#...........", "#o#..........", ".#..........."],
    });

    expect(shutIn(level)).toEqual([cellIndex(1, 1)]);
  });
});

describe("the levels", () => {
  const named = LEVELS.map((entry) => [entry.data.name, entry] as const);

  it.each(named)("parse %s", (_, entry) => {
    expect(() => parseLevel(entry)).not.toThrow();
  });

  it("each have an id of their own, in kebab-case", () => {
    const ids = LEVELS.map((entry) => entry.data.id);

    expect({
      unique: new Set(ids).size === ids.length,
      kebab: ids.filter((id) => !/^[a-z]+(-[a-z]+)*$/.test(id)),
    }).toEqual({ unique: true, kebab: [] });
  });

  it("each have a name of their own", () => {
    const names = LEVELS.map((entry) => entry.data.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it.each(named)("give %s a brick it needs", (_, entry) => {
    const level = parseLevel(entry);

    expect(
      level.cells.some((brick) => brick && brickKind(brick.kind).needed),
    ).toBe(true);
  });

  it.each(named)("let a ball reach every brick %s needs", (_, entry) => {
    expect(shutIn(parseLevel(entry))).toEqual([]);
  });

  it.each(LEVEL_SETS.map((set) => [set.name, set] as const))(
    "never slow the pace within %s",
    (_, set) => {
      const paces = set.levels.map((level) => level.pace ?? 1);

      expect(paces).toEqual([...paces].sort((a, b) => a - b));
    },
  );

  it("number every level in the order played, from 1", () => {
    expect(LEVELS.map((entry) => entry.number)).toEqual(
      LEVELS.map((_, i) => i + 1),
    );
  });
});
