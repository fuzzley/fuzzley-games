import { COLUMNS } from "@fz/brick-wall/rules/field";
import { type Brick, kindOf } from "../catalog/kinds";
import { NO_BRICK } from "./legend";
import { WALL_ROWS, levelProblem } from "./level_rules";
import {
  LEVELS,
  LEVEL_SETS,
  type Level,
  type LevelData,
  type LevelSetData,
  levelEntryOf,
  levelsOf,
  parseLevel,
} from "./levels";

const AIR = NO_BRICK.repeat(COLUMNS);
const PLAIN = "ooooooooo";

/** How many levels a set holds, as the design's "The levels" has it. */
const SET_LEVELS = 9;

/** Every set by its name. */
const NAMED_SETS = LEVEL_SETS.map((set) => [set.name, set] as const);

/** Every level by its name. */
const NAMED_LEVELS = LEVELS.map((entry) => [entry.data.name, entry] as const);

/** Returns the values a list holds more than once, each once, in the order they first come again. */
function duplicatesOf(values: readonly string[]): string[] {
  return [
    ...new Set(values.filter((value, index) => values.indexOf(value) < index)),
  ];
}

/**
 * Returns a picture of a wall: rows on top, rows at the bottom, and plain
 * rows between them, as many as make the fewest rows a wall has.
 */
function picture(
  top: readonly string[],
  bottom: readonly string[] = [],
): string[] {
  const between = Math.max(0, WALL_ROWS.least - top.length - bottom.length);
  return [...top, ...Array<string>(between).fill(PLAIN), ...bottom];
}

/** Returns a level's data with a picture of its wall, and its other data as given. */
function dataWith(
  bricks: readonly string[],
  changes: Partial<LevelData> = {},
): LevelData {
  return {
    id: "spec",
    name: "Spec",
    around: "A spec's wall",
    bricks,
    ...changes,
  };
}

/** Returns the data of the level with an id, throwing for one no set has. */
function dataOf(id: string): LevelData {
  const entry = LEVELS.find(({ data }) => data.id === id);
  if (entry === undefined) {
    throw new RangeError(`No level is "${id}".`);
  }
  return entry.data;
}

/** Returns a level's bricks, leaving out its empty cells. */
function bricksOf(level: Level): Brick[] {
  return level.bricks.filter((brick) => brick !== null);
}

/** Returns the wall of the level with an id in the figures of the design's table of the drafts: its rows, the bricks it needs, and their hits. */
function wallFiguresOf(id: string): [number, number, number] {
  const level = parseLevel(dataOf(id));
  const bricks = bricksOf(level);
  return [
    level.rows,
    bricks.filter(({ kind }) => kindOf(kind).needed).length,
    bricks.reduce((sum, brick) => sum + brick.hits, 0),
  ];
}

describe("parseLevel", () => {
  it("lays its wall out as the legend has it, from its lowest row up", () => {
    const level = parseLevel(dataWith(picture([], ["2#o.....@", "@........"])));

    expect([
      level.rows,
      ...[0, 1, 9, 10, 17].map((cell) => level.bricks[cell]),
    ]).toEqual([
      13,
      { kind: "portal", hits: 0, full: 0, plates: 0, tint: 0, twin: 17 },
      null,
      { kind: "tough", hits: 2, full: 2, plates: 0, tint: 1, twin: null },
      { kind: "steel", hits: 0, full: 0, plates: 0, tint: 0, twin: null },
      { kind: "portal", hits: 0, full: 0, plates: 0, tint: 0, twin: 0 },
    ]);
  });

  it("keeps of its data only its wall", () => {
    const level = parseLevel(dataWith(picture([])));

    expect(level).toStrictEqual({ bricks: level.bricks, rows: 13 });
  });

  it("names a key no level has, as Brick Fuzz Pop's boon", () => {
    const data = { ...dataWith(picture([])), boon: "hot" };

    const parse = (): Level => parseLevel(data);

    expect(parse).toThrow(`Level "spec": it has a "boon", which no level has.`);
  });

  it.each<[string, readonly string[], string]>([
    [
      "too few rows",
      Array<string>(12).fill(PLAIN),
      "its wall has 12 rows, not 13 to 33",
    ],
    [
      "two rows of air together",
      picture([PLAIN, AIR, AIR, PLAIN]),
      "rows 2 to 3 of its picture are air, more than 1 together",
    ],
    [
      "a portal with no twin",
      picture(["oooo@oooo"]),
      `it has 1 of the twin "@", where a pair has 2`,
    ],
  ])("names %s in its picture", (_, bricks, problem) => {
    expect(() => parseLevel(dataWith(bricks))).toThrow(
      `Level "spec": ${problem}.`,
    );
  });

  it("leaves the data it is handed as it was", () => {
    const data = dataWith(picture(["oo@oo@ooo"]));
    const before = structuredClone(data);

    parseLevel(data);

    expect(data).toEqual(before);
  });
});

describe("levelsOf", () => {
  it("numbers the levels of every set from 1, in the order played", () => {
    const set = (id: string, ...ids: string[]): LevelSetData => ({
      id,
      name: id,
      levels: ids.map((level) => dataWith([], { id: level })),
    });

    const entries = levelsOf([set("a", "one", "two"), set("b", "three")]);

    expect(
      entries.map(({ number, set: { id }, data }) => [number, id, data.id]),
    ).toEqual([
      [1, "a", "one"],
      [2, "a", "two"],
      [3, "b", "three"],
    ]);
  });
});

describe("levelEntryOf", () => {
  it.each([1, LEVELS.length])("finds level %s by its number", (number) => {
    expect(levelEntryOf(LEVELS, number)).toBe(LEVELS[number - 1]);
  });

  it.each([0, LEVELS.length + 1, 1.5])(
    "throws for level %s, which there isn't",
    (number) => {
      expect(() => levelEntryOf(LEVELS, number)).toThrow(
        `There is no level ${String(number)}: the levels run from 1 to ${String(LEVELS.length)}.`,
      );
    },
  );
});

describe("the sets", () => {
  it("are played Warm-up first, then Angles", () => {
    expect(LEVEL_SETS.map(({ id }) => id)).toEqual(["warm-up", "angles"]);
  });

  it("number Warm-up's levels 1 to 9 and Angles' 10 to 18, as the design's table of the drafts does", () => {
    expect(LEVELS.map(({ number, data }) => [number, data.name])).toEqual([
      [1, "First bounce"],
      [2, "Side door"],
      [3, "Columns"],
      [4, "Pips"],
      [5, "Alleys"],
      [6, "Stairs"],
      [7, "Girders"],
      [8, "Attic"],
      [9, "Gatehouse"],
      [10, "Launcher"],
      [11, "Banked turn"],
      [12, "Trapdoor"],
      [13, "Springboard"],
      [14, "Loft"],
      [15, "Slalom"],
      [16, "Skylight"],
      [17, "Bounce house"],
      [18, "Clockwork"],
    ]);
  });

  // The design's table of the drafts: each wall's rows, the bricks it needs
  // and their hits.
  it.each([
    ["first-bounce", 17, 64, 64],
    ["side-door", 17, 72, 72],
    ["columns", 15, 60, 60],
    ["pips", 15, 54, 84],
    ["alleys", 20, 87, 87],
    ["stairs", 16, 64, 64],
    ["girders", 15, 30, 60],
    ["attic", 17, 78, 117],
    ["gatehouse", 21, 64, 96],
    ["launcher", 19, 92, 92],
    ["banked-turn", 15, 36, 52],
    ["trapdoor", 15, 54, 90],
    ["loft", 17, 66, 132],
    ["slalom", 23, 96, 138],
    ["skylight", 15, 54, 132],
    ["bounce-house", 17, 68, 68],
    ["clockwork", 19, 73, 100],
  ])(
    "build %s as its draft: %s rows, %s bricks needed, %s hits",
    (id, rows, needed, hits) => {
      expect(wallFiguresOf(id)).toEqual([rows, needed, hits]);
    },
  );

  // Its draft's hits are 54: six of its bricks were made tough, so aims
  // drawn blind clear it less.
  it("build springboard as redrawn: 15 rows, 54 bricks needed, 60 hits", () => {
    expect(wallFiguresOf("springboard")).toEqual([15, 54, 60]);
  });
});

describe("every level of every set", () => {
  it.each(NAMED_SETS)(`has ${String(SET_LEVELS)} in %s`, (_, { levels }) => {
    expect(levels).toHaveLength(SET_LEVELS);
  });

  it("gives every set an id of its own", () => {
    expect(duplicatesOf(LEVEL_SETS.map(({ id }) => id))).toEqual([]);
  });

  it("gives every set a name of its own", () => {
    expect(duplicatesOf(LEVEL_SETS.map(({ name }) => name))).toEqual([]);
  });

  it("gives every level an id of its own", () => {
    expect(duplicatesOf(LEVELS.map(({ data }) => data.id))).toEqual([]);
  });

  it("gives every level a name of its own", () => {
    expect(duplicatesOf(LEVELS.map(({ data }) => data.name))).toEqual([]);
  });

  describe.each(NAMED_LEVELS)("%s", (_, { number, data }) => {
    it("parses", () => {
      expect(() => parseLevel(data)).not.toThrow();
    });

    it("keeps the rules a level keeps, at its number", () => {
      expect(levelProblem(data.bricks, number)).toBeNull();
    });
  });
});
