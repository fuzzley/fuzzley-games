import { COLUMNS } from "@fz/brick-wall/rules/field";
import { KIND_IDS, type KindId, kindOf } from "../catalog/kinds";
import { LOCK_BOLTS, NO_BRICK } from "./legend";
import {
  LOWEST_HITS,
  MOST_AIR,
  TWIN_ROWS,
  WALL_ROWS,
  levelProblem,
} from "./level_rules";

const AIR = NO_BRICK.repeat(COLUMNS);
const PLAIN = "ooooooooo";

/** A level after every kind's first, which brings none in. */
const LATE = Math.max(...KIND_IDS.map((id) => kindOf(id).firstLevel)) + 1;

/** The kinds a level after the first brings in. */
const BROUGHT_IN = KIND_IDS.filter((id) => kindOf(id).firstLevel > 1);

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

/** Returns rows of plain bricks of a number. */
function plain(rows: number): string[] {
  return Array<string>(rows).fill(PLAIN);
}

/** Returns a picture with rows of air of a number together between two plain rows. */
function airTogether(rows: number): string[] {
  return picture([PLAIN, ...Array<string>(rows).fill(AIR), PLAIN]);
}

/** Returns a picture with a pair of portals rows of a number apart. */
function twinsApart(rows: number): string[] {
  return picture(["@oooooooo", ...plain(rows - 1), "@oooooooo"]);
}

/**
 * Returns a picture whose top row holds two bricks of a kind, written in
 * its first character, so a portal comes as a pair.
 */
function holding(kind: KindId): string[] {
  const [letter = ""] = kindOf(kind).letters;
  return picture([`${letter}${letter}`.padEnd(COLUMNS, "o")]);
}

describe("levelProblem", () => {
  it("finds none in a level that keeps every rule", () => {
    const level = picture(
      ["oo@#o@ooo", "2.x.3.y.z", AIR, "oo=oo=ooo", "L.v.G.S.7"],
      ["4o2oMoNoo"],
    );

    expect(levelProblem(level, LATE)).toBeNull();
  });

  it.each<[string, readonly string[]]>([
    [`the fewest rows, ${String(WALL_ROWS.least)}`, plain(WALL_ROWS.least)],
    [`the most rows, ${String(WALL_ROWS.most)}`, plain(WALL_ROWS.most)],
    [`${String(MOST_AIR)} row of air between courses`, airTogether(MOST_AIR)],
    ["rows of air apart", picture([PLAIN, AIR, PLAIN, AIR, PLAIN])],
    [`a portal ${String(TWIN_ROWS)} rows from its twin`, twinsApart(TWIN_ROWS)],
    ["two pairs of portals", picture(["@o&oooooo", "@o&oooooo"])],
  ])("finds none in a picture with %s", (_, level) => {
    expect(levelProblem(level, LATE)).toBeNull();
  });

  it.each<[string, readonly string[], string]>([
    [
      "too few rows",
      plain(WALL_ROWS.least - 1),
      "its wall has 12 rows, not 13 to 33",
    ],
    [
      "too many rows",
      plain(WALL_ROWS.most + 1),
      "its wall has 34 rows, not 13 to 33",
    ],
    [
      "a row of air at its top",
      picture([AIR]),
      "its wall's highest row is air",
    ],
    [
      "a row of air at its foot",
      picture([], [AIR]),
      "its wall's lowest row is air",
    ],
    [
      `${String(MOST_AIR + 1)} rows of air together`,
      airTogether(MOST_AIR + 1),
      "rows 2 to 3 of its picture are air, more than 1 together",
    ],
    [
      "a row eight wide",
      picture(["oooooooo"]),
      "row 1 of its picture is 8 long, not 9",
    ],
    [
      "Brick Fuzz Pop's row zapper, which it lacks",
      picture([], ["oooo-oooo"]),
      `"-", in row 13 of its picture, stands for no brick`,
    ],
    [
      `a portal ${String(TWIN_ROWS + 1)} rows from its twin`,
      twinsApart(TWIN_ROWS + 1),
      `its twins "@" stand 4 rows apart, more than 3`,
    ],
    [
      "a portal with no twin",
      picture(["oooo@oooo"]),
      `it has 1 of the twin "@", where a pair has 2`,
    ],
    [
      "a third pair of portals, which only a mark used again can write",
      picture(["@o&oooooo", "@o&oooooo", "@oooooooo", "@oooooooo"]),
      `it has 4 of the twin "@", where a pair has 2`,
    ],
    [
      "a second pair of portals with no first",
      picture(["&oooooooo", "&oooooooo"]),
      `its twins "&" are a second pair, with no first, "@"`,
    ],
  ])("names %s", (_, level, problem) => {
    expect(levelProblem(level, LATE)).toBe(problem);
  });

  it("finds none in a level of plain bricks that brings no kind in", () => {
    expect(levelProblem(picture([]), 2)).toBeNull();
  });

  it.each(BROUGHT_IN)(
    "finds none in the level that brings in the %s, holding it",
    (kind) => {
      expect(levelProblem(holding(kind), kindOf(kind).firstLevel)).toBeNull();
    },
  );

  it.each(BROUGHT_IN)(
    "names the %s in a level before the one that brings it in",
    (kind) => {
      const { name, firstLevel } = kindOf(kind);

      const problem = levelProblem(holding(kind), firstLevel - 1);

      expect(problem).toBe(
        `row 1 of its picture holds a ${name.toLowerCase()}, which no level before ${String(firstLevel)} holds`,
      );
    },
  );

  it.each(BROUGHT_IN)(
    "names the level that brings in the %s and holds none",
    (kind) => {
      const { name, firstLevel } = kindOf(kind);

      const problem = levelProblem(picture([]), firstLevel);

      expect(problem).toBe(
        `it brings in the ${name.toLowerCase()} and holds none`,
      );
    },
  );

  it(`finds none in a lowest row with a brick of ${String(LOWEST_HITS)} hits`, () => {
    expect(levelProblem(picture([], ["oo4oooooo"]), LATE)).toBeNull();
  });

  it("finds none in a lowest row of hatches, which never break", () => {
    expect(levelProblem(picture([], ["========="]), LATE)).toBeNull();
  });

  it("names a brick of more hits in its wall's lowest row", () => {
    expect(levelProblem(picture([], ["oo5oooooo"]), LATE)).toBe(
      "its wall's lowest row holds a brick of 5 hits, more than 4",
    );
  });

  it.each(LOCK_BOLTS)("names the lock %s in its wall's lowest row", (lock) => {
    expect(levelProblem(picture([], [`oo${lock}oooooo`]), LATE)).toBe(
      "its wall's lowest row holds a lock",
    );
  });

  it("finds none in a lock over its wall's lowest row", () => {
    expect(levelProblem(picture([], ["ooxoooooo", PLAIN]), LATE)).toBeNull();
  });

  it.each([
    ["#", "steel brick"],
    ["L", "ramp"],
    ["J", "ramp"],
    ["F", "ramp"],
    ["7", "ramp"],
  ])("names the steel %s in a row with a hatch, a %s", (steel, name) => {
    expect(levelProblem(picture([PLAIN, `${steel}oo=ooooo`]), LATE)).toBe(
      `row 2 of its picture holds both a hatch and a ${name}`,
    );
  });

  it("finds none in steel and a hatch in rows of their own", () => {
    expect(levelProblem(picture(["#oooooooL", "ooo=ooooo"]), LATE)).toBeNull();
  });

  it("finds none in a hatch's row of portals and of every kind that breaks", () => {
    expect(levelProblem(picture(["@=2GvSMx@"]), LATE)).toBeNull();
  });

  it("leaves the picture it is handed as it was", () => {
    const level = picture(["oo@#o@ooo", "oo=ooo#oo"]);
    const before = [...level];

    levelProblem(level, LATE);

    expect(level).toEqual(before);
  });
});
